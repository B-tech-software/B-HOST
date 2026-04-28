from __future__ import annotations

"""Notification helpers for the B-raise backend."""

import io
import logging
import os
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional, Tuple

import qrcode
import requests

# Optional SendGrid fallback using HTTP API when SMTP is unavailable or blocked.
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
SENDGRID_FROM = os.getenv("SENDGRID_FROM") or os.getenv("SMTP_USER")

logger = logging.getLogger(__name__)

# The FCM server key is a secret that must NOT live in the frontend.
# It is loaded from an environment variable so it never appears in
# the React bundle or the Git repository.
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY")


def build_qr_png_bytes(data: str) -> Optional[bytes]:
    """Build a high-contrast PNG QR image suitable for scanning."""
    payload = str(data or "").strip()
    if not payload:
        return None

    try:
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        out = io.BytesIO()
        img.save(out, format="PNG")
        return out.getvalue()
    except Exception as exc:
        logger.error("Failed to generate QR PNG for email: %s", exc)
        return None


def send_email_notification(
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    smtp_server: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None,
    inline_images: Optional[Dict[str, Tuple[str, bytes]]] = None,
) -> bool:
    """Send an email notification using SMTP (e.g., Gmail).

    Args:
        to_email: Recipient email address.
        subject: Email subject.
        body: Email body (plain text or HTML).
        from_email: Sender email address (optional, defaults to smtp_user).
        smtp_server: SMTP server address (optional, defaults to Gmail).
        smtp_port: SMTP port (optional, defaults to 587).
        smtp_user: SMTP username (optional, defaults to from_email).
        smtp_password: SMTP password or app password.
        inline_images: Optional mapping of content-id -> (subtype, image-bytes).
    Returns:
        True if sent successfully, False otherwise.
    """
    smtp_server = smtp_server or os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = smtp_port or int(os.getenv("SMTP_PORT", 587))
    smtp_user = smtp_user or os.getenv("SMTP_USER")
    smtp_password = smtp_password or os.getenv("SMTP_PASSWORD")
    from_email = from_email or smtp_user

    if not (smtp_user and smtp_password and from_email):
        logger.error("SMTP credentials not set. Cannot send email.")
        return False


    def send_email_via_sendgrid(
        to_email: str, subject: str, html_body: str, from_email: Optional[str] = None
    ) -> bool:
        """Send a simple HTML email via SendGrid Web API.

        This is a best-effort fallback when SMTP is blocked by network/DNS.
        Requires `SENDGRID_API_KEY` to be set in environment. Optionally set
        `SENDGRID_FROM` or the `from_email` argument.
        """
        if not SENDGRID_API_KEY:
            logger.debug("No SendGrid API key configured; cannot use SendGrid.")
            return False

        sender = from_email or SENDGRID_FROM
        if not sender:
            logger.error("No sender address available for SendGrid fallback.")
            return False

        payload = {
            "personalizations": [{"to": [{"email": to_email}], "subject": subject}],
            "from": {"email": sender},
            "content": [{"type": "text/html", "value": html_body}],
        }

        headers = {"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"}

        try:
            resp = requests.post("https://api.sendgrid.com/v3/mail/send", json=payload, headers=headers, timeout=6)
            if resp.status_code in (200, 202):
                logger.info("SendGrid email queued to %s", to_email)
                return True
            else:
                logger.error("SendGrid error %s: %s", resp.status_code, resp.text)
                return False
        except Exception as exc:
            logger.error("SendGrid request failed: %s", exc)
            return False

    msg = MIMEMultipart("related")
    msg["From"] = from_email
    msg["To"] = to_email
    msg["Subject"] = subject

    alt_part = MIMEMultipart("alternative")
    alt_part.attach(MIMEText(body, "html", "utf-8"))
    msg.attach(alt_part)

    if inline_images:
        for cid, (subtype, image_bytes) in inline_images.items():
            if not image_bytes:
                continue
            image_part = MIMEImage(image_bytes, _subtype=subtype)
            image_part.add_header("Content-ID", f"<{cid}>")
            image_part.add_header("Content-Disposition", "inline", filename=f"{cid}.{subtype}")
            msg.attach(image_part)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info("Email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Error sending email to %s: %s", to_email, exc)

        # If SMTP fails (DNS blocked, firewall), optionally try SendGrid HTTP API
        if SENDGRID_API_KEY:
            try:
                return send_email_via_sendgrid(
                    to_email=to_email,
                    subject=subject,
                    html_body=body,
                    from_email=from_email,
                )
            except Exception as e2:
                logger.error("SendGrid fallback failed: %s", e2)

        return False


def send_fcm_notification(
    token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> None:
    """Send a push notification via Firebase Cloud Messaging.

    This helper is intentionally best-effort: if the configuration is
    missing or anything goes wrong, it logs an error but does not crash
    the web request handler.

    Args:
        token: Device FCM token to send the notification to.
        title: Notification title as seen on the device.
        body: Notification message text.
        data: Optional extra key/value payload for the client app.
    """

    # If we do not have a token or server key, we silently skip sending
    # the notification. This keeps ticket purchase flows working even
    # in development environments without FCM configured.
    if not token or not FCM_SERVER_KEY:
        return

    payload: Dict[str, Any] = {
        "to": token,
        "notification": {"title": title, "body": body},
    }

    if data:
        payload["data"] = data

    try:
        resp = requests.post(
            "https://fcm.googleapis.com/fcm/send",
            headers={
                "Authorization": f"key={FCM_SERVER_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=5,
        )

        if resp.status_code >= 400:
            logger.error("FCM error %s: %s", resp.status_code, resp.text)

    except Exception as exc:  # pragma: no cover - network failure path
        logger.error("Error sending FCM notification: %s", exc)


from __future__ import annotations

"""Ticket-related HTTP endpoints for the B-raise backend.

This module defines the API routes that the React frontend calls when
users buy tickets, verify tickets (for a scanner app), or fetch all
tickets associated with a given email address.

Having these routes in a dedicated file keeps app.py simple and makes
it easier to understand the flow end-to-end:

- frontend calls /api/tickets/purchase with order details
- backend validates and stores the ticket in Firestore
- backend optionally triggers a push notification via FCM
- later, /api/tickets/verify can check QR codes against the database
- /api/tickets/user can return tickets for a particular user
"""

# ...existing code...


from flask import Blueprint, jsonify, request

# All ticket-related endpoints live under the "/api/tickets" prefix.
# Using a blueprint keeps them logically grouped and easy to register
# in app.py.
tickets_bp = Blueprint("tickets", __name__, url_prefix="/api/tickets")

# ...existing code...

@tickets_bp.route("/search", methods=["GET"])
def search_tickets() -> Any:
    """Search tickets/events by a query string in event name, artist, venue, or user email."""
    query: Optional[str] = request.args.get("q", "").strip().lower()
    results: List[Dict[str, Any]] = []

    if not query:
        return jsonify({"results": [], "q": query}), 200

    if database.db is not None:
        try:
            # Fetch all tickets (for demo; for large datasets, use Firestore queries or indexing)
            docs = database.db.collection("tickets").get()  # type: ignore[union-attr]
            for doc in docs:
                ticket = doc.to_dict()
                # Search in event name, artist, venue, or user email
                event_name = str(ticket.get("order", {}).get("eventName", "")).lower()
                artist = str(ticket.get("order", {}).get("artist", "")).lower()
                venue = str(ticket.get("order", {}).get("venue", "")).lower()
                user_email = str(ticket.get("userEmail", "")).lower()
                if (
                    query in event_name
                    or query in artist
                    or query in venue
                    or query in user_email
                ):
                    results.append(ticket)
        except Exception as exc:
            from flask import current_app
            current_app.logger.error("Failed to search tickets: %s", exc)

    return jsonify({"results": results, "q": query}), 200

from datetime import datetime
from html import escape
from typing import Any, Dict, List, Optional
from urllib.parse import parse_qs, urlparse

from flask import Blueprint, jsonify, request

# Import from the top-level modules so this works when the backend is
# run as "python app.py" from inside the backend-flask folder.
#
# IMPORTANT: we import the whole "database" module instead of pulling
# the "db" variable directly. That way, when init_firestore() later
# updates database.db, our code sees the new value instead of a stale
# copy captured at import time.
import database
from notifications import build_qr_png_bytes, send_email_notification, send_fcm_notification
from routes.organizers import validate_scanner_session

# All ticket-related endpoints live under the "/api/tickets" prefix.
# Using a blueprint keeps them logically grouped and easy to register
# in app.py.
tickets_bp = Blueprint("tickets", __name__, url_prefix="/api/tickets")


def _normalize_qr_data(value: Any) -> str:
    """Normalize scanner output so small formatting differences still verify."""
    raw = str(value or "").strip()
    if not raw:
        return ""

    lowered = raw.lower()
    if lowered.startswith("qr:"):
        raw = raw[3:].strip()
    elif lowered.startswith("qrdata:"):
        raw = raw[7:].strip()

    parsed = urlparse(raw)
    if parsed.scheme and (parsed.netloc or parsed.path):
        query = parse_qs(parsed.query)
        for key in ("qrData", "qr", "token"):
            values = query.get(key)
            if values:
                candidate = str(values[0] or "").strip()
                if candidate:
                    return candidate

    return raw


def _qr_lookup_candidates(value: Any) -> List[str]:
    raw = str(value or "")
    stripped = raw.strip()
    normalized = _normalize_qr_data(stripped)

    candidates: List[str] = []
    for candidate in (stripped, normalized):
        if candidate and candidate not in candidates:
            candidates.append(candidate)
    return candidates


def _send_ticket_email_for_record(ticket_record: Dict[str, Any]) -> bool:
    """Send ticket email with inline QR for an existing ticket record."""
    order: Dict[str, Any] = ticket_record.get("order") or {}
    user_email = str(ticket_record.get("userEmail") or "").strip()
    qr_data = str(ticket_record.get("qrData") or "").strip()

    if not user_email:
        return False

    event_name = escape(str(order.get("eventName", "")))
    event_date = escape(str(order.get("eventDate", "")))
    venue = escape(str(order.get("venue", "")))
    ticket_type = escape(str(order.get("ticketType", "")))
    quantity = escape(str(order.get("quantity", 1)))
    order_id = escape(str(order.get("id", "")))
    qr_reference = escape(str(order.get("id", "")))

    qr_cid = "ticket-qr"
    qr_png = build_qr_png_bytes(qr_data)

    qr_html_block = ""
    inline_images: Optional[Dict[str, Any]] = None
    if qr_png:
        inline_images = {qr_cid: ("png", qr_png)}
        qr_html_block = f"""
        <div style=\"margin: 18px 0; text-align: center;\">
            <div style=\"display: inline-block; background: #ffffff; padding: 14px; border-radius: 10px;\">
                <img
                    src=\"cid:{qr_cid}\"
                    alt=\"Ticket QR code\"
                    style=\"display:block; width: 240px; max-width: 100%; height: auto; image-rendering: crisp-edges;\"
                />
            </div>
        </div>
        """

    ticket_subject = f"Your B-raise Ticket for {order.get('eventName', 'an event')}"
    ticket_body = f"""
    <h2>Your ticket is ready</h2>
    <p>Here are your ticket details:</p>
    <ul>
        <li><strong>Event:</strong> {event_name}</li>
        <li><strong>Date:</strong> {event_date}</li>
        <li><strong>Venue:</strong> {venue}</li>
        <li><strong>Ticket Type:</strong> {ticket_type}</li>
        <li><strong>Quantity:</strong> {quantity}</li>
        <li><strong>Order ID:</strong> {order_id}</li>
    </ul>
    <p>Show this email or your QR code at the event entrance.</p>
    {qr_html_block}
    <p><strong>Reference:</strong> {qr_reference}</p>
    <p>If you have trouble scanning, contact support and share this reference number.</p>
    <hr>
    <p>This is an automated email from B-raise.</p>
    """

    return send_email_notification(
        to_email=user_email,
        subject=ticket_subject,
        body=ticket_body,
        inline_images=inline_images,
    )


@tickets_bp.route("/purchase", methods=["POST"])
def purchase_ticket() -> Any:
    """Record a ticket purchase in the database.

    Expected JSON body from the frontend:
    {
      "order": { ... },
      "eventId": "...",
      "user": { "id": "...", "email": "..." },
      "qrData": "...",
      "fcmToken": "..."   # optional: for push notifications
    }

    The main responsibilities of this endpoint are:
    - validate and sanitize incoming JSON data
    - assemble a "ticket_record" dictionary
    - write the ticket to Firestore (our database)
    - optionally send a push notification
    - return a JSON response confirming success or failure
    """

    # Safely parse JSON from the request body. If the body is missing
    # or invalid, we use an empty dict to avoid crashes.
    data: Dict[str, Any] = request.get_json(silent=True) or {}

    order: Dict[str, Any] = data.get("order") or {}
    user: Dict[str, Any] = data.get("user") or {}
    qr_data: Optional[str] = _normalize_qr_data(data.get("qrData")) or None
    event_id: Optional[str] = data.get("eventId")

    # We support receiving an FCM token either at the top level
    # (data["fcmToken"]) or nested under user["fcmToken"].
    fcm_token: Optional[str] = data.get("fcmToken") or user.get("fcmToken")

    # We store timestamps in ISO 8601 UTC format so they are easy to
    # read, sort, and work with across different systems.
    now_iso = datetime.utcnow().isoformat() + "Z"

    ticket_record: Dict[str, Any] = {
        "id": order.get("id"),
        "order": order,
        "eventId": event_id,
        "user": user,
        "userEmail": user.get("email"),
        "userId": user.get("id"),
        "qrData": qr_data,
        "createdAt": now_iso,
        "usedAt": None,
    }

    # If database.db is None, it means Firestore did not initialize correctly.
    # We treat this as a hard error because ticket data must be stored
    # reliably on the server.
    if database.db is None:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Ticket database not configured on server",
                }
            ),
            500,
        )

    # Persist the ticket to Firestore. We use the order ID as the
    # document ID when available so the record is stable and easy to
    # look up later.
    try:
        collection = database.db.collection("tickets")  # type: ignore[union-attr]
        doc_id = str(order.get("id")) if order.get("id") else None

        if doc_id:
            collection.document(doc_id).set(ticket_record)
        else:
            collection.add(ticket_record)

    except Exception as exc:
        # Any exception here means we could not save the ticket. We
        # return a clear error so the frontend can show a nice message
        # and the user is not charged without a record.
        from flask import current_app

        current_app.logger.error("Failed to save ticket to Firestore: %s", exc)
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to save ticket to database",
                }
            ),
            500,
        )


    # Log a concise summary for debugging and audit trails.
    from flask import current_app

    current_app.logger.info(
        "Recorded ticket purchase: order_id=%s user=%s qr=%s",
        order.get("id"),
        user,
        qr_data,
    )

    # Optionally send a push notification if we have an FCM token.
    if fcm_token and user.get("email"):
        send_fcm_notification(
            token=fcm_token,
            title="Your B-raise ticket is ready",
            body=f"Ticket for {order.get('eventName', 'your event')} is now available.",
            data={"orderId": order.get("id"), "qrData": qr_data or ""},
        )

    _send_ticket_email_for_record(ticket_record)

    return (
        jsonify(
            {
                "status": "ok",
                "message": "Ticket recorded",
                "ticket": ticket_record,
            }
        ),
        200,
    )


@tickets_bp.route("/verify", methods=["POST"])
def verify_ticket() -> Any:
    """Verify a ticket based on its QR data.

    This endpoint is intended for use by a scanner app at the event
    entrance. It receives QR data and checks whether it exists in the
    database and whether it has already been used.

    For now, if the ticket is found and not yet used, we mark it as
    used by writing a "usedAt" timestamp back to Firestore.
    """

    data: Dict[str, Any] = request.get_json(silent=True) or {}
    qr_data: str = _normalize_qr_data(data.get("qrData"))
    scanner_token: str = str(data.get("scannerToken") or "").strip()
    requested_event_id: str = str(data.get("eventId") or "").strip()

    scanner_ok, scanner_reason, scanner_session = validate_scanner_session(
        scanner_token,
        requested_event_id or None,
    )
    if not scanner_ok:
        from flask import current_app

        current_app.logger.info(
            "Ticket verify rejected: reason=%s token_present=%s requested_event_id=%s",
            scanner_reason,
            bool(scanner_token),
            requested_event_id or None,
        )
        return (
            jsonify({"valid": False, "reason": scanner_reason}),
            403,
        )

    if database.db is None:
        # We respond with "not_found" instead of a server error because
        # the scanner UI can treat this the same way as an invalid QR.
        return jsonify({"valid": False, "reason": "db_unavailable"}), 200

    if not qr_data:
        return jsonify({"valid": False, "reason": "missing_qr"}), 200

    ticket: Optional[Dict[str, Any]] = None

    try:
        # Look up the first ticket whose qrData field matches the
        # scanned QR string.
        docs = []
        for candidate in _qr_lookup_candidates(qr_data):
            docs = (
                database.db.collection("tickets")  # type: ignore[union-attr]
                .where("qrData", "==", candidate)
                .limit(1)
                .get()
            )
            if docs:
                break

        if docs:
            doc = docs[0]
            ticket = doc.to_dict()

            # Prevent scanners from validating tickets outside their assigned event.
            session_event_id = str((scanner_session or {}).get("eventId") or "").strip()
            ticket_event_id = str((ticket or {}).get("eventId") or "").strip()
            if session_event_id and ticket_event_id and session_event_id != ticket_event_id:
                return jsonify({"valid": False, "reason": "scanner_event_mismatch"}), 403

            # If the ticket has already been used, reject the scan so it cannot be reused.
            if ticket.get("usedAt"):
                return jsonify({"valid": False, "reason": "already_scanned", "ticket": ticket}), 200

            # If the ticket has not yet been used, mark it as used now.
            if not ticket.get("usedAt"):
                used_at = datetime.utcnow().isoformat() + "Z"
                ticket["usedAt"] = used_at
                doc.reference.update(
                    {
                        "usedAt": used_at,
                        "usedByScannerSessionId": (scanner_session or {}).get("id"),
                    }
                )

    except Exception as exc:
        from flask import current_app

        current_app.logger.error("Error verifying ticket in Firestore: %s", exc)

    if not ticket:
        return jsonify({"valid": False, "reason": "not_found"}), 200

    return jsonify({"valid": True, "ticket": ticket}), 200


@tickets_bp.route("/user", methods=["GET"])
def user_tickets() -> Any:
    """Return all tickets associated with a given user email.

    The React frontend can call this endpoint to show a user's ticket
    history in their account section. It expects a query parameter
    "email" and responds with a JSON list of ticket records.
    """

    email: Optional[str] = request.args.get("email")

    if not email:
        # If no email is provided, we simply return an empty list rather
        # than treating it as an error. This keeps the frontend logic
        # straightforward.
        return jsonify({"tickets": [], "email": None}), 200

    tickets: List[Dict[str, Any]] = []

    if database.db is not None:
        try:
            docs = (
                database.db.collection("tickets")  # type: ignore[union-attr]
                .where("userEmail", "==", email)
                .get()
            )
            tickets = [doc.to_dict() for doc in docs]
        except Exception as exc:
            from flask import current_app

            current_app.logger.error(
                "Failed to load tickets from Firestore for %s: %s", email, exc
            )

    # If db is None we fall through and return an empty list; this is
    # still a valid JSON response the frontend can handle gracefully.
    return jsonify({"tickets": tickets, "email": email}), 200


@tickets_bp.route("/resend-email", methods=["POST"])
def resend_ticket_email() -> Any:
    """Resend a ticket email to the ticket owner."""

    data: Dict[str, Any] = request.get_json(silent=True) or {}
    order_id = str(data.get("orderId") or "").strip()
    user_email = str(data.get("email") or "").strip().lower()

    if not order_id or not user_email:
        return (
            jsonify({"status": "error", "message": "orderId and email are required"}),
            400,
        )

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    ticket_record: Optional[Dict[str, Any]] = None

    try:
        # Fast path: our purchase endpoint stores ticket doc with doc id = order id.
        doc = database.db.collection("tickets").document(order_id).get()  # type: ignore[union-attr]
        if doc.exists:
            ticket_record = doc.to_dict() or {}

        # Fallback: in case older records were not stored with order id as doc id.
        if not ticket_record:
            docs = (
                database.db.collection("tickets")  # type: ignore[union-attr]
                .where("order.id", "==", order_id)
                .limit(1)
                .get()
            )
            if docs:
                ticket_record = docs[0].to_dict() or {}
    except Exception as exc:
        from flask import current_app

        current_app.logger.error("Failed to load ticket for resend: %s", exc)
        return (
            jsonify({"status": "error", "message": "Could not load ticket"}),
            500,
        )

    if not ticket_record:
        return jsonify({"status": "error", "message": "Ticket not found"}), 404

    owner_email = str(ticket_record.get("userEmail") or "").strip().lower()
    if owner_email != user_email:
        return (
            jsonify({"status": "error", "message": "Email does not match ticket owner"}),
            403,
        )

    sent = _send_ticket_email_for_record(ticket_record)
    if not sent:
        return (
            jsonify({"status": "error", "message": "Failed to send ticket email"}),
            500,
        )

    return jsonify({"status": "ok", "message": "Ticket email resent"}), 200


@tickets_bp.route("/verify-batch", methods=["POST"])
def verify_batch() -> Any:
    """Batch sync offline ticket verifications.

    This endpoint receives a list of offline verification attempts from
    the scanner app and validates them on the server. It handles conflict
    resolution (if same ticket scanned twice) and ensures accuracy through
    server-side timestamps.

    Expected JSON:
    {
      "verifications": [
        {
          "ticketId": "...",
          "qrData": "...",
          "status": "verified" or "failed",
          "timestamp": "2024-04-18T12:30:00Z"
        }
      ],
      "scannerToken": "..."
    }
    """

    data: Dict[str, Any] = request.get_json(silent=True) or {}
    verifications: List[Dict[str, Any]] = data.get("verifications") or []
    scanner_token: str = str(data.get("scannerToken") or "").strip()

    if not scanner_token:
        return (
            jsonify({"status": "error", "message": "Scanner token is required"}),
            403,
        )

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    # Validate scanner session
    scanner_ok, scanner_reason, scanner_session = validate_scanner_session(
        scanner_token,
        None,  # Don't restrict by event here; we'll check per-ticket
    )
    if not scanner_ok:
        return (
            jsonify({"status": "error", "message": "Invalid scanner token"}),
            403,
        )

    now = datetime.utcnow().isoformat() + "Z"
    results: List[Dict[str, Any]] = []

    for verification in verifications:
        qr_data: str = _normalize_qr_data(verification.get("qrData"))
        status: str = str(verification.get("status") or "").strip().lower()
        timestamp: str = str(verification.get("timestamp") or "").strip()

        if not qr_data:
            results.append({
                "qrData": qr_data,
                "status": "failed",
                "reason": "missing_qr",
            })
            continue

        ticket: Optional[Dict[str, Any]] = None
        ticket_doc = None

        try:
            # Look up ticket by QR data
            for candidate in _qr_lookup_candidates(qr_data):
                docs = (
                    database.db.collection("tickets")  # type: ignore[union-attr]
                    .where("qrData", "==", candidate)
                    .limit(1)
                    .get()
                )
                if docs:
                    ticket_doc = docs[0]
                    ticket = ticket_doc.to_dict()
                    break

            if not ticket:
                results.append({
                    "qrData": qr_data,
                    "status": "failed",
                    "reason": "not_found",
                })
                continue

            # Check event mismatch
            session_event_id = str((scanner_session or {}).get("eventId") or "").strip()
            ticket_event_id = str(ticket.get("eventId") or "").strip()
            if session_event_id and ticket_event_id and session_event_id != ticket_event_id:
                results.append({
                    "qrData": qr_data,
                    "status": "failed",
                    "reason": "scanner_event_mismatch",
                })
                continue

            # Check if already used
            if ticket.get("usedAt"):
                results.append({
                    "qrData": qr_data,
                    "status": "already_used",
                    "usedAt": ticket.get("usedAt"),
                })
                continue

            # Mark as used with server timestamp (not client timestamp)
            if status == "verified" and ticket_doc:
                ticket_doc.reference.update(
                    {
                        "usedAt": now,
                        "usedByScannerSessionId": (scanner_session or {}).get("id"),
                        "usedAtClient": timestamp,  # Store client timestamp for audit
                    }
                )
                results.append({
                    "qrData": qr_data,
                    "status": "verified",
                    "usedAt": now,
                })
            else:
                results.append({
                    "qrData": qr_data,
                    "status": "failed",
                    "reason": "offline_status_not_verified",
                })

        except Exception as exc:
            from flask import current_app

            current_app.logger.error("Error in batch verification: %s", exc)
            results.append({
                "qrData": qr_data,
                "status": "failed",
                "reason": "processing_error",
            })

    # Log batch operation
    from flask import current_app

    successful = len([r for r in results if r.get("status") in ("verified",)])
    current_app.logger.info(
        "Batch verification sync: %d total, %d verified",
        len(results),
        successful,
    )

    return jsonify({
        "status": "ok",
        "results": results,
        "processedAt": now,
    }), 200

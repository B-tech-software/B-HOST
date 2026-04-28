"""Contact form submission endpoint for the B-raise backend.

This module handles contact form messages from the website and sends them
via the same email workflow used for ticket notifications.
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, jsonify, request

from notifications import send_email_notification

logger = logging.getLogger(__name__)

contact_bp = Blueprint("contact", __name__, url_prefix="/api")


@contact_bp.route("/contact/submit", methods=["POST"])
def submit_contact() -> Any:
    """Handle contact form submissions.

    Expects JSON body with:
        - name: str (required)
        - email: str (required)
        - message: str (required)

    Sends the message to the B-HOST support email using the standard
    SMTP/Gmail workflow.

    Returns:
        JSON response with status and message.
    """

    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    message = (data.get("message") or "").strip()

    # Validate required fields
    if not name:
        return jsonify({"success": False, "error": "Name is required"}), 400
    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400
    if not message:
        return jsonify({"success": False, "error": "Message is required"}), 400

    # Basic email format validation
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"success": False, "error": "Invalid email address"}), 400

    # Build the email HTML body
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff003c; margin-bottom: 1rem;">New Contact Form Submission</h2>
                
                <div style="background-color: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #ff003c;">
                    <p><strong>Name:</strong> {name}</p>
                    <p><strong>Email:</strong> {email}</p>
                    <p><strong>Message:</strong></p>
                    <p style="background-color: #fff; padding: 1rem; border-radius: 4px; white-space: pre-wrap;">{message}</p>
                </div>
                
                <p style="font-size: 0.9rem; color: #666; margin-top: 2rem;">
                    This is an automated message from the B-HOST website contact form.<br>
                    <strong>Reply directly to {email} to respond to this inquiry.</strong>
                </p>
            </div>
        </body>
    </html>
    """

    # Send email to support
    success = send_email_notification(
        to_email="munengebee@gmail.com",
        subject=f"B-HOST Contact Form: {name}",
        body=html_body,
    )

    if not success:
        logger.error(f"Failed to send contact email from {email}")
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Failed to send message. Please try again later.",
                }
            ),
            500,
        )

    logger.info(f"Contact form submitted by {email}: {name}")
    return (
        jsonify(
            {
                "success": True,
                "message": "Thank you! We received your message and will get back to you soon.",
            }
        ),
        200,
    )

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request

import database
from payments import simulate_payment

payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


@payments_bp.route("/initiate", methods=["POST"])
def initiate_payment() -> Any:
    """Initiate a simulated payment on the backend."""

    data: Dict[str, Any] = request.get_json(silent=True) or {}

    amount_raw = data.get("amount")
    currency = str(data.get("currency") or "USD").strip().upper()
    user_id = str(data.get("userId") or "").strip()
    user_email = str(data.get("userEmail") or "").strip().lower()
    payment_method = str(data.get("paymentMethod") or "simulated").strip().lower()
    order_id = str(data.get("orderId") or "").strip()

    try:
        amount = float(amount_raw)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid amount"}), 400

    if amount < 0:
        return jsonify({"status": "error", "message": "Amount cannot be negative"}), 400

    if not user_id or not user_email:
        return jsonify({"status": "error", "message": "userId and userEmail are required"}), 400

    payment_result = simulate_payment(
        amount=amount,
        currency=currency,
        user_id=user_id,
        payment_method=payment_method,
    )

    transaction_id = str(payment_result.get("transaction_id") or "").strip()
    payment_record = {
        "transactionId": transaction_id,
        "orderId": order_id,
        "userId": user_id,
        "userEmail": user_email,
        "currency": currency,
        "amount": amount,
        "paymentMethod": payment_method,
        "status": "initiated",
        "createdAt": _now_iso(),
        "provider": "simulated-backend",
        "gatewayResponse": payment_result,
    }

    if database.db is not None:
        try:
            collection = database.db.collection("payments")  # type: ignore[union-attr]
            if transaction_id:
                collection.document(transaction_id).set(payment_record)
            else:
                collection.add(payment_record)
        except Exception:
            # Payment simulation still succeeds even if logging to DB fails.
            pass

    return (
        jsonify(
            {
                "status": "ok",
                "message": "Payment initiated",
                "transactionId": transaction_id,
                "payment": payment_record,
            }
        ),
        200,
    )


@payments_bp.route("/verify", methods=["POST"])
def verify_payment() -> Any:
    """Verify a simulated backend payment."""

    data: Dict[str, Any] = request.get_json(silent=True) or {}
    transaction_id = str(data.get("transactionId") or "").strip()
    order_id = str(data.get("orderId") or "").strip()

    if not transaction_id:
        return jsonify({"status": "error", "message": "transactionId is required"}), 400

    payment_record: Optional[Dict[str, Any]] = None

    if database.db is not None:
        try:
            doc = database.db.collection("payments").document(transaction_id).get()  # type: ignore[union-attr]
            if doc.exists:
                payment_record = doc.to_dict() or {}
        except Exception:
            payment_record = None

    if payment_record is None:
        # Fallback for local/dev flows where DB record may be missing.
        payment_record = {
            "transactionId": transaction_id,
            "orderId": order_id,
            "status": "verified",
            "verifiedAt": _now_iso(),
            "provider": "simulated-backend",
        }
    else:
        payment_record["status"] = "verified"
        payment_record["verifiedAt"] = _now_iso()

    if database.db is not None:
        try:
            database.db.collection("payments").document(transaction_id).set(payment_record, merge=True)  # type: ignore[union-attr]
        except Exception:
            pass

    return (
        jsonify(
            {
                "status": "ok",
                "message": "Payment verified",
                "verified": True,
                "transactionId": transaction_id,
                "payment": payment_record,
            }
        ),
        200,
    )

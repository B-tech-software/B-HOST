from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
import os
import re
import secrets
import string
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from firebase_admin import auth as firebase_auth

import database

organizers_bp = Blueprint("organizers", __name__, url_prefix="/api/organizers")


def _get_owner_emails() -> List[str]:
    raw = os.getenv("OWNER_EMAILS", "munengebee@gmail.com,munegebee@gmail.com")
    return [email.strip().lower() for email in raw.split(",") if email.strip()]


def _authenticate_owner() -> Tuple[bool, Optional[str], Tuple[Any, int] | None]:
    """Authorize owner-only dashboard actions.

    Preferred auth: Firebase ID token in Authorization header.
    Fallback auth: shared admin key header for compatibility.
    """
    owner_emails = _get_owner_emails()

    auth_header = str(request.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return False, None, (jsonify({"status": "error", "message": "Missing bearer token"}), 401)

        if not owner_emails:
            return (
                False,
                None,
                (
                    jsonify({"status": "error", "message": "OWNER_EMAILS is not configured on server"}),
                    500,
                ),
            )

        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception:
            return False, None, (jsonify({"status": "error", "message": "Invalid auth token"}), 401)

        email = str(decoded.get("email") or "").strip().lower()
        if not email:
            return False, None, (jsonify({"status": "error", "message": "Authenticated user has no email"}), 403)

        if email not in owner_emails:
            return False, email, (jsonify({"status": "error", "message": "Owner access only"}), 403)

        return True, email, None

    # Legacy admin key fallback
    configured_key = os.getenv("ORGANIZER_ADMIN_KEY", "").strip()
    provided_key = str(request.headers.get("X-Organizer-Admin-Key") or "").strip()
    if configured_key and secrets.compare_digest(configured_key, provided_key):
        return True, "admin-key", None

    return False, None, (jsonify({"status": "error", "message": "Unauthorized"}), 401)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _generate_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_unique_code() -> str:
    if database.db is None:
        return _generate_code()

    for _ in range(8):
        code = _generate_code(8)
        docs = (
            database.db.collection("scanner_access_codes")  # type: ignore[union-attr]
            .where("code", "==", code)
            .limit(1)
            .get()
        )
        if not docs:
            return code

    # Very unlikely fallback path.
    return _generate_code(10)


def _load_organizer(uid: str) -> Optional[Dict[str, Any]]:
    if database.db is None:
        return None

    doc = (
        database.db.collection("event_organizers")  # type: ignore[union-attr]
        .document(uid)
        .get()
    )
    if not doc.exists:
        return None
    return doc.to_dict() or None


def _require_approved_organizer(uid: str) -> Tuple[bool, Optional[Dict[str, Any]], Tuple[Any, int] | None]:
    organizer = _load_organizer(uid)
    if not organizer:
        return (
            False,
            None,
            (
                jsonify({"status": "error", "message": "Organizer profile not found"}),
                403,
            ),
        )

    if organizer.get("status") != "approved":
        return (
            False,
            organizer,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": "Organizer is not approved yet",
                        "organizerStatus": organizer.get("status", "pending"),
                    }
                ),
                403,
            ),
        )

    return True, organizer, None


def _to_int(value: Any) -> int:
    if value is None:
        return 0

    if isinstance(value, bool):
        return int(value)

    if isinstance(value, (int, float)):
        try:
            return max(int(float(value)), 0)
        except Exception:
            return 0

    text = str(value).strip()
    if not text:
        return 0

    # Support values like "1,200", "1200.0", "120 tickets".
    normalized = text.replace(",", "")
    numeric_match = re.search(r"-?\d+(?:\.\d+)?", normalized)
    if not numeric_match:
        return 0

    try:
        return max(int(float(numeric_match.group(0))), 0)
    except Exception:
        return 0


def _normalize_ticket_type(raw_type: Any) -> str:
    value = str(raw_type or "").strip().lower()
    compact = re.sub(r"[^a-z0-9]+", "", value)

    if compact in {"general", "generaladmission", "ga", "basic", "standard", "regular"}:
        return "basic"
    if compact in {"vip", "vvip", "free", "freersvp", "rsvp"}:
        if compact in {"freersvp", "rsvp"}:
            return "free"
        return compact
    if value in {"vip", "vvip", "free"}:
        return value
    return value or "unknown"


def _extract_ticket_capacity(raw_entry: Any) -> int:
    if isinstance(raw_entry, dict):
        for key in (
            "quantity",
            "qty",
            "count",
            "capacity",
            "available",
            "availableQuantity",
            "ticketsAvailable",
            "ticketCount",
            "total",
            "stock",
            "limit",
            "max",
        ):
            if key in raw_entry:
                nested_value = raw_entry.get(key)
                if isinstance(nested_value, dict):
                    for nested_key in ("value", "amount", "count", "total"):
                        if nested_key in nested_value:
                            return _to_int(nested_value.get(nested_key))
                return _to_int(nested_value)

        # Last-resort recursive sniff for any field that looks like capacity metadata.
        for key, nested_value in raw_entry.items():
            key_name = str(key).lower()
            if any(marker in key_name for marker in ("qty", "quantity", "capacity", "available", "count", "stock", "total")):
                candidate = _extract_ticket_capacity(nested_value)
                if candidate > 0:
                    return candidate

    return _to_int(raw_entry)


def _collect_base_capacity_by_type(event_data: Dict[str, Any]) -> Dict[str, int]:
    base_capacity_by_type: Dict[str, int] = {}

    tickets_cfg = event_data.get("tickets") or {}
    if isinstance(tickets_cfg, dict):
        for raw_key, entry in tickets_cfg.items():
            normalized_key = _normalize_ticket_type(raw_key)
            capacity = _extract_ticket_capacity(entry)

            if not normalized_key:
                continue

            base_capacity_by_type[normalized_key] = max(
                base_capacity_by_type.get(normalized_key, 0),
                capacity,
            )

    # Alternate schemas seen in earlier/eventual frontend versions.
    for list_key in ("ticketTypes", "ticketOptions", "ticketsList"):
        list_value = event_data.get(list_key)
        if isinstance(list_value, list):
            for item in list_value:
                if not isinstance(item, dict):
                    continue

                raw_type = item.get("type") or item.get("name") or item.get("id") or item.get("key")
                normalized_key = _normalize_ticket_type(raw_type)
                capacity = _extract_ticket_capacity(item)

                if not normalized_key:
                    continue

                base_capacity_by_type[normalized_key] = max(
                    base_capacity_by_type.get(normalized_key, 0),
                    capacity,
                )

    # Additional explicit capacity fields if present.
    direct_capacity_map = {
        "basic": event_data.get("basicCapacity") or event_data.get("generalCapacity"),
        "vip": event_data.get("vipCapacity"),
        "vvip": event_data.get("vvipCapacity"),
    }
    for ticket_type, raw_capacity in direct_capacity_map.items():
        capacity = _to_int(raw_capacity)
        if capacity > 0:
            base_capacity_by_type[ticket_type] = max(
                base_capacity_by_type.get(ticket_type, 0),
                capacity,
            )

    # Legacy fallback fields for older events that may not have the
    # nested tickets structure.
    legacy_general_capacity = _to_int(
        event_data.get("ticketQuantity")
        or event_data.get("totalTickets")
        or event_data.get("capacity")
    )
    if legacy_general_capacity > 0:
        base_capacity_by_type["basic"] = max(
            base_capacity_by_type.get("basic", 0),
            legacy_general_capacity,
        )

    if bool(event_data.get("isFree")):
        base_capacity_by_type["free"] = max(
            base_capacity_by_type.get("free", 0),
            _to_int(event_data.get("freeTicketQuantity")),
        )

    return base_capacity_by_type


@organizers_bp.route("/events/stats", methods=["GET"])
def organizer_event_stats() -> Any:
    uid = str(request.args.get("uid") or "").strip()
    if not uid:
        return jsonify({"status": "error", "message": "uid is required"}), 400

    auth_header = str(request.headers.get("Authorization") or "").strip()
    if not auth_header.lower().startswith("bearer "):
        return jsonify({"status": "error", "message": "Missing bearer token"}), 401

    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        return jsonify({"status": "error", "message": "Missing bearer token"}), 401

    try:
        decoded = firebase_auth.verify_id_token(token)
    except Exception:
        return jsonify({"status": "error", "message": "Invalid auth token"}), 401

    token_uid = str(decoded.get("uid") or "").strip()
    if token_uid != uid:
        return jsonify({"status": "error", "message": "Forbidden"}), 403

    if database.db is None:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        event_docs = (
            database.db.collection("events")  # type: ignore[union-attr]
            .where("createdBy", "==", uid)
            .get()
        )
    except Exception:
        event_docs = []

    events_payload: List[Dict[str, Any]] = []

    for event_doc in event_docs:
        event_data = event_doc.to_dict() or {}
        event_id = event_doc.id

        base_capacity_by_type = _collect_base_capacity_by_type(event_data)

        sold_by_type: Dict[str, int] = defaultdict(int)
        sold_total = 0

        try:
            ticket_docs = (
                database.db.collection("tickets")  # type: ignore[union-attr]
                .where("eventId", "==", event_id)
                .get()
            )
        except Exception:
            ticket_docs = []

        for ticket_doc in ticket_docs:
            ticket = ticket_doc.to_dict() or {}
            order = ticket.get("order") or {}
            qty = _to_int(order.get("quantity") or 1)
            ticket_type = _normalize_ticket_type(order.get("ticketType"))
            sold_by_type[ticket_type] += qty
            sold_total += qty

        # Ensure every configured ticket type appears even when sold = 0.
        for configured_type in base_capacity_by_type.keys():
            sold_by_type.setdefault(configured_type, 0)

        ticket_types: List[Dict[str, Any]] = []
        for ticket_type, sold in sold_by_type.items():
            capacity = base_capacity_by_type.get(ticket_type)
            left = max(capacity - sold, 0) if isinstance(capacity, int) else None
            ticket_types.append(
                {
                    "type": ticket_type,
                    "sold": sold,
                    "capacity": capacity,
                    "left": left,
                }
            )

        total_capacity = sum(base_capacity_by_type.values()) if base_capacity_by_type else None
        total_left = max(total_capacity - sold_total, 0) if isinstance(total_capacity, int) else None

        events_payload.append(
            {
                "id": event_id,
                "title": event_data.get("title") or "Untitled event",
                "status": str(event_data.get("status") or "").strip().lower(),
                "date": event_data.get("date") or "",
                "time": event_data.get("time") or event_data.get("startTime") or "",
                "venue": event_data.get("venue") or "",
                "ticketConfig": event_data.get("tickets") or {},
                "totals": {
                    "sold": sold_total,
                    "capacity": total_capacity,
                    "left": total_left,
                },
                "ticketTypes": sorted(ticket_types, key=lambda item: str(item.get("type") or "")),
            }
        )

    return (
        jsonify(
            {
                "status": "ok",
                "uid": uid,
                "events": events_payload,
                "generatedAt": _to_iso(_utc_now()),
            }
        ),
        200,
    )


@organizers_bp.route("/admin/events/stats", methods=["GET"])
def owner_event_stats() -> Any:
    is_owner, owner_email, error_response = _authenticate_owner()
    if not is_owner and error_response is not None:
        return error_response

    if database.db is None:
        return jsonify({"status": "error", "message": "Database unavailable"}), 500

    try:
        event_docs = database.db.collection("events").get()  # type: ignore[union-attr]
    except Exception:
        event_docs = []

    events_payload: List[Dict[str, Any]] = []

    for event_doc in event_docs:
        event_data = event_doc.to_dict() or {}
        event_id = event_doc.id

        base_capacity_by_type = _collect_base_capacity_by_type(event_data)

        sold_by_type: Dict[str, int] = defaultdict(int)
        sold_total = 0

        try:
            ticket_docs = (
                database.db.collection("tickets")  # type: ignore[union-attr]
                .where("eventId", "==", event_id)
                .get()
            )
        except Exception:
            ticket_docs = []

        for ticket_doc in ticket_docs:
            ticket = ticket_doc.to_dict() or {}
            order = ticket.get("order") or {}
            qty = _to_int(order.get("quantity") or 1)
            ticket_type = _normalize_ticket_type(order.get("ticketType"))
            sold_by_type[ticket_type] += qty
            sold_total += qty

        for configured_type in base_capacity_by_type.keys():
            sold_by_type.setdefault(configured_type, 0)

        ticket_types: List[Dict[str, Any]] = []
        for ticket_type, sold in sold_by_type.items():
            capacity = base_capacity_by_type.get(ticket_type)
            left = max(capacity - sold, 0) if isinstance(capacity, int) else None
            ticket_types.append(
                {
                    "type": ticket_type,
                    "sold": sold,
                    "capacity": capacity,
                    "left": left,
                }
            )

        total_capacity = sum(base_capacity_by_type.values()) if base_capacity_by_type else None
        total_left = max(total_capacity - sold_total, 0) if isinstance(total_capacity, int) else None

        events_payload.append(
            {
                "id": event_id,
                "title": event_data.get("title") or "Untitled event",
                "status": str(event_data.get("status") or "").strip().lower(),
                "date": event_data.get("date") or "",
                "time": event_data.get("time") or event_data.get("startTime") or "",
                "venue": event_data.get("venue") or "",
                "createdBy": event_data.get("createdBy") or "",
                "createdByEmail": event_data.get("createdByEmail") or "",
                "ticketConfig": event_data.get("tickets") or {},
                "totals": {
                    "sold": sold_total,
                    "capacity": total_capacity,
                    "left": total_left,
                },
                "ticketTypes": sorted(ticket_types, key=lambda item: str(item.get("type") or "")),
            }
        )

    return (
        jsonify(
            {
                "status": "ok",
                "owner": owner_email,
                "events": events_payload,
                "generatedAt": _to_iso(_utc_now()),
            }
        ),
        200,
    )


@organizers_bp.route("/register", methods=["POST"])
def register_organizer() -> Any:
    data: Dict[str, Any] = request.get_json(silent=True) or {}

    uid = str(data.get("uid") or "").strip()
    email = str(data.get("email") or "").strip().lower()

    if not uid or not email:
        return (
            jsonify({"status": "error", "message": "uid and email are required"}),
            400,
        )

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    now_iso = _to_iso(_utc_now())
    existing = _load_organizer(uid) or {}
    existing_status = existing.get("status")

    payload = {
        "uid": uid,
        "email": email,
        "organizerEmail": str(data.get("organizerEmail") or existing.get("organizerEmail") or email).strip().lower(),
        "displayName": str(data.get("displayName") or existing.get("displayName") or "").strip(),
        "organizationName": str(data.get("organizationName") or existing.get("organizationName") or "").strip(),
        "phone": str(data.get("phone") or existing.get("phone") or "").strip(),
        "address": str(data.get("address") or existing.get("address") or "").strip(),
        "status": existing_status if existing_status in {"approved", "rejected"} else "pending",
        "updatedAt": now_iso,
    }

    if not existing:
        payload["createdAt"] = now_iso

    (
        database.db.collection("event_organizers")  # type: ignore[union-attr]
        .document(uid)
        .set(payload, merge=True)
    )

    return jsonify({"status": "ok", "organizer": payload}), 200


@organizers_bp.route("/status", methods=["GET"])
def organizer_status() -> Any:
    uid = str(request.args.get("uid") or "").strip()
    if not uid:
        return jsonify({"registered": False, "status": None}), 200

    organizer = _load_organizer(uid)
    if not organizer:
        return jsonify({"registered": False, "status": None}), 200

    return (
        jsonify(
            {
                "registered": True,
                "status": organizer.get("status", "pending"),
                "organizer": organizer,
            }
        ),
        200,
    )


@organizers_bp.route("/pending", methods=["GET"])
def list_pending_organizers() -> Any:
    is_owner, owner_email, error_response = _authenticate_owner()
    if not is_owner and error_response is not None:
        return error_response

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    docs = (
        database.db.collection("event_organizers")  # type: ignore[union-attr]
        .where("status", "==", "pending")
        .get()
    )
    organizers = [{"id": doc.id, **(doc.to_dict() or {})} for doc in docs]
    return jsonify({"status": "ok", "owner": owner_email, "organizers": organizers}), 200


@organizers_bp.route("/review", methods=["POST"])
def review_organizer() -> Any:
    is_owner, owner_email, error_response = _authenticate_owner()
    if not is_owner and error_response is not None:
        return error_response

    data: Dict[str, Any] = request.get_json(silent=True) or {}
    uid = str(data.get("uid") or "").strip()
    decision = str(data.get("decision") or "").strip().lower()
    review_note = str(data.get("reviewNote") or "").strip()

    if not uid:
        return jsonify({"status": "error", "message": "uid is required"}), 400

    if decision not in {"approved", "rejected"}:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "decision must be approved or rejected",
                }
            ),
            400,
        )

    organizer = _load_organizer(uid)
    if not organizer:
        return jsonify({"status": "error", "message": "Organizer not found"}), 404

    now_iso = _to_iso(_utc_now())
    update_payload = {
        "status": decision,
        "reviewedAt": now_iso,
        "reviewedByEmail": owner_email,
        "reviewNote": review_note,
        "updatedAt": now_iso,
    }

    (
        database.db.collection("event_organizers")  # type: ignore[union-attr]
        .document(uid)
        .set(update_payload, merge=True)
    )

    refreshed = _load_organizer(uid) or {}
    return jsonify({"status": "ok", "organizer": refreshed}), 200


@organizers_bp.route("/admin/events/pending", methods=["GET"])
def list_pending_events() -> Any:
    is_owner, owner_email, error_response = _authenticate_owner()
    if not is_owner and error_response is not None:
        return error_response

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    docs = database.db.collection("events").get()  # type: ignore[union-attr]
    pending_events: List[Dict[str, Any]] = []

    for doc in docs:
        event = doc.to_dict() or {}
        status = str(event.get("status") or "").strip().lower()
        if status in {"draft", "pending"}:
            pending_events.append({"id": doc.id, **event})

    return jsonify({"status": "ok", "owner": owner_email, "events": pending_events}), 200


@organizers_bp.route("/admin/events/review", methods=["POST"])
def review_event() -> Any:
    is_owner, owner_email, error_response = _authenticate_owner()
    if not is_owner and error_response is not None:
        return error_response

    data: Dict[str, Any] = request.get_json(silent=True) or {}
    event_id = str(data.get("eventId") or "").strip()
    decision = str(data.get("decision") or "").strip().lower()
    review_note = str(data.get("reviewNote") or "").strip()

    if not event_id:
        return jsonify({"status": "error", "message": "eventId is required"}), 400

    if decision not in {"approved", "rejected"}:
        return (
            jsonify({"status": "error", "message": "decision must be approved or rejected"}),
            400,
        )

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    event_ref = database.db.collection("events").document(event_id)  # type: ignore[union-attr]
    existing = event_ref.get()
    if not existing.exists:
        return jsonify({"status": "error", "message": "Event not found"}), 404

    now_iso = _to_iso(_utc_now())
    event_ref.set(
        {
            "status": decision,
            "reviewedAt": now_iso,
            "reviewedByEmail": owner_email,
            "reviewNote": review_note,
            "updatedAt": now_iso,
        },
        merge=True,
    )

    refreshed = event_ref.get().to_dict() or {}
    return jsonify({"status": "ok", "event": {"id": event_id, **refreshed}}), 200


@organizers_bp.route("/scanner-codes/bulk-create", methods=["POST"])
def create_scanner_codes() -> Any:
    data: Dict[str, Any] = request.get_json(silent=True) or {}

    uid = str(data.get("uid") or "").strip()
    event_id = str(data.get("eventId") or "").strip()
    scanners = data.get("scanners") or []

    if not uid or not event_id:
        return (
            jsonify({"status": "error", "message": "uid and eventId are required"}),
            400,
        )

    if not isinstance(scanners, list) or not scanners:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "scanners must be a non-empty list",
                }
            ),
            400,
        )

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    approved, _organizer, error_response = _require_approved_organizer(uid)
    if not approved and error_response is not None:
        return error_response

    event_doc = (
        database.db.collection("events")  # type: ignore[union-attr]
        .document(event_id)
        .get()
    )
    if not event_doc.exists:
        return jsonify({"status": "error", "message": "Event not found"}), 404

    event_data = event_doc.to_dict() or {}
    if event_data.get("createdBy") and event_data.get("createdBy") != uid:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "You are not allowed to manage scanners for this event",
                }
            ),
            403,
        )

    expires_in_minutes_raw = data.get("expiresInMinutes", 120)
    max_devices_raw = data.get("maxDevicesPerScanner", 1)

    try:
        expires_in_minutes = int(expires_in_minutes_raw)
    except Exception:
        expires_in_minutes = 120
    expires_in_minutes = max(5, min(expires_in_minutes, 1440))

    try:
        max_devices = int(max_devices_raw)
    except Exception:
        max_devices = 1
    max_devices = max(1, min(max_devices, 10))

    now = _utc_now()
    expires_at = now + timedelta(minutes=expires_in_minutes)

    created_codes: List[Dict[str, Any]] = []

    for scanner in scanners:
        scanner_name = str((scanner or {}).get("name") or "").strip()
        scanner_email = str((scanner or {}).get("email") or "").strip().lower()
        scanner_phone = str((scanner or {}).get("phone") or "").strip()

        if not scanner_email:
            # Email is our strongest stable identifier for now.
            continue

        code = _generate_unique_code()
        record = {
            "code": code,
            "eventId": event_id,
            "organizerUid": uid,
            "scanner": {
                "name": scanner_name,
                "email": scanner_email,
                "phone": scanner_phone,
            },
            "status": "active",
            "maxDevices": max_devices,
            "boundDevices": [],
            "redemptionCount": 0,
            "createdAt": _to_iso(now),
            "expiresAt": _to_iso(expires_at),
        }

        doc_ref = database.db.collection("scanner_access_codes").document()  # type: ignore[union-attr]
        doc_ref.set(record)
        created_codes.append({"id": doc_ref.id, **record})

    if not created_codes:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "No valid scanner rows were provided. Each scanner needs an email.",
                }
            ),
            400,
        )

    return jsonify({"status": "ok", "codes": created_codes}), 200


@organizers_bp.route("/scanner-codes/redeem", methods=["POST"])
def redeem_scanner_code() -> Any:
    data: Dict[str, Any] = request.get_json(silent=True) or {}

    code = str(data.get("code") or "").strip().upper()
    device_id = str(data.get("deviceId") or "").strip()
    scanner_email = str(data.get("scannerEmail") or "").strip().lower()
    scanner_name = str(data.get("scannerName") or "").strip()

    if not code or not device_id:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "code and deviceId are required",
                }
            ),
            400,
        )

    if database.db is None:
        return (
            jsonify({"status": "error", "message": "Database unavailable"}),
            500,
        )

    docs = (
        database.db.collection("scanner_access_codes")  # type: ignore[union-attr]
        .where("code", "==", code)
        .limit(1)
        .get()
    )

    if not docs:
        return jsonify({"status": "error", "message": "Invalid access code"}), 404

    code_doc = docs[0]
    code_data = code_doc.to_dict() or {}

    if code_data.get("status") != "active":
        return (
            jsonify({"status": "error", "message": "Access code is no longer active"}),
            403,
        )

    expires_at = _parse_iso(code_data.get("expiresAt"))
    now = _utc_now()
    if not expires_at or expires_at <= now:
        code_doc.reference.update({"status": "expired"})
        return jsonify({"status": "error", "message": "Access code has expired"}), 403

    scanner_from_code = code_data.get("scanner") or {}
    expected_email = str(scanner_from_code.get("email") or "").strip().lower()
    if expected_email and scanner_email and scanner_email != expected_email:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "This code is not assigned to that scanner email",
                }
            ),
            403,
        )

    bound_devices = code_data.get("boundDevices") or []
    max_devices = int(code_data.get("maxDevices") or 1)

    # Reuse existing active session for this device if present.
    existing_session_docs = (
        database.db.collection("scanner_sessions")  # type: ignore[union-attr]
        .where("codeId", "==", code_doc.id)
        .where("deviceId", "==", device_id)
        .where("status", "==", "active")
        .limit(1)
        .get()
    )

    if existing_session_docs:
        session_data = existing_session_docs[0].to_dict() or {}
        session_expires_at = _parse_iso(session_data.get("expiresAt"))
        if session_expires_at and session_expires_at > now:
            event_id = session_data.get("eventId")
            tickets: List[Dict[str, Any]] = []
            if event_id:
                try:
                    ticket_docs = (
                        database.db.collection("tickets")  # type: ignore[union-attr]
                        .where("eventId", "==", event_id)
                        .get()
                    )
                    for doc in ticket_docs:
                        ticket_data = doc.to_dict() or {}
                        tickets.append(
                            {
                                "id": doc.id,
                                "qrData": ticket_data.get("qrData"),
                                "eventId": ticket_data.get("eventId"),
                                "usedAt": ticket_data.get("usedAt"),
                            }
                        )
                except Exception:
                    tickets = []

            return (
                jsonify(
                    {
                        "ok": True,
                        "status": "ok",
                        "scannerSession": {
                            "scannerToken": session_data.get("token"),
                            "eventId": event_id,
                            "id": existing_session_docs[0].id,
                        },
                        "tickets": tickets,
                        "expiresAt": session_data.get("expiresAt"),
                    }
                ),
                200,
            )

    if device_id not in bound_devices and len(bound_devices) >= max_devices:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "This code has reached its device limit",
                    "maxDevices": max_devices,
                }
            ),
            403,
        )

    if device_id not in bound_devices:
        bound_devices.append(device_id)

    session_expires_at = min(expires_at, now + timedelta(hours=12))
    scanner_token = secrets.token_urlsafe(32)

    session_doc = {
        "token": scanner_token,
        "codeId": code_doc.id,
        "eventId": code_data.get("eventId"),
        "organizerUid": code_data.get("organizerUid"),
        "deviceId": device_id,
        "scanner": {
            "name": scanner_name or scanner_from_code.get("name") or "",
            "email": scanner_email or expected_email,
            "phone": scanner_from_code.get("phone") or "",
        },
        "status": "active",
        "createdAt": _to_iso(now),
        "expiresAt": _to_iso(session_expires_at),
    }

    database.db.collection("scanner_sessions").document().set(session_doc)  # type: ignore[union-attr]

    code_doc.reference.update(
        {
            "boundDevices": bound_devices,
            "redemptionCount": int(code_data.get("redemptionCount") or 0) + 1,
            "updatedAt": _to_iso(now),
        }
    )

    # Fetch all tickets for this event for offline caching
    event_id = code_data.get("eventId")
    tickets: List[Dict[str, Any]] = []
    if event_id:
        try:
            ticket_docs = (
                database.db.collection("tickets")  # type: ignore[union-attr]
                .where("eventId", "==", event_id)
                .get()
            )
            for doc in ticket_docs:
                ticket_data = doc.to_dict() or {}
                tickets.append({
                    "id": doc.id,
                    "qrData": ticket_data.get("qrData"),
                    "eventId": ticket_data.get("eventId"),
                    "usedAt": ticket_data.get("usedAt"),
                })
        except Exception as exc:
            # Log error but don't fail the redemption
            from flask import current_app
            current_app.logger.warning("Failed to fetch tickets for event %s: %s", event_id, exc)

    return (
        jsonify(
            {
                "ok": True,
                "status": "ok",
                "scannerSession": {
                    "scannerToken": scanner_token,
                    "eventId": code_data.get("eventId"),
                    "id": code_doc.id,
                },
                "tickets": tickets,
                "expiresAt": _to_iso(session_expires_at),
            }
        ),
        200,
    )


def validate_scanner_session(scanner_token: str, event_id: Optional[str]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
    """Validate scanner token and event permissions for secure ticket scans."""

    if database.db is None:
        return False, "db_unavailable", None

    if not scanner_token:
        return False, "missing_scanner_token", None

    # Backward-compatible lookup: older sessions may not have a status field.
    docs = (
        database.db.collection("scanner_sessions")  # type: ignore[union-attr]
        .where("token", "==", scanner_token)
        .limit(1)
        .get()
    )

    if not docs:
        return False, "invalid_scanner_token", None

    session = docs[0].to_dict() or {}
    session_status = str(session.get("status") or "active").strip().lower()
    if session_status in {"revoked", "disabled", "inactive"}:
        return False, "invalid_scanner_token", None

    if session_status == "expired":
        return False, "scanner_session_expired", None

    expires_at = _parse_iso(session.get("expiresAt"))
    now = _utc_now()

    # Some legacy scanner sessions may not have expiresAt; treat those as valid.
    if expires_at and expires_at <= now:
        docs[0].reference.update({"status": "expired", "updatedAt": _to_iso(now)})
        return False, "scanner_session_expired", None

    session_event_id = str(session.get("eventId") or "").strip()
    if event_id and session_event_id and event_id != session_event_id:
        return False, "scanner_event_mismatch", None

    return True, "ok", {"id": docs[0].id, **session}

"""Health-check endpoint for the B-raise backend.

This very small module provides a single route that frontends or
monitoring tools can call to confirm that the backend process is
running and reachable.
"""

from __future__ import annotations

from typing import Any

from flask import Blueprint, jsonify

# All health/diagnostic endpoints could live under this blueprint.
health_bp = Blueprint("health", __name__, url_prefix="/api")


@health_bp.route("/health", methods=["GET"])
def health() -> Any:
    """Simple health check used by the frontend.

    The React app can call /api/health to verify that the Flask backend
    is up. This is also useful when deploying to the cloud so that
    monitoring systems have a lightweight way to check the service.
    """

    return jsonify({"status": "ok", "service": "b-raise-backend"})

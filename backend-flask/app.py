
from __future__ import annotations
from dotenv import load_dotenv
import logging
import os

load_dotenv()
"""Entry point for the B-raise Flask backend.

This file wires together the different parts of the backend:

- creates and configures the Flask application
- enables CORS so the React frontend can talk to it
- initializes the Firestore database connection
- registers blueprints that define actual HTTP routes

Keeping app.py focused on high-level wiring makes it easier to
understand the big picture of how the backend is structured.
"""

from typing import Any

from flask import Flask
from flask_cors import CORS

# These imports are written without leading dots so that the file can be
# run directly as "python app.py" from inside the backend-flask folder.
from database import init_firestore
from routes.health import health_bp
from routes.organizers import organizers_bp
from routes.payments import payments_bp
from routes.tickets import tickets_bp
from routes.contact import contact_bp


def create_app() -> Flask:
    """Create and configure the Flask application instance.

    This is called once when the backend process starts. It sets up
    extensions (like CORS and Firestore) and registers all blueprints
    that provide HTTP endpoints.
    """

    # Create the core Flask app object. "__name__" tells Flask where to
    # look for templates and static files if we ever add them.
    app = Flask(__name__)

    # Ensure INFO-level logs are visible for route/business events.
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    app.logger.setLevel(logging.INFO)

    # Allow the React frontend (running on a different port like 5173)
    # to make requests to this backend.
    CORS(app)

    # Initialize the Firestore database connection once at startup so
    # route handlers can safely import and use "db" from database.py.
    init_firestore()

    # Register all blueprints that define API routes.
    app.register_blueprint(health_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(tickets_bp)
    app.register_blueprint(organizers_bp)
    app.register_blueprint(contact_bp)

    return app


# When running "python app.py" directly, create the app and start the
# development server. In production (for example with gunicorn or a
# cloud provider), the WSGI server would import "create_app" instead.
if __name__ == "__main__":  # pragma: no cover - manual run path
    flask_app: Any = create_app()
    flask_app.run(host="0.0.0.0", port=5000, debug=True)

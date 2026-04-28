"""Firestore database integration for the B-raise backend.

This module is responsible for connecting to Google Firestore using the
firebase-admin SDK. All other parts of the backend import the shared
"db" object from here to read and write ticket data.

Having database code in a separate file keeps the rest of the backend
focused on business logic (endpoints, notifications, etc.).
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

# These imports are only available when firebase-admin is installed and
# correctly configured in the environment. We handle failures gracefully
# so the backend can still start and return helpful error messages.
try:  # pragma: no cover - import-time failure path is best-effort
    import firebase_admin
    from firebase_admin import credentials, firestore
except Exception as exc:  # firebase_admin not installed or similar
    firebase_admin = None  # type: ignore[assignment]
    credentials = None  # type: ignore[assignment]
    firestore = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)

# These globals hold the initialized Firebase app and Firestore client.
# They are set once by init_firestore() and then reused by the rest of
# the backend.
firebase_app: Optional[firebase_admin.App] = None  # type: ignore[valid-type]
db: Optional[firestore.Client] = None  # type: ignore[valid-type]


def init_firestore() -> None:
    """Initialize the global Firestore client if possible.

    This function is safe to call multiple times; initialization will only
    happen once. If the environment is not configured correctly, it will
    log an error and leave "db" as None. Route handlers can then detect
    that the database is unavailable and respond with a clear error.

    Configuration options:
    - GOOGLE_APPLICATION_CREDENTIALS: path to a Firebase service account
      JSON file. If set and the file exists, it is used to authenticate.
    - Otherwise, firebase_admin will fall back to its default application
      credentials mechanism (useful when running on Google Cloud).
    """

    global firebase_app, db

    # If we already have an initialized client, do nothing.
    if db is not None and firebase_app is not None:
        return

    if firebase_admin is None or credentials is None or firestore is None:
        logger.warning(
            "firebase_admin is not available; ticket database is disabled."
        )
        return

    try:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if cred_path and Path(cred_path).exists():
            # Use explicit service account JSON credentials.
            cred = credentials.Certificate(cred_path)
            firebase_app = firebase_admin.initialize_app(cred)
        else:
            # Fall back to firebase_admin's default credentials lookup.
            firebase_app = firebase_admin.initialize_app()

        # Create a Firestore client from the initialized Firebase app.
        db = firestore.client()
        logger.info("Connected to Firestore for tickets backend")

    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("Could not initialize Firestore: %s", exc)
        firebase_app = None
        db = None

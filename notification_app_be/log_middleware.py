"""
log_middleware.py
=================
Python wrapper for the Affordmed Logging Middleware.

Mirrors the TypeScript logging_middleware/index.ts interface — exposes the
same Log(stack, level, package, message) signature so backend Python code
uses identical logging semantics to the frontend TypeScript code.

All logs are POSTed to the Affordmed Log API. This module never raises
exceptions — a logging failure must never crash the calling application.

Usage:
    from log_middleware import Log

    Log("backend", "info", "service", "Fetching notifications")
    Log("backend", "error", "handler", "Received string, expected bool")
    Log("backend", "fatal", "db", "Critical database connection failure")

Environment variables:
    LOG_ACCESS_TOKEN   Bearer token from /evaluation-service/auth
    LOG_API_URL        Defaults to http://20.207.122.201/evaluation-service/logs
"""

import os
import sys
from typing import Optional

import requests


VALID_STACKS = {"backend", "frontend"}

VALID_LEVELS = {"debug", "info", "warn", "error", "fatal"}

VALID_BACKEND_PACKAGES = {
    "cache", "controller", "cron_job", "db", "domain",
    "handler", "repository", "route", "service",
}

VALID_FRONTEND_PACKAGES = {
    "api", "component", "hook", "page", "state", "style",
}

VALID_SHARED_PACKAGES = {"auth", "config", "middleware", "utils"}

VALID_PACKAGES = VALID_BACKEND_PACKAGES | VALID_FRONTEND_PACKAGES | VALID_SHARED_PACKAGES



LOG_API_URL = os.getenv(
    "LOG_API_URL",
    "http://20.207.122.201/evaluation-service/logs",
)
LOG_ACCESS_TOKEN = os.getenv("LOG_ACCESS_TOKEN", "")


if not LOG_ACCESS_TOKEN:
    sys.stderr.write(
        "[LogMiddleware] WARNING: LOG_ACCESS_TOKEN is not set. "
        "Log API calls will fail authentication.\n"
    )

def _validate(stack: str, level: str, package: str, message: str) -> Optional[str]:
    """Returns an error string if invalid, else None."""
    if stack not in VALID_STACKS:
        return f"Invalid stack '{stack}'. Must be one of: {sorted(VALID_STACKS)}"
    if level not in VALID_LEVELS:
        return f"Invalid level '{level}'. Must be one of: {sorted(VALID_LEVELS)}"
    if package not in VALID_PACKAGES:
        return f"Invalid package '{package}'. Must be one of: {sorted(VALID_PACKAGES)}"
    if stack == "backend" and package in VALID_FRONTEND_PACKAGES:
        return f"Package '{package}' is frontend-only, cannot use with stack 'backend'."
    if stack == "frontend" and package in VALID_BACKEND_PACKAGES:
        return f"Package '{package}' is backend-only, cannot use with stack 'frontend'."
    if not message or not message.strip():
        return "Message must not be empty."
    return None



def Log(stack: str, level: str, package: str, message: str) -> Optional[str]:
    """
    Post a structured log entry to the Affordmed Test Server.

    Parameters
    ----------
    stack   : "backend" | "frontend"
    level   : "debug" | "info" | "warn" | "error" | "fatal"
    package : see VALID_*_PACKAGES above
    message : descriptive log message

    Returns
    -------
    logID string on success, None on any failure.
    Never raises an exception.
    """

    error = _validate(stack, level, package, message)
    if error:
        sys.stderr.write(f"[LogMiddleware] Validation error: {error}\n")
        return None

    payload = {
        "stack": stack,
        "level": level,
        "package": package,
        "message": message,
    }

    try:
        response = requests.post(
            LOG_API_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {LOG_ACCESS_TOKEN}",
            },
            timeout=5,
        )

        if not response.ok:
            sys.stderr.write(
                f"[LogMiddleware] Log API responded {response.status_code}: "
                f"{response.text[:200]}\n"
            )
            return None

        data = response.json()
        return data.get("logID")

    except requests.exceptions.RequestException as exc:
  
        sys.stderr.write(f"[LogMiddleware] Failed to reach log API: {exc}\n")
        return None

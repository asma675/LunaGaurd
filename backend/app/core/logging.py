"""
LunaGuard structured logging configuration using structlog.

Call configure_logging() once at application startup.
"""

from __future__ import annotations

import logging
import os
import sys

import structlog


def configure_logging(log_level: str = "info") -> None:
    """Configure structlog for LunaGuard.

    Uses ConsoleRenderer in development (pretty, coloured) and
    JSONRenderer in other environments.

    Parameters
    ----------
    log_level:
        Standard Python log level string
        (debug/info/warning/error/critical).
    """
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Choose renderer based on environment
    renderer = (
        structlog.dev.ConsoleRenderer()
        if _is_dev()
        else structlog.processors.JSONRenderer()
    )

    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Also configure standard Python logging at the same level
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
        force=True,
    )


def _is_dev() -> bool:
    """Return True when running in a development environment."""
    return (
        os.getenv("LUNAGUARD_ENV", "development").lower()
        == "development"
    )
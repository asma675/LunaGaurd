"""Minimal persistent authentication service for the LunaGuard demo.

The service deliberately avoids third-party auth state libraries so the demo is
portable. Passwords are PBKDF2-HMAC-SHA256 hashed with per-user salts and
sessions use random bearer tokens whose SHA-256 digests are stored in SQLite.
Google sign-in is optional and verified against Google's tokeninfo endpoint when
GOOGLE_CLIENT_ID is configured.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx

ITERATIONS = 210_000
SESSION_DAYS = 7


@dataclass
class AuthUser:
    id: int
    email: str
    name: str
    provider: str
    avatar_url: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "provider": self.provider,
            "avatar_url": self.avatar_url,
        }


class AuthService:
    def __init__(self) -> None:
        db_path = Path(os.getenv("LUNAGUARD_AUTH_DB", str(Path.cwd() / "runtime" / "lunaguard_auth.db")))
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    password_hash TEXT,
                    avatar_url TEXT,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    expires_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );
                """
            )

    @staticmethod
    def _hash_password(password: str, salt: bytes | None = None) -> str:
        salt = salt or secrets.token_bytes(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
        return f"pbkdf2_sha256${ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"

    @staticmethod
    def _verify_password(password: str, encoded: str) -> bool:
        try:
            _, iterations, salt_b64, digest_b64 = encoded.split("$", 3)
            salt = base64.b64decode(salt_b64)
            expected = base64.b64decode(digest_b64)
            actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iterations))
            return hmac.compare_digest(actual, expected)
        except Exception:
            return False

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def _make_session(self, user_id: int) -> str:
        token = secrets.token_urlsafe(40)
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=SESSION_DAYS)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (self._token_hash(token), user_id, expires.isoformat(), now.isoformat()),
            )
        return token

    def register(self, email: str, name: str, password: str) -> tuple[AuthUser, str]:
        email = email.strip().lower()
        name = name.strip()
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if not email or "@" not in email:
            raise ValueError("Enter a valid email address.")
        if not name:
            raise ValueError("Name is required.")
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            try:
                cur = conn.execute(
                    "INSERT INTO users(email, name, provider, password_hash, created_at) VALUES (?, ?, 'local', ?, ?)",
                    (email, name, self._hash_password(password), now),
                )
            except sqlite3.IntegrityError as exc:
                raise ValueError("An account with that email already exists.") from exc
            user_id = int(cur.lastrowid)
        user = AuthUser(id=user_id, email=email, name=name, provider="local")
        return user, self._make_session(user_id)

    def login(self, email: str, password: str) -> tuple[AuthUser, str]:
        email = email.strip().lower()
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row or not row["password_hash"] or not self._verify_password(password, row["password_hash"]):
            raise ValueError("Invalid email or password.")
        user = self._row_to_user(row)
        return user, self._make_session(user.id)

    def get_user(self, token: str) -> AuthUser | None:
        now = datetime.now(timezone.utc)
        token_hash = self._token_hash(token)
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT users.* , sessions.expires_at AS session_expires_at
                FROM sessions JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ?
                """,
                (token_hash,),
            ).fetchone()
            if not row:
                return None
            expires = datetime.fromisoformat(row["session_expires_at"])
            if expires <= now:
                conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
                return None
        return self._row_to_user(row)

    def logout(self, token: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (self._token_hash(token),))

    async def google_login(self, credential: str, google_client_id: str) -> tuple[AuthUser, str]:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
            )
            response.raise_for_status()
            payload = response.json()
        if payload.get("aud") != google_client_id:
            raise ValueError("Google credential audience does not match this LunaGuard deployment.")
        if payload.get("email_verified") not in (True, "true"):
            raise ValueError("Google account email is not verified.")
        email = str(payload.get("email", "")).strip().lower()
        name = str(payload.get("name") or email.split("@")[0] or "LunaGuard Operator")
        avatar = payload.get("picture")
        if not email:
            raise ValueError("Google did not return an email address.")
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
            if row:
                conn.execute(
                    "UPDATE users SET name = ?, provider = 'google', avatar_url = ? WHERE id = ?",
                    (name, avatar, row["id"]),
                )
                user_id = int(row["id"])
            else:
                cur = conn.execute(
                    "INSERT INTO users(email, name, provider, avatar_url, created_at) VALUES (?, ?, 'google', ?, ?)",
                    (email, name, avatar, now),
                )
                user_id = int(cur.lastrowid)
        user = AuthUser(id=user_id, email=email, name=name, provider="google", avatar_url=avatar)
        return user, self._make_session(user_id)

    @staticmethod
    def _row_to_user(row: sqlite3.Row) -> AuthUser:
        return AuthUser(
            id=int(row["id"]),
            email=str(row["email"]),
            name=str(row["name"]),
            provider=str(row["provider"]),
            avatar_url=row["avatar_url"],
        )


_auth_service: AuthService | None = None


def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service

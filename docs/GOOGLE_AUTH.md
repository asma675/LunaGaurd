# Optional Google Sign-In Setup

LunaGuard always supports local prototype accounts. Google login is optional.

## 1. Create a Google OAuth Web client

In Google Cloud Console, create an OAuth 2.0 **Web application** client.

For local development, add:

```text
http://localhost:3000
```

as an authorized JavaScript origin.

## 2. Configure LunaGuard

Copy `.env.example` to `.env` and set:

```env
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
```

Do not put a client secret in the frontend. Google Identity Services returns an ID credential; the FastAPI backend verifies that credential and checks its audience against `GOOGLE_CLIENT_ID`.

## 3. Rebuild

```powershell
docker compose down
docker compose up -d --build
```

Open `http://localhost:3000/login`. If configuration is detected, the Google Identity Services button is rendered.

## Prototype security note

This is hackathon-grade authentication. For production, use a managed OIDC/OAuth stack with hardened sessions, secure cookies, MFA, RBAC, rate limiting, account lifecycle management, and formal security review.

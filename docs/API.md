# LunaGuard API

Base URL in the Docker demo: `http://localhost:8000`.

Interactive OpenAPI documentation: `/docs`.

## Health

### `GET /health`
Returns backend health and version.

## Terrain

### `GET /api/terrain/metadata`
Returns terrain metadata.

### `GET /api/terrain/sample`
Returns the terrain arrays consumed by the frontend API adapter.

The current demo terrain is synthetic and deterministic.

## Route planning

### `POST /api/routes/plan`
Computes the multi-profile route plan.

Frontend `MissionRequest` values are normalized by `frontend/lib/api.ts` into the backend wire format.

### `POST /api/routes/reassess`
Reassesses the active route from the rover's current position after an emergency event and returns original-vs-recovery evidence plus a recommendation.

### `POST /api/routes/replan`
Lower-level replanning route supported by the backend.

## Reports

### `POST /api/mission/report`
Creates mission-report data from route evidence.

## IBM AI

### `GET /api/ai/status`
Returns:
- provider (`IBM watsonx.ai`),
- configured model ID,
- whether live watsonx is enabled,
- fallback/watsonx mode,
- deterministic guardrails.

### `POST /api/ai/brief`
Narrates a route's deterministic evidence with IBM Granite when configured. Returns `source = watsonx-granite` or `deterministic-fallback`.

### `GET /api/ai/sources`
Returns the Copilot source catalog. Static authoritative source descriptors are always available; best-effort live NASA DONKI / CSA CKAN records can be added at request time.

### `POST /api/ai/copilot`
Body:

```json
{
  "question": "Why does slope matter for this rover?",
  "mission_context": {
    "selected_profile": "SAFEST"
  }
}
```

Returns:
- provider and model ID,
- answer source (`watsonx-granite` or `deterministic-fallback`),
- answer,
- structured citation/source records,
- guardrails.

The model is instructed to use only supplied source/mission context, distinguish evidence from inference, and avoid invented telemetry or numerical safety claims.

## Authentication

### `GET /api/auth/config`
Returns whether optional Google sign-in is configured and the public Google Web client ID.

### `POST /api/auth/register`

```json
{
  "email": "operator@example.com",
  "name": "Mission Operator",
  "password": "at-least-8-characters"
}
```

Returns `{ "user": ..., "token": ... }`.

### `POST /api/auth/login`
Returns a local user + bearer token for valid credentials.

### `POST /api/auth/google`
Accepts a Google Identity Services ID credential. Enabled only when `GOOGLE_CLIENT_ID` is configured.

### `GET /api/auth/me`
Requires:

```text
Authorization: Bearer <token>
```

Returns the current user.

### `POST /api/auth/logout`
Invalidates the supplied bearer session.

## Deployment notes

CORS origins are configurable. Do not expose the prototype directly to the public Internet without production authentication/session hardening, TLS, rate limiting, persistent audit infrastructure, and secrets management.

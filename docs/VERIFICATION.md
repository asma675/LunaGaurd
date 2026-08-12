# LunaGuard Verification Snapshot

## Base hardening baseline

Before the multi-page competition expansion, the judge-ready backend baseline recorded:

- backend pytest: **50 passed, 4 skipped**,
- backend health / route / AI-brief smoke workflow: **PASS**,
- Docker health-check and API-contract fixes verified in the earlier hardening pass.

## Competition-expansion checks performed

For the expanded source tree:

- Python source compilation / AST parse: **PASS**
- TypeScript / TSX syntax parse across frontend source: **PASS**
- frontend local `@/...` import-resolution audit: **PASS**
- secret scan: no `.env`, private key, SQLite auth database, or credential file is intended for the release archive
- release packaging excludes `node_modules`, `.next`, `__pycache__`, `.pyc`, and local runtime data

The new smoke script, `scripts/verify_demo.py`, now checks a running stack for:

- backend health,
- IBM AI status,
- auth configuration,
- NASA/CSA source catalog,
- Mission Copilot response + citations,
- three-profile route planning,
- mission brief generation.

Run it after Docker starts:

```powershell
python scripts/verify_demo.py
```

## Frontend production-build note

The repository is configured for a Node 20 Docker build and GitHub CI. In the artifact-preparation sandbox, `npm install` did not complete within the available package-install window, so the expanded frontend could not be dependency-backed production-built there. The source was still syntax-checked and local imports were resolved.

**Before submitting to judges, run this on the actual Windows/Docker machine:**

```powershell
docker compose up -d --build
docker compose ps
python scripts/verify_demo.py
```

Then click through Dashboard, Mission Planner, Copilot, Digital Twin, Timeline, Globe, Data Sources, and Login once before recording.

## Production boundary

LunaGuard is a **production-style proof of concept**, not flight software. The route terrain is deterministic synthetic data and globe layers are generated visual proxies. Real mission use requires validated terrain ingestion, mission-specific rover calibration/dynamics, uncertainty modeling, independent verification, operational identity/security controls, persistent mission audit infrastructure, and formal mission assurance.

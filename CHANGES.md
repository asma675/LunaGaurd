# LunaGuard Judge-Ready Upgrade

## Reliability fixes
- Fixed frontend/backend terrain contract mismatch that caused `.toFixed()` client crashes.
- Added a normalization adapter for terrain, route, and emergency API payloads.
- Fixed Structlog startup configuration compatibility.
- Fixed Docker backend health check so it does not depend on `curl`.
- Fixed A* heuristic units so the heuristic matches normalized edge-cost units.
- Fixed route viability so a path exceeding a rover's slope limit is explicitly non-viable.
- Fixed emergency terrain obstruction handling so an original path crossing newly blocked cells becomes non-viable.
- Fixed emergency explanation formatting for event-specific optional fields.

## IBM AI integration
- Added `/api/ai/status` and `/api/ai/brief`.
- Added IBM watsonx.ai + Granite mission brief generation.
- Added deterministic fallback mode when watsonx credentials are unavailable.
- Added numeric guardrails: deterministic route metrics remain authoritative.

## Judge experience
- Redesigned the interface as an operator-style lunar mission console.
- Added IBM watsonx status, Mission Intelligence card, resilience test bench, and decision trace.
- Added a reproducible demo mission with three distinct, viable route profiles.
- Default emergency demo is a terrain obstruction that demonstrates actual recovery replanning.
- Added `docs/JUDGING.md` and a judge-optimized 3-minute demo script.
- Added CI workflow for backend tests and frontend build/tests.

## Final hardening
- Updated `ibm-watsonx-ai` to 1.5.4 and aligned Granite inference with the current `ModelInference` API.
- Made the operator `risk_tolerance` control functional by scaling the soft hazard penalty without relaxing hard constraints.
- Added regression tests for terrain-obstruction invalidation and reduced-mobility slope violations; backend snapshot is now 50 passed / 4 skipped.
- Added a branded Next.js error boundary instead of exposing a generic client-side exception page.
- Added `START_LUNAGUARD.cmd` / `STOP_LUNAGUARD.cmd` for one-click Windows demo startup and shutdown.
- Replaced stale testing documentation with the actual pytest/Vitest/CI layout and added `docs/VERIFICATION.md`.

## Mission-platform expansion
- Split the experience into Dashboard, Mission Planner, Mission Timeline, Digital Twin, 3D Lunar Globe, AI Mission Copilot, Data Sources, Login, and Profile pages.
- Preserved the original mission planner and emergency recovery features under `/planner`.
- Added a NASA-style browser-local decision timeline and connected planner/twin/copilot events to it.
- Added a Digital Twin Lab that plans with the real backend, injects dynamic anomalies, calls emergency reassessment, and continues viable recovery traverses to completion.
- Added an interactive canvas-based 3D lunar globe with toggleable visual-proxy mission layers and provenance disclosures.
- Added `/api/ai/sources` and `/api/ai/copilot`, combining IBM Granite on watsonx.ai with curated NASA/CSA grounding and best-effort NASA DONKI / CSA CKAN live retrieval.
- Added local account registration/login/logout with hashed passwords and hashed bearer sessions persisted in SQLite, plus optional Google Identity Services sign-in.
- Added a global operator shell, larger typography, animated starfield background, and original IBM-inspired LunaGuard mission mark.
- Added Data Sources and Responsible AI UX so synthetic terrain and globe visual proxies cannot be mistaken for raw agency data.

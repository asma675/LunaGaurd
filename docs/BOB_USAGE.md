# How IBM Bob Was Used to Build LunaGuard

IBM Bob was the **primary development environment for LunaGuard's original codebase**. The project began in Bob as a full-stack build for the August 2026 space-exploration challenge, then went through iterative debugging, validation, and judge-readiness hardening.

## 1. Ideation and architecture

Bob was used to turn the initial concept — an AI-assisted lunar rover route planner — into a concrete architecture:
- Next.js / React mission console,
- FastAPI backend,
- typed mission and terrain contracts,
- synthetic terrain service,
- weighted A* planner,
- energy/risk scoring,
- emergency reassessment,
- Docker Compose deployment.

A key architectural decision was to keep safety-relevant route calculations deterministic while using generative AI for explanation rather than for inventing numerical mission evidence.

## 2. Backend implementation

Bob generated/scaffolded the Python backend including:
- Pydantic request/response models,
- terrain generation and validation,
- 8-connected A* route planning,
- energy and risk metrics,
- emergency-event models,
- recovery route planning,
- FastAPI endpoints,
- automated pytest coverage.

The final planner uses the profiles:
- `FASTEST`
- `LOWEST_ENERGY`
- `SAFEST`

All three obey the same hard terrain and rover slope constraints.

## 3. Frontend implementation

Bob created the original Next.js/TypeScript dashboard structure and interaction model:
- mission configuration,
- rover constraints,
- terrain canvas,
- route cards,
- route comparison,
- mission start/progress simulation,
- emergency panel,
- API client.

The judge-ready hardening phase retained that architecture while strengthening the API contract adapter, error handling, IBM AI status, recovery UX, and production-style visual design.

## 4. IBM technology integration

The final implementation includes IBM watsonx.ai / Granite as a mission-intelligence layer.

The design boundary is explicit:

```text
weighted A* + energy + risk + viability = deterministic authority
IBM Granite                           = grounded operator narration
```

Granite receives computed route evidence only. Unsupported numeric claims cause the LLM output to be rejected and a deterministic fallback brief to be shown.

## 5. Debugging workflow

The project was iteratively debugged across the full stack. Important classes of issues discovered during hardening included:
- frontend/backend schema drift,
- Docker build-context assumptions,
- health-check dependencies,
- structured-logging configuration,
- emergency event contract mismatches,
- slope-constraint viability during reassessment,
- terrain obstruction handling,
- A* heuristic unit consistency.

This is representative of how an AI-assisted development environment is used beyond initial code generation: inspect, run, diagnose, patch, test, and document.

## 6. Testing and validation

Bob-generated tests formed the foundation of the backend validation suite. The final judge-ready code also validates:
- terrain dimensions and finite values,
- energy calculations,
- route hard constraints,
- profile behavior,
- emergency semantics,
- FastAPI endpoints,
- AI status/brief endpoints.

The repository includes GitHub Actions CI for backend tests plus frontend tests/build.

## 7. Documentation and submission preparation

Bob was used for the original project documentation and deployment configuration. The final repository contains:
- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/ALGORITHM.md`
- `docs/API.md`
- `docs/RESPONSIBLE_AI.md`
- `docs/ASSUMPTIONS.md`
- `docs/DEMO_SCRIPT.md`
- `docs/JUDGING.md`
- `docs/SUBMISSION.md`

Together these make the codebase easier for judges to run, understand, and evaluate against the challenge criteria.

## 8. What to show a judge

If asked “How was IBM Bob used?”, show:
1. this file,
2. the full-stack repository structure,
3. the working mission console,
4. the API docs,
5. the automated tests/CI,
6. the iterative architecture from deterministic planning to guarded Granite explanation.

The strongest story is not simply “Bob wrote code.” It is that Bob served as the primary AI-assisted development environment for turning a space-operations concept into a runnable, testable, documented prototype.

## 9. Multi-page mission-platform expansion

The competition-ready iteration extends the original Bob-built planner into a modular mission platform while preserving the original planning and recovery workflow. The additional implementation includes:

- a global multi-page mission-operations shell,
- Mission Timeline audit UX,
- Digital Twin end-to-end failure/recovery simulation,
- an interactive 3D lunar globe visualization,
- NASA / Canadian Space Agency source-grounded Mission Copilot,
- visible watsonx / Granite status and citations,
- prototype local authentication and optional Google sign-in,
- larger accessible typography and an animated space visual system,
- an original LunaGuard blue/cyan mission mark.

For submission evidence, include screenshots or short screen recordings of the actual IBM Bob workspace/history used during development. The repository documentation is supporting evidence; it should not replace truthful first-hand project-development evidence.

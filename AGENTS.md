# AGENTS.md — LunaGuard Persistent Project Instructions

> **For IBM Bob and any AI coding assistant working in this repository.**
> Read this file fully before making any change. These rules are non-negotiable.

---

## 1. Project Overview

LunaGuard is an Explainable AI Lunar Rover Route Planner and Emergency Recovery
Copilot, built for the August IBM Bob AI Builders Challenge under the
"Advance Space Exploration with AI" theme.

- **Backend**: Python 3.12, FastAPI, Pydantic v2, numpy/scipy terrain engine
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **AI layer**: IBM watsonx / Granite-3 8B Instruct (optional, graceful offline degradation)
- **Grid**: 100 × 100 cells, 100 m/cell → 10 km × 10 km synthetic lunar south-pole region

---

## 2. Architecture Rules

1. **No fake data.** Every number returned by the API must be computed from the
   terrain grid and rover parameters, or clearly marked as synthetic/demo.
2. **All scores must be computed.** `risk_score`, `mission_success_score`, and
   `cumulative_hazard` are formula-based. Do not hardcode any score value.
3. **Synthetic terrain is always labelled.** `TerrainMetadata.is_synthetic` must
   be `True`, and `data_source` must name "Synthetic deterministic terrain".
4. **Three meaningfully different routes.** FASTEST, LOWEST_ENERGY, and SAFEST
   must use genuinely different A* weight profiles. They need not follow entirely
   different paths but must differ in at least one key metric.
5. **Emergency reassessment reruns A*.** The emergency service must call
   `AStarPlanner.plan()` from the current position with updated constraints —
   never return the original route unchanged.
6. **No LLM hallucination of numbers.** If Granite narration is used, the
   response is validated against computed metrics before being returned. Any
   invented figure causes the LLM explanation to be silently dropped and the
   deterministic template used instead.

---

## 3. Safety Requirements

1. **Hard constraints are never hidden or relaxed.**
   - `max_slope_deg` from `RoverConfig` is a hard block in A* edge cost.
     Any cell whose slope exceeds this value gets `inf` cost (blocked).
   - `emergency_reserve_percent` is always respected; a route is marked
     `viable = False` if battery reserve would drop below this threshold.
2. **Warnings are surfaced.** `RouteMetrics.warnings` must list every
   constraint near-miss or violation as a human-readable string.
3. **Non-traversable cells are always blocked.** The traversability mask
   computed from slope AND crater depth must be respected by the planner.
4. **Risk is never suppressed.** Routes with `risk_score > 70` must carry
   at minimum one warning message even if technically viable.

---

## 4. Coding Conventions

### Python (backend)
- Python 3.12, fully typed with `from __future__ import annotations`
- All public functions have docstrings and type hints
- FastAPI patterns: use `Depends`, router-level prefixes, response models
- Pydantic v2: use `model_validator`, `field_validator`, `computed_field`
- Structured logging with `structlog` — no bare `print()` in service code
- File-level module docstring required on every service file
- Line length: 100 characters max
- Imports: stdlib → third-party → local, separated by blank lines

### TypeScript (frontend)
- Strict mode enabled (`"strict": true` in tsconfig)
- No `any` types — use proper interfaces / discriminated unions
- API calls via a typed client in `frontend/lib/api.ts`
- Components in `frontend/components/`, pages in `frontend/app/`
- Tailwind for styling; no inline `style={{}}` except for dynamic values

### Naming
- Python: `snake_case` for everything except class names (`PascalCase`)
- TypeScript: `camelCase` for variables/functions, `PascalCase` for components
- Files: `snake_case.py` (Python), `kebab-case.tsx` (TypeScript)

---

## 5. Testing Expectations

### Backend (pytest)
- Every service function must have at least one test
- Test file mirrors the service file name: `test_terrain.py` tests `terrain_service.py`
- Fixtures live in `tests/conftest.py`
- Use `pytest-asyncio` for async endpoint tests via `httpx.AsyncClient`
- Pass threshold: all tests must pass with `pytest -q`; zero failures allowed

### Frontend (vitest / jest)
- Every API util function tested
- Component snapshot tests for critical UI (RouteMap, MetricsPanel)
- Run with `npm test` or `pnpm test`

---

## 6. Definition of Done

A feature or fix is complete ONLY when ALL of the following are true:

- [ ] All new/changed logic is covered by tests
- [ ] `pytest -q backend/tests/` passes with zero failures
- [ ] No new `mypy` or `ruff` errors introduced
- [ ] API response models match `RouteMetrics`/`RecoveryResult` schemas exactly
- [ ] `AGENTS.md` updated if architecture changes
- [ ] No secret or credential appears in any committed file
- [ ] All synthetic data is labelled; no claim of real NASA data

---

## 7. Skill: lunaguard-mission-review

This inline skill is automatically applied when reviewing any LunaGuard code or
output. Check for ALL of the following:

### 7.1 Calculation Integrity
- [ ] Are `risk_score` and `mission_success_score` computed from the documented
      formulae, not hardcoded?
- [ ] Is `energy_consumed_wh` traced to `compute_route_energy()` with the
      safety margin (×1.1)?
- [ ] Does `battery_reserve_percent` = `battery_remaining_wh / battery_capacity_wh × 100`?
- [ ] Does `mission_success_score` = `100 - risk_score + bonus_reserve`?

### 7.2 Hard Constraints
- [ ] Is `max_slope_deg` enforced with `inf` cost in `_edge_cost()`?
- [ ] Is `emergency_reserve_percent` checked when setting `viable`?
- [ ] Are non-traversable cells correctly blocked (not just penalised)?

### 7.3 Traceability
- [ ] Does every `explanation_evidence` dict field link to a computed metric?
- [ ] Is `calculation_time_ms` a real elapsed time, not a constant?
- [ ] Are `warnings` strings that reference the actual threshold and measured value?

### 7.4 Emergency Recovery
- [ ] Does `EmergencyService.reassess_route()` call `AStarPlanner.plan()`?
- [ ] Is the recovery route planned from `current_position`, not `start`?
- [ ] Are all delta fields (`risk_reduction`, `battery_reserve_change`, etc.)
      computed as `recovery - original`, not hardcoded?

### 7.5 Fabrication Checks
- [ ] No route metric value is a magic constant in the codebase
- [ ] Granite narration is validated against computed values before use
- [ ] `is_synthetic = True` is set on all generated terrain

### 7.6 Testing
- [ ] Does each new service function have a corresponding test?
- [ ] Do tests use fixtures, not hardcoded paths that may be blocked by terrain?

### 7.7 Security & Secrets
- [ ] No API key, token, or password in any committed file
- [ ] `.env` is in `.gitignore`; only `.env.example` is committed

### 7.8 Documentation
- [ ] Formulae are commented inline in `energy_model.py` and `route_planner.py`
- [ ] `DATA_SOURCES.md` explicitly labels demo terrain as synthetic
- [ ] `README.md` installation steps are accurate and tested

---

## 8. Quick-Start Reference

```bash
# Backend
cd lunaguard/backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Run tests
pytest tests/ -q

# Frontend
cd lunaguard/frontend
pnpm install
pnpm dev
```

API docs: http://localhost:8000/docs  
Health:   http://localhost:8000/health

---

*Last updated: 2025 — LunaGuard v1.0.0*

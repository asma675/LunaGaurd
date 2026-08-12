# LunaGuard Testing Strategy

LunaGuard tests the parts of the prototype that can change a mission decision: terrain integrity, hard constraints, route search, energy and risk metrics, emergency recovery, API contracts, and the primary frontend route cards/configuration.

## Backend test suite

Located in `backend/tests/`.

| File | What it verifies |
|---|---|
| `test_terrain.py` | deterministic grid dimensions, provenance labels, layer validity, traversability |
| `test_route_planner.py` | weighted A*, profile differentiation, hard slope/traversability constraints, heuristic behavior, operator risk-tolerance scaling |
| `test_energy_model.py` | edge and route energy, battery reserve, hard viability checks, reduced-slope regression |
| `test_emergency.py` | battery/mobility/terrain events, recovery from current rover position, obstruction invalidation, explanations |
| `test_api.py` | health, terrain, route planning, recovery, mission report, IBM watsonx/Granite status and brief endpoints |

### Run

```bash
cd backend
python -m pip install -r requirements.txt
pytest -q
```

For a focused module:

```bash
pytest -q tests/test_route_planner.py
pytest -q tests/test_emergency.py
pytest -q tests/test_api.py
```

## Frontend test suite

Located in `frontend/tests/` and run with Vitest + Testing Library.

- `mission-config.test.ts` validates default/demo rover constraints and mission configuration.
- `route-card.test.tsx` validates viable/non-viable states, recommendation badges, profile labels, and mission-success display.

### Run

```bash
cd frontend
npm install --legacy-peer-deps
npm test
npm run build
```

`npm run build` is intentionally part of verification because Next.js performs TypeScript validation and production bundling there.

## End-to-end demo verification

With the Docker stack running:

```bash
docker compose up -d --build
python scripts/verify_demo.py
```

The script checks:
1. backend health,
2. IBM AI runtime status,
3. planning for the deterministic judge demo mission,
4. three viable route profiles,
5. mission-intelligence brief generation (Granite when configured, deterministic fallback otherwise).

Manual browser verification should then cover:

```text
Load Demo
→ Calculate Routes
→ compare FASTEST / LOWEST_ENERGY / SAFEST
→ Start Mission
→ inject Terrain blocked
→ verify recovery recommendation and route redraw
```

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests:

- Python 3.12 → install backend dependencies → `pytest -q`
- Node 20 → install frontend dependencies → `npm test` → `npm run build`

No watsonx credentials are required for CI because the product has a deterministic fallback path.

## Safety-oriented regression principles

- **Hard constraints stay hard.** A slope violation or newly obstructed cell cannot be converted into a cosmetic warning while a route remains viable.
- **Recovery starts from the rover's current position.** It never silently replans from the original mission start.
- **Generated narration is advisory.** Deterministic route metrics remain authoritative; unsupported numeric claims from Granite are rejected.
- **Synthetic data stays labelled.** Tests verify that the demo terrain identifies itself as synthetic.

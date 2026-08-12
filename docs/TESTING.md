# LunaGuard — Testing Documentation

## Table of Contents
1. [Test Strategy](#1-test-strategy)
2. [Backend Test Suite](#2-backend-test-suite)
3. [Frontend Test Suite](#3-frontend-test-suite)
4. [Running the Tests](#4-running-the-tests)
5. [Coverage Targets](#5-coverage-targets)
6. [What the Tests Cover and Why](#6-what-the-tests-cover-and-why)
7. [CI/CD Integration](#7-cicd-integration)

---

## 1. Test Strategy

LunaGuard's testing strategy is organized around two priorities:

**Safety-critical path correctness** — The A* algorithm, energy model, and emergency replanning service produce values that directly inform mission decisions. These paths are tested with multiple parametric cases, including boundary conditions and failure modes.

**Regression prevention** — Every formula in the algorithm documentation must have at least one test that verifies a known input/output pair. This ensures that refactoring the implementation does not silently change the computed values.

### Test Levels

| Level | Backend | Frontend |
|---|---|---|
| **Unit tests** | Services tested in isolation with mocked dependencies | Pure functions, utility helpers |
| **Integration tests** | API endpoints with real service implementations | Component rendering with mocked API |
| **End-to-end** | Full planning cycle (terrain → route → report) | Not implemented (manual demo only) |

---

## 2. Backend Test Suite

Located in `backend/tests/`.

### Test Files and Categories

| File | Category | Count | What It Tests |
|---|---|---|---|
| `test_terrain.py` | Unit | ~12 tests | Terrain generation: dimensions, slope computation, crater placement, cell classification |
| `test_route_planner.py` | Unit | ~20 tests | A* correctness, profile weight differentiation, hard constraint enforcement, no-path detection |
| `test_energy_model.py` | Unit | ~15 tests | Per-edge energy calculation, slope multiplier values, surface multiplier values, total route energy |
| `test_risk_scorer.py` | Unit | ~10 tests | Risk factor computation, per-cell scoring, route-level aggregation |
| `test_emergency_service.py` | Unit | ~18 tests | Emergency weight profiles, energy viability check, replan correctness, insufficient-energy error |
| `test_explainer.py` | Unit | ~8 tests | Explanation generation, score breakdown traceability, watsonx fallback |
| `test_watsonx.py` | Unit | ~6 tests | Watsonx client with mocked HTTP, fallback on error, number validation |
| `test_api.py` | Integration | ~25 tests | All 7 endpoints: request validation, response schema, error codes, content |
| `test_planning_cycle.py` | Integration | ~8 tests | Full cycle: POST /routes → GET /routes → POST /explain → GET /report |

**Total backend tests: ~122**

### Key Test Cases

**`test_route_planner.py` — hard constraint enforcement:**
```python
def test_slope_greater_than_max_blocks_path():
    """A cell with slope > max_slope must be structurally blocked."""
    terrain = make_terrain_with_wall(slope_deg=25.0)  # wall across grid
    result = astar(terrain, start=(0,0), end=(99,99), weights=SAFE_WEIGHTS)
    assert result is None  # no path exists

def test_slope_at_max_is_blocked():
    """Slope exactly equal to max_slope should be blocked (strict >)."""
    terrain = make_single_cell_slope(slope_deg=MAX_SLOPE)
    cost = edge_cost(terrain, (0,0), (1,0), SAFE_WEIGHTS)
    assert cost == math.inf
```

**`test_emergency_service.py` — energy viability:**
```python
def test_insufficient_energy_raises_error():
    """Emergency reassessment must raise, not silently return a bad route."""
    with pytest.raises(InsufficientEnergyError) as exc_info:
        reassess(
            terrain=mock_terrain,
            current_position=(50, 50),
            destination=(99, 99),
            battery_remaining=0.05,  # only 5% battery
            emergency_type=EmergencyType.BATTERY_CRITICAL
        )
    assert exc_info.value.required_wh > exc_info.value.available_wh

def test_replan_runs_astar_from_current_position():
    """Emergency replan must start from current_position, not original start."""
    result = reassess(terrain, current_position=(30, 30), ...)
    assert result.recovery_route.waypoints[0] == GridCell(x=30, y=30)
```

**`test_energy_model.py` — formula correctness:**
```python
def test_flat_nominal_energy():
    """Cardinal move on flat nominal terrain: 0.5 Wh/m × 100 m × 1.0 × 1.0 = 50 Wh."""
    cell = make_cell(slope_deg=0.0, surface_type='nominal')
    energy = compute_edge_energy(cell_a, cell, cell_size=100.0)
    assert abs(energy - 50.0) < 0.01

def test_slope_multiplier_at_20_degrees():
    """Slope multiplier at 20° should be approximately 3.93."""
    mult = slope_multiplier(20.0)
    assert abs(mult - 3.93) < 0.05
```

---

## 3. Frontend Test Suite

Located in `frontend/src/__tests__/` and co-located `*.test.tsx` files.

### Test Files and Categories

| File | Category | Count | What It Tests |
|---|---|---|---|
| `lib/api.test.ts` | Unit | ~10 tests | API client functions: request construction, response parsing, error handling |
| `components/RouteCard.test.tsx` | Component | ~8 tests | Renders all score components, highlights selected route, handles missing metrics |
| `components/ScoreBreakdown.test.tsx` | Component | ~6 tests | Formula text displayed, correct values rendered, component weights sum to 100 |
| `components/EmergencyPanel.test.tsx` | Component | ~10 tests | Emergency type selection, submit triggers correct API call, error state display |
| `components/TerrainMap.test.tsx` | Component | ~5 tests | Canvas element rendered, overlay modes toggle, route prop change triggers redraw |
| `components/MissionDashboard.test.tsx` | Integration | ~12 tests | Full planning flow with mocked API, emergency injection state transitions |

**Total frontend tests: ~51**

### Key Test Cases

**Emergency panel test:**
```typescript
it('calls reassess API with correct emergency type when Battery Loss clicked', async () => {
  const mockReassess = jest.fn().mockResolvedValue(mockEmergencyResponse);
  render(<EmergencyPanel onReassess={mockReassess} roverPosition={{x:35, y:42}} />);
  
  fireEvent.click(screen.getByText('Battery Loss 20%'));
  fireEvent.click(screen.getByText('Reassess Route'));
  
  await waitFor(() => {
    expect(mockReassess).toHaveBeenCalledWith(
      expect.objectContaining({ emergency_type: 'battery_critical' })
    );
  });
});
```

**Score breakdown sum test:**
```typescript
it('displays score components that sum to mission success score', () => {
  render(<ScoreBreakdown components={mockComponents} totalScore={82} />);
  const contributions = screen.getAllByTestId('score-contribution');
  const sum = contributions.reduce((acc, el) => acc + parseFloat(el.textContent), 0);
  expect(Math.round(sum)).toBe(82);
});
```

---

## 4. Running the Tests

### Backend

```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate          # Windows: venv\Scripts\activate

# Run all tests
pytest tests/ -v

# Run with coverage report
pytest tests/ -v --cov=app --cov-report=term-missing

# Run specific test file
pytest tests/test_route_planner.py -v

# Run specific test
pytest tests/test_route_planner.py::test_hard_constraint_blocks_path -v

# Run only unit tests (skip integration)
pytest tests/ -v -m unit

# Run only integration tests
pytest tests/ -v -m integration

# Run with verbose output and stop on first failure
pytest tests/ -v -x

# Generate HTML coverage report
pytest tests/ --cov=app --cov-report=html
open htmlcov/index.html
```

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode (development)
npm test -- --watch

# Run specific test file
npm test -- RouteCard

# Run with verbose output
npm test -- --verbose

# Run and exit (CI mode)
CI=true npm test
```

### Both (from project root)

```bash
# Run all backend tests then frontend tests
cd backend && pytest tests/ -v; cd ../frontend && CI=true npm test
```

---

## 5. Coverage Targets

| Module | Line Coverage Target | Branch Coverage Target |
|---|---|---|
| `app/services/route_planner.py` | ≥ 90% | ≥ 85% |
| `app/services/energy_model.py` | ≥ 95% | ≥ 90% |
| `app/services/emergency.py` | ≥ 90% | ≥ 85% |
| `app/services/risk_scorer.py` | ≥ 90% | ≥ 85% |
| `app/services/terrain.py` | ≥ 80% | ≥ 70% |
| `app/routers/` | ≥ 85% | ≥ 80% |
| **Frontend components** | ≥ 75% | ≥ 70% |

The highest targets are on the energy model and route planner because errors there directly affect mission safety decisions.

---

## 6. What the Tests Cover and Why

### Hard Constraint Enforcement (Critical)
Tests verify that slope > `max_slope` produces `math.inf` cost and that no route will ever include a cell above the limit. This cannot be a soft warning — it must be structurally impossible to traverse a blocked cell.

### Energy Viability Check (Critical)
Tests verify that `InsufficientEnergyError` is raised when a route requires more energy than available. There must be no code path that returns a route with `required_energy > available_energy`.

### Formula Reproducibility (Important)
Every formula in `docs/ALGORITHM.md` has a test with a worked numerical example. If the implementation is changed, these tests will fail — requiring the developer to either fix the implementation or update the formula documentation.

### Emergency Replan From Current Position (Critical)
Tests verify that the first waypoint of an emergency recovery route is the `current_position`, not the original mission start. A bug here would direct the rover to retrace already-completed terrain.

### watsonx Fallback (Important)
Tests verify that if the watsonx API returns an error (network timeout, auth failure, quota exceeded), the response still includes a complete deterministic explanation. The planning pipeline must never depend on watsonx availability.

### Score Component Sum (Important)
Tests verify that the weighted sum of score components equals the displayed Mission Success Score. Any discrepancy would mean the display is inconsistent with the calculation.

---

## 7. CI/CD Integration

LunaGuard includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push and pull request:

```yaml
# On every push to main or PR:
jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest tests/ -v --cov=app --cov-fail-under=80

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm install --legacy-peer-deps
      - run: cd frontend && CI=true npm test -- --coverage

  docker-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
```

The CI pipeline enforces:
- Backend line coverage ≥ 80%
- All tests pass
- Docker images build successfully

No credentials are required for CI — watsonx is not tested in CI (the client's network calls are mocked).

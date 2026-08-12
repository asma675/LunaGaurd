# LunaGuard — System Architecture

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Component Map](#2-component-map)
3. [Backend Architecture](#3-backend-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Data Flow: Route Planning](#5-data-flow-route-planning)
6. [Data Flow: Emergency Replanning](#6-data-flow-emergency-replanning)
7. [A* Implementation Details](#7-a-implementation-details)
8. [Terrain Data Pipeline](#8-terrain-data-pipeline)
9. [Caching Strategy](#9-caching-strategy)
10. [Error Handling](#10-error-handling)
11. [Security Considerations](#11-security-considerations)

---

## 1. System Overview

LunaGuard is a full-stack web application composed of two independently deployable services connected by a REST API:

- **Backend** — Python 3.12 / FastAPI: terrain generation, A* route planning, energy/risk modeling, emergency replanning, explainability, optional watsonx integration
- **Frontend** — Next.js 14 / React 18: mission dashboard, terrain canvas, route display, emergency controls

Both services are containerized with Docker and orchestrated with Docker Compose.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (port 3000)                   │
│              Next.js 14 Mission Dashboard                │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP REST (JSON)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend (port 8000)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Terrain │  │  Route   │  │Emergency │  │Explain │  │
│  │ Service  │  │ Planner  │  │ Service  │  │ Layer  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│        │              │                          │       │
│        ▼              ▼                          ▼       │
│  ┌──────────┐  ┌──────────┐              ┌──────────┐   │
│  │Synthetic │  │  Energy  │              │watsonx   │   │
│  │ Terrain  │  │  Model   │              │(optional)│   │
│  │  Grid    │  │Risk Score│              └──────────┘   │
│  └──────────┘  └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Component Map

### Backend Components

| Module | File | Responsibility |
|---|---|---|
| **App Entry** | `app/main.py` | FastAPI app init, middleware, router registration |
| **Health Router** | `app/routers/health.py` | `/health` endpoint |
| **Terrain Router** | `app/routers/terrain.py` | `/terrain` endpoint |
| **Routes Router** | `app/routers/routes.py` | `/routes` CRUD endpoints |
| **Emergency Router** | `app/routers/emergency.py` | `/emergency/reassess` endpoint |
| **Mission Router** | `app/routers/mission.py` | `/mission/report/{id}` endpoint |
| **Terrain Service** | `app/services/terrain.py` | 100×100 grid generation, crater modeling |
| **Route Planner** | `app/services/route_planner.py` | A* search, 3 profile configurations |
| **Energy Model** | `app/services/energy_model.py` | Per-edge energy computation |
| **Risk Scorer** | `app/services/risk_scorer.py` | 4-factor risk score per waypoint |
| **Emergency Service** | `app/services/emergency.py` | Anomaly detection, profile adjustment, replan trigger |
| **Explainer** | `app/services/explainer.py` | Deterministic metric explanation generation |
| **watsonx Client** | `app/services/watsonx.py` | IBM watsonx API integration with fallback |
| **Pydantic Models** | `app/models/` | Request/response schemas for all endpoints |

### Frontend Components

| Component | File | Responsibility |
|---|---|---|
| **Root Layout** | `src/app/layout.tsx` | Global layout, theme provider |
| **Dashboard Page** | `src/app/page.tsx` | Main mission control view |
| **Mission Dashboard** | `src/components/MissionDashboard.tsx` | Top-level state container |
| **Terrain Map** | `src/components/TerrainMap.tsx` | Canvas-based terrain + route renderer |
| **Route Card** | `src/components/RouteCard.tsx` | Score breakdown, waypoint count, profile info |
| **Emergency Panel** | `src/components/EmergencyPanel.tsx` | Emergency type selector, rover position, replan results |
| **Score Breakdown** | `src/components/ScoreBreakdown.tsx` | Visual decomposition of Mission Success Score |
| **API Client** | `src/lib/api.ts` | Typed fetch wrappers for all backend endpoints |
| **Type Definitions** | `src/types/index.ts` | Shared TypeScript interfaces |

---

## 3. Backend Architecture

### FastAPI Application

The backend uses FastAPI with the following structure:

```
app/
├── main.py              # App factory, CORS, router include
├── routers/
│   ├── health.py        # GET /health
│   ├── terrain.py       # GET /terrain
│   ├── routes.py        # POST /routes, GET /routes/{id}
│   │                    # POST /routes/{id}/explain
│   ├── emergency.py     # POST /emergency/reassess
│   └── mission.py       # GET /mission/report/{id}
├── services/
│   ├── terrain.py
│   ├── route_planner.py
│   ├── energy_model.py
│   ├── risk_scorer.py
│   ├── emergency.py
│   ├── explainer.py
│   └── watsonx.py
└── models/
    ├── terrain.py       # TerrainGrid, TerrainCell
    ├── route.py         # RouteRequest, RouteResult, RouteProfile
    ├── emergency.py     # EmergencyRequest, EmergencyResponse
    └── mission.py       # MissionReport
```

### Dependency Injection

Terrain data is computed once at startup and cached as an application-level dependency. Route results are stored in an in-memory dictionary keyed by route ID (UUID4). Both are injected via FastAPI `Depends()` to keep service functions pure and testable.

### CORS Configuration

CORS origins are configured via the `CORS_ORIGINS` environment variable. In development this defaults to `http://localhost:3000`. In production it must be explicitly set.

---

## 4. Frontend Architecture

### Next.js App Router

The frontend uses the Next.js 14 App Router with all route computation happening on the client side (no server components for data-heavy views, to preserve canvas interactivity).

```
src/
├── app/
│   ├── layout.tsx       # Root layout with theme
│   ├── page.tsx         # / → MissionDashboard
│   └── globals.css      # Tailwind base + custom CSS variables
├── components/
│   ├── MissionDashboard.tsx   # State: terrain, routes, missionState
│   ├── TerrainMap.tsx         # useRef canvas, useEffect draw loop
│   ├── RouteCard.tsx          # Props: route, isSelected, onSelect
│   ├── EmergencyPanel.tsx     # State: emergencyType, roverPosition
│   └── ScoreBreakdown.tsx     # Props: scoreComponents
├── lib/
│   └── api.ts                 # fetchTerrain, calculateRoutes, reassess...
└── types/
    └── index.ts               # TerrainGrid, Route, EmergencyResponse...
```

### State Management

State is managed with React `useState` and `useReducer` inside `MissionDashboard`. No external state library is used — the application state is simple enough to be managed inline:

- `terrain: TerrainGrid | null`
- `routes: Route[] | null`
- `selectedRoute: Route | null`
- `missionState: 'idle' | 'planning' | 'active' | 'emergency'`
- `roverPosition: GridCell | null`
- `emergencyResult: EmergencyResponse | null`

### Canvas Rendering

`TerrainMap` uses a `useRef<HTMLCanvasElement>` and a `useEffect` that redraws on every terrain or route prop change. The 100×100 grid is rendered as a colored pixel grid where:
- Hue maps to elevation
- Overlay mode switches to slope, illumination, or hazard coloring
- Route paths are drawn as colored polylines on top
- Rover position is drawn as an animated circle

---

## 5. Data Flow: Route Planning

```
1. User clicks "Calculate Routes"
   │
   ▼
2. Frontend: POST /routes
   Body: { start: {x,y}, end: {x,y}, rover_config: {...} }
   │
   ▼
3. Backend: RoutesRouter → RouteService.calculate_routes()
   │
   ├─ 3a. TerrainService.get_terrain() → cached TerrainGrid
   │
   ├─ 3b. For each profile [safe, balanced, fast]:
   │       RoutePlanner.astar(terrain, start, end, profile_weights)
   │       → list of (x,y) waypoints
   │
   ├─ 3c. For each route:
   │       EnergyModel.compute(route, terrain) → total_energy_wh
   │       RiskScorer.score(route, terrain) → risk_score
   │       Explainer.explain(route, metrics) → explanation dict
   │
   └─ 3d. Aggregate → RouteResult (3 profiles), store by ID, return
   │
   ▼
4. Frontend: parse RouteResult, update state
   │
   ▼
5. TerrainMap re-renders: draws all 3 route overlays
6. RouteCards render: display score breakdowns
```

---

## 6. Data Flow: Emergency Replanning

```
1. Mission is active: rover at position P, battery at B%
   │
   ▼
2. User clicks emergency button (e.g., "Battery Loss 20%")
   │
   ▼
3. Frontend: POST /emergency/reassess
   Body: {
     original_route_id: "uuid",
     current_position: {x: P.x, y: P.y},
     battery_remaining: B - 20,
     emergency_type: "battery_critical",
     destination: {x: D.x, y: D.y}
   }
   │
   ▼
4. Backend: EmergencyRouter → EmergencyService.reassess()
   │
   ├─ 4a. Validate current position on terrain grid
   ├─ 4b. Compute remaining_energy = battery_remaining × capacity × 0.90
   ├─ 4c. Adjust profile weights for emergency type
   │       battery_critical → energy_weight = 0.70, slope_weight = 0.20
   ├─ 4d. RoutePlanner.astar(terrain, current_pos, destination, emergency_weights)
   ├─ 4e. EnergyModel.compute(new_route, terrain) → required_energy
   ├─ 4f. Viability check: required_energy <= remaining_energy
   ├─ 4g. If not viable: return error with reason (not a silent failure)
   └─ 4h. Explainer.explain_emergency(original, new_route, emergency_type)
          └─ Optional: WatsonxClient.generate_brief(metrics) with validation
   │
   ▼
5. Frontend: display EmergencyResult card with recovery route
6. TerrainMap: animate route update from current position
```

---

## 7. A* Implementation Details

### Grid Representation

The terrain is represented as a 2D array of `TerrainCell` objects. Each cell stores:
- `elevation`: meters above datum
- `slope`: degrees (computed from elevation gradient)
- `illumination`: 0.0–1.0 (fraction of traversal period with sunlight)
- `surface_type`: nominal / crater_interior / rim / regolith_deep

### Neighbor Expansion

8-directional movement is supported (N, NE, E, SE, S, SW, W, NW). Diagonal moves use Euclidean distance (√2 × cell_size) rather than Manhattan distance.

### Heuristic

The A* heuristic is Euclidean distance to the goal in grid units, multiplied by the minimum possible edge cost (using flat terrain and minimum distance weight). This ensures the heuristic is admissible (never overestimates) for all three profiles.

### Hard Constraints

Cells with `slope > max_slope` return `cost = math.inf`. A* will never expand through these cells. This is structurally enforced — there is no way to select a route that violates the slope constraint.

### Priority Queue

The open set uses Python's `heapq` module with `(f_score, tie_breaker, node)` tuples. The tie-breaker is a monotonically increasing counter to avoid comparison errors between nodes with equal f-scores.

---

## 8. Terrain Data Pipeline

```
TerrainService.generate()
    │
    ├─ 1. Initialize 100×100 zero elevation grid
    ├─ 2. Place 15–25 craters with Gaussian bowl model:
    │       depth = rim_height × exp(-r² / (2σ²))
    │       where r = distance from crater center
    ├─ 3. Add macro topography (low-frequency Perlin-like noise)
    ├─ 4. Compute slope grid:
    │       slope[x][y] = arctan(gradient_magnitude / cell_size)
    │       gradient computed with central differences
    ├─ 5. Compute illumination grid:
    │       base = 0.8; shadowed by local horizon angle
    ├─ 6. Classify surface type per cell
    └─ 7. Cache result as application singleton
```

The terrain is regenerated at startup. A fixed random seed (`TERRAIN_SEED`, default `42`) ensures reproducibility across restarts.

---

## 9. Caching Strategy

| Data | Cache Location | TTL |
|---|---|---|
| Terrain grid | Application singleton (`app.state.terrain`) | Process lifetime |
| Route results | In-memory dict (`app.state.routes`) | Process lifetime |
| watsonx responses | None (generated fresh per request) | — |

For production use, route results could be persisted to Redis or a database. The current in-process cache is sufficient for the hackathon demo.

---

## 10. Error Handling

All errors follow a consistent JSON structure:

```json
{
  "detail": "Human-readable error message",
  "error_code": "ROUTE_NOT_VIABLE",
  "context": { ... }
}
```

Key principles:
- **No silent viability failures** — if a route cannot be planned (no path exists, energy insufficient), the API returns a 422 with explicit reason
- **No hidden constraint relaxation** — hard slope constraints are never relaxed silently
- **watsonx failures are soft** — if the watsonx API is unavailable, the response includes a deterministic explanation instead; the mission score is never affected
- **Partial terrain failures** — if the terrain generator encounters a degenerate configuration, it returns a safe default terrain rather than crashing

---

## 11. Security Considerations

- **No secrets in frontend code** — watsonx credentials are backend-only; `NEXT_PUBLIC_*` variables contain only the API base URL and demo flags
- **No real credentials committed** — `.env` files are gitignored; `.env.example` contains only placeholder values
- **CORS enforcement** — the backend rejects requests from origins not in `CORS_ORIGINS`
- **No authentication required** — this is a prototype; production deployment would require API key authentication
- **No PII** — no user data is collected or stored
- **Input validation** — all request bodies are validated by Pydantic before reaching service code; grid coordinates are bounds-checked against terrain dimensions

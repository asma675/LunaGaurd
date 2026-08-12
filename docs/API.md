# LunaGuard — API Documentation

## Overview

| Property | Value |
|---|---|
| **Base URL (local)** | `http://localhost:8000` |
| **Interactive Docs** | `http://localhost:8000/docs` |
| **OpenAPI Schema** | `http://localhost:8000/openapi.json` |
| **Authentication** | None (prototype) |
| **Rate Limiting** | None (prototype) |
| **Content-Type** | `application/json` |

---

## Endpoints

### 1. GET `/health`

Health check for orchestration systems (Docker Compose `healthcheck`, Kubernetes liveness probe).

**Response 200:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "terrain_loaded": true,
  "watsonx_available": false
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Service is healthy |
| 503 | Service is starting up or in degraded state |

---

### 2. GET `/terrain`

Returns the full terrain grid data for visualization.

**Query Parameters:** None

**Response 200:**
```json
{
  "width": 100,
  "height": 100,
  "cell_size_m": 100,
  "seed": 42,
  "cells": [
    {
      "x": 0,
      "y": 0,
      "elevation_m": 1024.5,
      "slope_deg": 3.2,
      "illumination": 0.85,
      "surface_type": "nominal",
      "hazard_score": 0.12
    }
    // ... 9999 more cells
  ],
  "metadata": {
    "min_elevation_m": 891.0,
    "max_elevation_m": 1342.0,
    "mean_slope_deg": 7.4,
    "crater_count": 18
  }
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Terrain data returned |
| 503 | Terrain not yet generated |

---

### 3. POST `/routes`

Calculate route plans for three profiles simultaneously.

**Request Body:**
```json
{
  "start": { "x": 10, "y": 10 },
  "end": { "x": 85, "y": 80 },
  "rover_config": {
    "battery_remaining": 1.0,
    "battery_capacity_wh": 1000,
    "base_consumption_wh_per_m": 0.5,
    "max_slope_deg": 20.0,
    "safety_margin": 0.10
  }
}
```

**Response 200:**
```json
{
  "route_set_id": "3f8a1c2d-4e5b-6f7a-8b9c-0d1e2f3a4b5c",
  "routes": [
    {
      "profile": "safe",
      "waypoints": [
        {"x": 10, "y": 10},
        {"x": 10, "y": 11},
        "..."
      ],
      "metrics": {
        "total_distance_m": 4215.0,
        "total_energy_wh": 121.3,
        "max_slope_deg": 8.2,
        "risk_score": 0.18,
        "mission_success_score": 87,
        "score_components": {
          "energy_efficiency": 0.88,
          "terrain_safety": 0.82,
          "time_efficiency": 0.74,
          "route_reliability": 0.91,
          "science_value": 0.15
        }
      },
      "explanation": {
        "summary": "Route avoids all terrain above 12° slope. Energy budget used: 12.1%. No shadow zones encountered.",
        "score_breakdown": [
          {
            "component": "energy_efficiency",
            "weight": 30,
            "raw_value": 0.88,
            "contribution": 26.4,
            "formula": "1.0 - (121.3 / 900.0)"
          }
        ]
      }
    },
    { "profile": "balanced", "..." },
    { "profile": "fast", "..." }
  ],
  "recommended_profile": "safe",
  "recommendation_reason": "Highest Mission Success Score with acceptable energy budget."
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Routes calculated |
| 422 | Invalid coordinates or rover config |
| 404 | Start or end cell outside terrain bounds |
| 409 | No viable path exists for one or more profiles |

**Error Response (409):**
```json
{
  "detail": "No viable path found for 'fast' profile. All paths blocked by slope > 20°.",
  "error_code": "NO_VIABLE_PATH",
  "context": {
    "profile": "fast",
    "start": {"x": 10, "y": 10},
    "end": {"x": 85, "y": 80}
  }
}
```

---

### 4. GET `/routes/{route_set_id}`

Retrieve a previously calculated route set by ID.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `route_set_id` | UUID string | ID returned by `POST /routes` |

**Response 200:** Same schema as `POST /routes` response.

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Route set found |
| 404 | Route set not found (expired or invalid ID) |

---

### 5. POST `/routes/{route_set_id}/explain`

Generate or regenerate a natural-language explanation for a specific profile's route. If watsonx is configured, uses Granite-3-8b. Otherwise returns a deterministic template-based explanation.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `route_set_id` | UUID string | ID of the route set |

**Request Body:**
```json
{
  "profile": "balanced",
  "use_watsonx": true
}
```

**Response 200:**
```json
{
  "route_set_id": "3f8a1c2d-...",
  "profile": "balanced",
  "explanation_source": "watsonx",
  "explanation": {
    "mission_brief": "The Balanced route traverses 3,620 m in an arc that avoids the central crater field while maintaining direct communication with base. Energy consumption of 143 Wh represents 15.9% of available battery, leaving a 74.1% margin above the 10% safety reserve. The highest slope encountered is 13.5°, well below the 20° hard limit. Mission Success Score: 82/100.",
    "score_breakdown": [...]
  },
  "validation": {
    "numbers_verified": true,
    "energy_wh_matches": true,
    "score_matches": true
  }
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Explanation generated |
| 404 | Route set or profile not found |
| 422 | Invalid profile name |

---

### 6. POST `/emergency/reassess`

Trigger emergency route reassessment from the rover's current position.

**Request Body:**
```json
{
  "original_route_set_id": "3f8a1c2d-...",
  "current_position": { "x": 35, "y": 42 },
  "battery_remaining": 0.72,
  "emergency_type": "battery_critical",
  "destination": { "x": 85, "y": 80 },
  "telemetry": {
    "speed_ms": 0.0,
    "heading_deg": 145.0,
    "temperature_c": -42.0,
    "comm_signal_strength": 0.88
  }
}
```

**Emergency Type Values:**
| Value | Description | Profile Adjustment |
|---|---|---|
| `battery_critical` | Battery < 30% | Energy weight = 0.70 |
| `comm_dropout` | Communication lost | Reliability weight = 0.60 |
| `dust_storm` | Visibility/power reduced | Energy + slope priority |
| `mechanical_fault` | Wheel/actuator issue | Speed and slope restricted |

**Response 200:**
```json
{
  "emergency_id": "7a8b9c0d-...",
  "emergency_type": "battery_critical",
  "timestamp": "2025-08-15T14:32:07Z",
  "recovery_route": {
    "waypoints": [...],
    "metrics": {
      "total_distance_m": 5840.0,
      "total_energy_wh": 156.2,
      "max_slope_deg": 6.1,
      "risk_score": 0.14,
      "mission_success_score": 79
    }
  },
  "energy_analysis": {
    "available_wh": 648.0,
    "required_wh": 156.2,
    "margin_wh": 491.8,
    "margin_percent": 75.9
  },
  "explanation": {
    "summary": "Battery loss detected. Replanned from (35, 42) prioritizing minimum energy. New route extends distance by 38% but reduces energy consumption by 29% compared to original plan. Sufficient margin exists to complete traverse.",
    "weight_adjustments": "energy_weight increased from 0.35 to 0.70"
  },
  "viable": true
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Recovery route found |
| 409 | No viable route with remaining energy |
| 422 | Invalid position, invalid emergency type |
| 404 | Original route not found |

**Error Response (409 — insufficient energy):**
```json
{
  "detail": "No viable route: minimum required energy (812 Wh) exceeds available energy (648 Wh). Recommend immediate halt and await rescue.",
  "error_code": "INSUFFICIENT_ENERGY",
  "context": {
    "available_wh": 648.0,
    "minimum_required_wh": 812.0,
    "shortfall_wh": 164.0
  }
}
```

---

### 7. GET `/mission/report/{route_set_id}`

Download a complete mission report as a JSON document.

**Path Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `route_set_id` | UUID string | ID of the route set |

**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `profile` | string | `balanced` | Which profile's route to include |
| `include_terrain` | boolean | `false` | Include full terrain grid in report |

**Response 200** (`Content-Type: application/json`):
```json
{
  "report_id": "3f8a1c2d-...",
  "generated_at": "2025-08-15T14:35:00Z",
  "mission": {
    "start": {"x": 10, "y": 10},
    "end": {"x": 85, "y": 80},
    "selected_profile": "balanced"
  },
  "route": { "..." },
  "metrics": { "..." },
  "explanation": { "..." },
  "emergency_events": [],
  "terrain_metadata": { "..." },
  "software_version": "1.0.0"
}
```

**Status Codes:**
| Code | Meaning |
|---|---|
| 200 | Report generated |
| 404 | Route set not found |
| 422 | Invalid profile name |

---

## Common Error Schemas

All error responses follow this structure:

```json
{
  "detail": "Human-readable error description",
  "error_code": "MACHINE_READABLE_CODE",
  "context": {}
}
```

### Error Code Reference

| Code | HTTP Status | Description |
|---|---|---|
| `NO_VIABLE_PATH` | 409 | A* found no path through traversable terrain |
| `INSUFFICIENT_ENERGY` | 409 | Route requires more energy than available |
| `OUT_OF_BOUNDS` | 422 | Grid coordinates outside terrain dimensions |
| `INVALID_PROFILE` | 422 | Unknown profile name |
| `ROUTE_NOT_FOUND` | 404 | Route set ID not found |
| `TERRAIN_NOT_READY` | 503 | Terrain not yet generated |
| `WATSONX_UNAVAILABLE` | — | Soft error; falls back to deterministic explanation |

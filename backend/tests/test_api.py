"""
Integration tests for LunaGuard API endpoints.

Uses FastAPI TestClient (synchronous) for all endpoints.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


def test_health_endpoint(test_client: TestClient) -> None:
    """GET /health must return 200 with status=healthy."""
    response = test_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "lunaguard-backend"
    assert "version" in data


# ---------------------------------------------------------------------------
# Terrain
# ---------------------------------------------------------------------------


def test_terrain_metadata_endpoint(test_client: TestClient) -> None:
    """GET /api/terrain/metadata must return valid TerrainMetadata."""
    response = test_client.get("/api/terrain/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["grid_rows"] == 100
    assert data["grid_cols"] == 100
    assert data["cell_size_m"] == 100.0
    assert data["is_synthetic"] is True
    assert "synthetic" in data["data_source"].lower()


def test_terrain_sample_endpoint(test_client: TestClient) -> None:
    """GET /api/terrain/sample must return full grid with summary stats."""
    response = test_client.get("/api/terrain/sample")
    assert response.status_code == 200
    data = response.json()
    assert "metadata" in data
    assert "elevation" in data
    assert "slope" in data
    assert "roughness" in data
    assert "hazard" in data
    assert "traversable" in data
    assert "summary" in data
    # Grid dimensions
    assert len(data["elevation"]) == 100
    assert len(data["elevation"][0]) == 100
    # Summary must have traversability info
    assert "traversability" in data["summary"]
    assert data["summary"]["traversability"]["traversable_cells"] > 0


# ---------------------------------------------------------------------------
# Route planning
# ---------------------------------------------------------------------------


def test_route_plan_endpoint(test_client: TestClient) -> None:
    """POST /api/routes/plan must return RoutePlanResponse with 3 routes."""
    payload = {
        "start": {"row": 20, "col": 20},
        "destination": {"row": 75, "col": 78},
        "rover": {
            "battery_capacity_wh": 1000,
            "battery_percent": 95,
            "emergency_reserve_percent": 15,
            "base_energy_per_metre": 0.05,
            "max_slope_deg": 15,
            "speed_mps": 0.5,
            "risk_tolerance": 0.5,
        },
    }
    response = test_client.post("/api/routes/plan", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "routes" in data
    assert len(data["routes"]) == 3
    assert "recommended_profile" in data
    assert "terrain_metadata" in data
    # Each route has a profile, path, and metrics
    for route in data["routes"]:
        assert "profile" in route
        assert "path" in route
        assert "metrics" in route
        m = route["metrics"]
        assert "risk_score" in m
        assert "mission_success_score" in m
        assert 0 <= m["risk_score"] <= 100
        assert 0 <= m["mission_success_score"] <= 100


def test_route_plan_invalid_input(test_client: TestClient) -> None:
    """POST /api/routes/plan with out-of-bounds coords must return 422."""
    payload = {
        "start": {"row": 200, "col": 200},  # out of bounds
        "destination": {"row": 50, "col": 50},
        "rover": {},
    }
    response = test_client.post("/api/routes/plan", json=payload)
    assert response.status_code in (422, 400)


def test_route_plan_same_start_dest(test_client: TestClient) -> None:
    """POST /api/routes/plan with start == destination must return 422."""
    payload = {
        "start": {"row": 20, "col": 20},
        "destination": {"row": 20, "col": 20},
        "rover": {},
    }
    response = test_client.post("/api/routes/plan", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Emergency reassessment
# ---------------------------------------------------------------------------


def test_reassess_endpoint(test_client: TestClient) -> None:
    """POST /api/routes/reassess must return a RecoveryResult."""
    # First, plan a route
    plan_payload = {
        "start": {"row": 20, "col": 20},
        "destination": {"row": 75, "col": 78},
        "rover": {
            "battery_capacity_wh": 1000,
            "battery_percent": 95,
            "emergency_reserve_percent": 15,
            "base_energy_per_metre": 0.05,
            "max_slope_deg": 15,
            "speed_mps": 0.5,
            "risk_tolerance": 0.5,
        },
    }
    plan_resp = test_client.post("/api/routes/plan", json=plan_payload)
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()

    # Find a viable route
    active_route = None
    for route in plan_data["routes"]:
        if route["metrics"]["viable"] and len(route["path"]) > 2:
            active_route = route
            break

    if active_route is None:
        pytest.skip("No viable route found for reassessment test")

    # Pick midpoint
    path = active_route["path"]
    mid_idx = len(path) // 2
    current_pos = path[mid_idx]

    reassess_payload = {
        "original_request": plan_payload,
        "active_route": active_route,
        "current_position": current_pos,
        "emergency": {
            "type": "BATTERY_DEGRADATION",
            "battery_loss_percent": 15.0,
        },
    }
    resp = test_client.post("/api/routes/reassess", json=reassess_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "recommendation" in data
    assert data["recommendation"] in ("FOLLOW_RECOVERY_ROUTE", "CONTINUE_ORIGINAL", "ABORT")
    assert "explanation" in data
    assert len(data["explanation"]) > 10
    assert "recovery_route" in data


# ---------------------------------------------------------------------------
# Mission report
# ---------------------------------------------------------------------------


def test_report_endpoint(test_client: TestClient) -> None:
    """POST /api/mission/report must return a structured report dict."""
    # First get a plan
    plan_payload = {
        "start": {"row": 20, "col": 20},
        "destination": {"row": 40, "col": 40},
        "rover": {
            "battery_capacity_wh": 1000,
            "battery_percent": 95,
            "emergency_reserve_percent": 15,
            "base_energy_per_metre": 0.05,
            "max_slope_deg": 15,
            "speed_mps": 0.5,
            "risk_tolerance": 0.5,
        },
    }
    plan_resp = test_client.post("/api/routes/plan", json=plan_payload)
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()

    report_payload = {"plan": plan_data}
    resp = test_client.post("/api/mission/report", json=report_payload)
    assert resp.status_code == 200
    report = resp.json()
    assert "report_version" in report
    assert "generated_at" in report
    assert "route_analyses" in report
    assert "terrain" in report
    assert report["terrain"]["is_synthetic"] is True
    assert len(report["route_analyses"]) == 3

# ---------------------------------------------------------------------------
# IBM watsonx / Granite integration
# ---------------------------------------------------------------------------


def test_ai_status_endpoint(test_client: TestClient) -> None:
    """AI status is observable without exposing secrets."""
    response = test_client.get("/api/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "IBM watsonx.ai"
    assert data["model_id"]
    assert data["mode"] in ("watsonx", "deterministic-fallback")
    assert isinstance(data["enabled"], bool)
    assert len(data["guardrails"]) >= 3


def test_ai_brief_fallback_endpoint(test_client: TestClient) -> None:
    """Mission brief stays functional even when watsonx credentials are absent."""
    payload = {
        "mission_name": "South Pole Survey Alpha",
        "recommended_profile": "SAFEST",
        "route": {
            "profile": "SAFEST",
            "metrics": {
                "total_distance_m": 8120.0,
                "estimated_time_hours": 4.5,
                "energy_required_wh": 420.0,
                "battery_reserve_percent": 53.0,
                "max_slope_encountered_deg": 12.5,
                "avg_hazard_score": 0.22,
                "risk_score": 0.28,
                "mission_success_score": 0.77,
                "is_viable": True,
                "path_length": 83,
            },
            "warnings": [],
        },
    }
    response = test_client.post("/api/ai/brief", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["source"] in ("watsonx-granite", "deterministic-fallback")
    assert data["provider"] == "IBM watsonx.ai"
    assert len(data["brief"]) > 40
    assert "mission_success_score" in data["evidence"]

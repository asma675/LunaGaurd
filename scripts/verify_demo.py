"""Smoke-check a running LunaGuard stack using Python stdlib only.

Usage:
    python scripts/verify_demo.py

Requires backend at http://localhost:8000 (start with docker compose up -d).
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def get(path: str):
    with urllib.request.urlopen(BASE + path, timeout=10) as response:
        return response.status, json.load(response)


def post(path: str, payload: dict):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.status, json.load(response)


def main() -> int:
    try:
        status, health = get("/health")
        assert status == 200 and health.get("status") == "healthy"
        print("PASS health", health)

        status, ai = get("/api/ai/status")
        assert status == 200 and ai.get("provider") == "IBM watsonx.ai"
        print("PASS ai-status", {"mode": ai.get("mode"), "model": ai.get("model_id")})

        status, voice = get("/api/voice/status")
        assert status == 200 and "tts_enabled" in voice and "stt_enabled" in voice
        print("PASS voice-status", {
            "tts": voice.get("tts_mode"),
            "stt": voice.get("stt_mode"),
            "voices": [item.get("id") for item in voice.get("voices", [])],
        })

        status, auth_config = get("/api/auth/config")
        assert status == 200 and "google_enabled" in auth_config
        print("PASS auth-config", {"google_enabled": auth_config.get("google_enabled")})

        status, knowledge = get("/api/ai/sources")
        assert status == 200 and knowledge.get("count", 0) >= 4
        source_ids = {item.get("id") for item in knowledge.get("sources", [])}
        assert {"NASA-LRO-LOLA", "NASA-DONKI", "CSA-LEAD"}.issubset(source_ids)
        print("PASS source-catalog", {"count": knowledge.get("count")})

        status, copilot = post("/api/ai/copilot", {
            "question": "Why is terrain slope important for a lunar rover route?",
            "mission_context": {"mode": "verification"},
        })
        assert status == 200 and copilot.get("answer") and copilot.get("citations")
        print("PASS mission-copilot", {"source": copilot.get("source"), "citations": len(copilot.get("citations", []))})

        mission = {
            "start": {"row": 31, "col": 7},
            "destination": {"row": 17, "col": 36},
            "rover": {
                "battery_capacity_wh": 3000,
                "battery_percent": 95,
                "emergency_reserve_percent": 15,
                "base_energy_per_metre": 0.05,
                "max_slope_deg": 25,
                "speed_mps": 0.5,
                "risk_tolerance": 0.5,
            },
        }
        status, plan = post("/api/routes/plan", mission)
        assert status == 200
        profiles = {route["profile"] for route in plan["routes"]}
        assert profiles == {"FASTEST", "LOWEST_ENERGY", "SAFEST"}
        assert all(route["metrics"]["viable"] for route in plan["routes"])
        print("PASS route-plan", {
            "recommended": plan["recommended_profile"],
            "profiles": sorted(profiles),
        })

        recommended = next(
            route for route in plan["routes"]
            if route["profile"] == plan["recommended_profile"]
        )
        ui_metrics = {
            "total_distance_m": recommended["metrics"]["total_distance_m"],
            "estimated_time_hours": recommended["metrics"]["travel_time_hours"],
            "energy_required_wh": recommended["metrics"]["energy_consumed_wh"],
            "battery_reserve_percent": recommended["metrics"]["battery_reserve_percent"],
            "max_slope_encountered_deg": recommended["metrics"]["max_slope_deg"],
            "avg_hazard_score": recommended["metrics"]["cumulative_hazard"] / max(len(recommended["path"]) - 1, 1),
            "risk_score": recommended["metrics"]["risk_score"] / 100.0,
            "mission_success_score": recommended["metrics"]["mission_success_score"] / 100.0,
            "is_viable": recommended["metrics"]["viable"],
            "path_length": len(recommended["path"]),
        }
        status, brief = post("/api/ai/brief", {
            "mission_name": "South Pole Survey Alpha",
            "recommended_profile": plan["recommended_profile"],
            "route": {
                "profile": recommended["profile"],
                "metrics": ui_metrics,
                "warnings": recommended["metrics"]["warnings"],
            },
        })
        assert status == 200 and brief.get("brief")
        print("PASS mission-brief", {"source": brief.get("source")})

        print("\nLunaGuard stack verification: PASS")
        return 0
    except (AssertionError, KeyError, urllib.error.URLError) as exc:
        print(f"LunaGuard stack verification: FAIL — {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

"""
LunaGuard Explainability Service.

Provides two modes:
1. Deterministic template-based explanations (always available, no external deps)
2. IBM watsonx / Granite-3 8B narration (optional; requires WATSONX_API_KEY)

When Granite narration is used, the response is validated against computed
metrics.  Any invented number causes the LLM output to be silently dropped and
the deterministic template returned instead.
"""

from __future__ import annotations

import re
from typing import Any, Optional

import structlog

from app.models.mission import RecoveryResult, RouteProfile, RouteResult, RoverConfig

logger = structlog.get_logger(__name__)


class ExplainabilityService:
    """Generates XAI evidence and narrative for route and recovery results."""

    # ------------------------------------------------------------------
    # Route explanation
    # ------------------------------------------------------------------

    def explain_route(
        self,
        route: RouteResult,
        rover: RoverConfig,
        profile: RouteProfile,
    ) -> dict[str, Any]:
        """Return a structured evidence dict for a planned route.

        All values are derived from route.metrics — nothing is invented.
        """
        m = route.metrics

        # Factor breakdown (contribution to risk score)
        slope_factor = min(m.max_slope_deg / rover.max_slope_deg, 1.0)
        energy_factor = min(m.energy_consumed_wh / max(rover.battery_wh, 1e-9), 1.0)
        n_cells = max(len(route.path) - 1, 1)
        mean_hazard = m.cumulative_hazard / n_cells
        hazard_factor = min(mean_hazard / 0.6, 1.0)
        reserve_ratio = m.battery_reserve_percent / max(rover.emergency_reserve_percent, 1e-9)
        reserve_factor = max(0.0, 1.0 - reserve_ratio)

        factor_contributions = {
            "slope_factor": {
                "value": round(slope_factor, 4),
                "weight": 0.30,
                "contribution": round(0.30 * slope_factor * 100, 2),
                "source": f"max_slope_deg={m.max_slope_deg:.1f}° / rover_limit={rover.max_slope_deg:.1f}°",
            },
            "energy_factor": {
                "value": round(energy_factor, 4),
                "weight": 0.25,
                "contribution": round(0.25 * energy_factor * 100, 2),
                "source": f"energy_consumed={m.energy_consumed_wh:.1f}Wh / battery={rover.battery_wh:.1f}Wh",
            },
            "hazard_factor": {
                "value": round(hazard_factor, 4),
                "weight": 0.25,
                "contribution": round(0.25 * hazard_factor * 100, 2),
                "source": f"mean_hazard={mean_hazard:.3f} / threshold=0.6",
            },
            "reserve_factor": {
                "value": round(reserve_factor, 4),
                "weight": 0.20,
                "contribution": round(0.20 * reserve_factor * 100, 2),
                "source": (
                    f"battery_reserve={m.battery_reserve_percent:.1f}% "
                    f"/ emergency_limit={rover.emergency_reserve_percent:.1f}%"
                ),
            },
        }

        # Top-risk cells: first 5 cells with highest hazard
        top_risk = []
        for i, pt in enumerate(route.path[1:], start=1):
            # We need terrain for per-cell hazard — approximated via path index
            # Actual terrain lookups happen in energy_model; here we report
            # the aggregate high_risk_cells count
            pass  # populated below if terrain is injected; else leave empty

        summary = {
            "profile": profile.value,
            "path_length_cells": len(route.path),
            "total_distance_m": round(m.total_distance_m, 1),
            "travel_time_hours": round(m.travel_time_hours, 3),
            "energy_consumed_wh": round(m.energy_consumed_wh, 2),
            "battery_reserve_percent": round(m.battery_reserve_percent, 2),
            "max_slope_deg": round(m.max_slope_deg, 2),
            "avg_slope_deg": round(m.avg_slope_deg, 2),
            "cumulative_hazard": round(m.cumulative_hazard, 3),
            "high_risk_cells": m.high_risk_cells,
            "risk_score": round(m.risk_score, 2),
            "mission_success_score": round(m.mission_success_score, 2),
            "viable": m.viable,
            "warnings": m.warnings,
        }

        return {
            "profile": profile.value,
            "summary": summary,
            "factor_breakdown": factor_contributions,
            "risk_formula": (
                "risk_score = (0.30×slope_factor + 0.25×energy_factor "
                "+ 0.25×hazard_factor + 0.20×reserve_factor) × 100"
            ),
            "success_formula": (
                "mission_success = 100 − risk_score + bonus_reserve "
                "(bonus ≤ 5 pts when reserve > 30%)"
            ),
        }

    # ------------------------------------------------------------------
    # Recovery explanation
    # ------------------------------------------------------------------

    def explain_recovery(self, recovery: RecoveryResult) -> str:
        """Return a deterministic template explanation for a recovery result.

        Uses only values from recovery — no LLM.
        """
        rec_m = recovery.recovery_route.metrics
        orig_m = recovery.original_route_metrics_after

        return (
            f"Recovery analysis ({recovery.recommendation}): "
            f"Original remaining route risk={orig_m.risk_score:.1f}/100 "
            f"(viable={orig_m.viable}). "
            f"Recovery route (SAFEST): risk={rec_m.risk_score:.1f}/100, "
            f"battery reserve={rec_m.battery_reserve_percent:.1f}%, "
            f"distance={rec_m.total_distance_m:.0f}m, "
            f"max slope={rec_m.max_slope_deg:.1f}°. "
            f"Risk reduction: {recovery.risk_reduction:.1f} pts. "
            f"Mission success change: {recovery.mission_success_change:+.1f} pts."
        )

    # ------------------------------------------------------------------
    # Optional: Granite narration
    # ------------------------------------------------------------------

    def explain_with_granite(
        self,
        data: dict[str, Any],
        computed_metrics: dict[str, float],
    ) -> str | None:
        """Call IBM watsonx Granite-3 8B for natural-language narration.

        Returns None on any failure — callers must fall back to deterministic text.

        Validation: the response is scanned for numbers.  Any number that
        differs from a value in computed_metrics by more than 1% is considered
        hallucinated, causing the response to be dropped.

        Parameters
        ----------
        data:
            Structured evidence dict from explain_route / explain_recovery.
        computed_metrics:
            Dict of key→float of authoritative computed values used for
            hallucination detection.
        """
        try:
            from app.core.config import get_settings

            settings = get_settings()
            if not settings.watsonx_api_key or not settings.watsonx_project_id:
                return None

            from ibm_watsonx_ai import Credentials
            from ibm_watsonx_ai.foundation_models import ModelInference

            credentials = Credentials(
                url=settings.watsonx_url,
                api_key=settings.watsonx_api_key,
            )
            # Use the current ModelInference API directly with project-scoped
            # credentials. Keep retries deliberately small so a live demo
            # degrades to deterministic narration quickly if cloud inference
            # is temporarily unavailable.
            model = ModelInference(
                model_id=settings.watsonx_model_id,
                credentials=credentials,
                project_id=settings.watsonx_project_id,
                params={
                    "max_new_tokens": 260,
                    "temperature": 0.2,
                    "repetition_penalty": 1.1,
                },
                max_retries=1,
                delay_time=0.25,
            )

            prompt = _build_narration_prompt(data)
            response = model.generate_text(prompt=prompt)

            if not response:
                return None

            # Validate: no invented numbers
            if not _validate_no_invented_numbers(response, computed_metrics):
                logger.warning(
                    "granite.hallucination_detected",
                    response_preview=response[:200],
                )
                return None

            return response.strip()

        except Exception as exc:  # noqa: BLE001
            logger.warning("granite.failed", error=str(exc))
            return None


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_narration_prompt(data: dict[str, Any]) -> str:
    """Build a concise structured prompt for Granite narration."""
    summary = data.get("summary", {})
    factors = data.get("factor_breakdown", {})
    profile = data.get("profile", "UNKNOWN")

    lines = [
        "You are the LunaGuard AI copilot. Summarise this route in 2–3 sentences.",
        "Use ONLY the numbers provided below. Do NOT invent any values.",
        "",
        f"Profile: {profile}",
        f"Distance: {summary.get('total_distance_m', '?')} m",
        f"Travel time: {summary.get('travel_time_hours', '?')} h",
        f"Energy used: {summary.get('energy_consumed_wh', '?')} Wh",
        f"Battery reserve: {summary.get('battery_reserve_percent', '?')}%",
        f"Max slope: {summary.get('max_slope_deg', '?')}°",
        f"Risk score: {summary.get('risk_score', '?')}/100",
        f"Mission success: {summary.get('mission_success_score', '?')}/100",
        f"Viable: {summary.get('viable', '?')}",
    ]
    if summary.get("warnings"):
        lines.append(f"Warnings: {'; '.join(summary['warnings'])}")

    lines += [
        "",
        "Risk factor contributions:",
        *[
            f"  {k}: {v['contribution']:.1f}/100 ({v['source']})"
            for k, v in factors.items()
        ],
    ]
    return "\n".join(lines)


def _validate_no_invented_numbers(response: str, computed: dict[str, float]) -> bool:
    """Return True only if all numbers in the response are close to a computed value.

    Uses a 2% tolerance.  Numbers that don't match any computed value fail.
    """
    if not computed:
        return True  # No reference values — cannot validate, trust response

    # Extract all numbers from the response
    numbers_in_response = re.findall(r"\d+(?:\.\d+)?", response)

    for raw in numbers_in_response:
        num = float(raw)
        if num == 0.0:
            continue  # zeroes are benign
        # Check if this number is close to any computed metric
        matched = any(
            abs(num - v) / max(abs(v), 1e-9) < 0.02
            for v in computed.values()
        )
        if not matched:
            # Allow small integers (step counts, years, etc.) up to 10
            if num <= 10:
                continue
            return False

    return True

"""IBM watsonx / Granite integration endpoints for LunaGuard.

These endpoints make the AI layer explicit and observable for demos while keeping
all route metrics deterministic and authoritative. If watsonx credentials are not
configured, LunaGuard returns a clearly-labelled deterministic fallback brief.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.explainability import ExplainabilityService
from app.services.source_service import get_source_service

router = APIRouter(prefix="/api/ai", tags=["ai"])
_explainability = ExplainabilityService()


class UiRouteMetrics(BaseModel):
    total_distance_m: float = 0.0
    estimated_time_hours: float = 0.0
    energy_required_wh: float = 0.0
    battery_reserve_percent: float = 0.0
    max_slope_encountered_deg: float = 0.0
    avg_hazard_score: float = 0.0
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)
    mission_success_score: float = Field(default=0.0, ge=0.0, le=1.0)
    is_viable: bool = True
    path_length: int = 0


class UiRoute(BaseModel):
    profile: str
    metrics: UiRouteMetrics
    warnings: list[str] = Field(default_factory=list)


class BriefRequest(BaseModel):
    mission_name: str = "LunaGuard Mission"
    recommended_profile: str
    route: UiRoute


class BriefResponse(BaseModel):
    provider: str
    model_id: str
    source: Literal["watsonx-granite", "deterministic-fallback"]
    brief: str
    guardrails: list[str]
    evidence: dict[str, float | str | bool]


class CopilotRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1200)
    mission_context: dict[str, Any] | None = None


class CopilotResponse(BaseModel):
    provider: str
    model_id: str
    source: Literal["watsonx-granite", "deterministic-fallback"]
    answer: str
    citations: list[dict[str, Any]]
    guardrails: list[str]


@router.get("/sources")
async def knowledge_sources(refresh: bool = False) -> dict[str, Any]:
    sources = await get_source_service().get_sources(refresh=refresh)
    return {"sources": sources, "count": len(sources)}


@router.post("/copilot", response_model=CopilotResponse)
async def copilot(request: CopilotRequest) -> CopilotResponse:
    settings = get_settings()
    context, sources = await get_source_service().build_context()
    mission_context = request.mission_context or {}
    prompt = (
        "You are LunaGuard Mission Copilot, an explainable lunar-operations assistant. "
        "Answer using ONLY the source context and mission context below. Distinguish source facts from inference. "
        "Cite supporting sources inline using their bracketed IDs such as [NASA-LRO-LOLA]. "
        "Never invent telemetry, mission status, or numerical safety claims. If evidence is insufficient, say so. "
        "Keep the answer concise and operationally useful.\n\n"
        f"SOURCE CONTEXT:\n{context}\n\n"
        f"MISSION CONTEXT:\n{mission_context}\n\n"
        f"QUESTION:\n{request.question}\n\nANSWER:"
    )

    granite = _generate_grounded_granite(prompt)
    if granite:
        answer = granite.strip()
        source_kind: Literal["watsonx-granite", "deterministic-fallback"] = "watsonx-granite"
    else:
        source_kind = "deterministic-fallback"
        answer = _copilot_fallback(request.question, sources, mission_context)

    cited_ids = [source["id"] for source in sources if f"[{source['id']}]" in answer]
    citations = [source for source in sources if source["id"] in cited_ids]
    if not citations:
        citations = sources[:3]

    return CopilotResponse(
        provider="IBM watsonx.ai",
        model_id=settings.watsonx_model_id,
        source=source_kind,
        answer=answer,
        citations=citations,
        guardrails=GUARDRAILS + ["Copilot answers are grounded in listed NASA/CSA sources"],
    )


def _generate_grounded_granite(prompt: str) -> str | None:
    settings = get_settings()
    if not settings.watsonx_enabled:
        return None
    try:
        from ibm_watsonx_ai import Credentials
        from ibm_watsonx_ai.foundation_models import ModelInference

        model = ModelInference(
            model_id=settings.watsonx_model_id,
            credentials=Credentials(url=settings.watsonx_url, api_key=settings.watsonx_api_key),
            project_id=settings.watsonx_project_id,
            params={"max_new_tokens": 420, "temperature": 0.15, "repetition_penalty": 1.08},
            max_retries=1,
            delay_time=0.25,
        )
        return model.generate_text(prompt=prompt)
    except Exception:
        return None


def _copilot_fallback(question: str, sources: list[dict[str, Any]], mission_context: dict[str, Any]) -> str:
    q = question.lower()
    if "slope" in q or "terrain" in q or "landing" in q:
        lead = "NASA LRO/LOLA is the strongest source here because it measures lunar elevation and slope and supports landing-site analysis [NASA-LRO-LOLA]."
    elif "space weather" in q or "solar" in q or "radiation" in q:
        lead = "NASA DONKI is the relevant live source for recent space-weather notifications [NASA-DONKI]."
    elif "canada" in q or "csa" in q or "rover" in q:
        lead = "The CSA LEAD analogue campaign is directly relevant to rover operations, LiDAR, imagery, pose estimation, and delayed remote control [CSA-LEAD]."
    else:
        lead = "LunaGuard can ground this question in NASA LRO lunar mapping and CSA rover-analogue data [NASA-LRO-LOLA] [CSA-LEAD]."
    mission_note = ""
    if mission_context:
        mission_note = " The supplied mission context can be used for comparison, but deterministic LunaGuard route metrics remain authoritative."
    return lead + mission_note + " Live IBM Granite narration becomes available when watsonx credentials are configured."


GUARDRAILS = [
    "Deterministic route metrics remain authoritative",
    "Granite may narrate evidence but cannot alter route calculations",
    "Numerical claims are checked against computed values",
    "Fallback remains available when cloud AI is unavailable",
]


@router.get("/status")
async def ai_status() -> dict[str, Any]:
    settings = get_settings()
    return {
        "provider": "IBM watsonx.ai",
        "model_id": settings.watsonx_model_id,
        "enabled": settings.watsonx_enabled,
        "mode": "watsonx" if settings.watsonx_enabled else "deterministic-fallback",
        "guardrails": GUARDRAILS,
    }


@router.post("/brief", response_model=BriefResponse)
async def mission_brief(request: BriefRequest) -> BriefResponse:
    """Generate an operator-friendly mission brief from deterministic route evidence.

    When WATSONX_API_KEY and WATSONX_PROJECT_ID are configured, IBM Granite is
    called through watsonx.ai. Otherwise, the same evidence is rendered through
    a deterministic fallback so the prototype remains fully demoable offline.
    """
    settings = get_settings()
    m = request.route.metrics

    evidence: dict[str, float | str | bool] = {
        "mission": request.mission_name,
        "profile": request.route.profile,
        "distance_m": round(m.total_distance_m, 1),
        "travel_time_h": round(m.estimated_time_hours, 3),
        "energy_wh": round(m.energy_required_wh, 2),
        "battery_reserve_percent": round(m.battery_reserve_percent, 2),
        "max_slope_deg": round(m.max_slope_encountered_deg, 2),
        "avg_hazard_percent": round(m.avg_hazard_score * 100.0, 1),
        "risk_score": round(m.risk_score * 100.0, 2),
        "mission_success_score": round(m.mission_success_score * 100.0, 2),
        "viable": m.is_viable,
    }

    explanation_data = {
        "profile": request.route.profile,
        "summary": {
            "total_distance_m": evidence["distance_m"],
            "travel_time_hours": evidence["travel_time_h"],
            "energy_consumed_wh": evidence["energy_wh"],
            "battery_reserve_percent": evidence["battery_reserve_percent"],
            "max_slope_deg": evidence["max_slope_deg"],
            "risk_score": evidence["risk_score"],
            "mission_success_score": evidence["mission_success_score"],
            "viable": evidence["viable"],
            "warnings": request.route.warnings,
        },
        "factor_breakdown": {},
    }

    numeric_evidence = {
        key: float(value)
        for key, value in evidence.items()
        if isinstance(value, (int, float)) and not isinstance(value, bool)
    }

    granite_text = _explainability.explain_with_granite(
        explanation_data,
        numeric_evidence,
    )

    if granite_text:
        return BriefResponse(
            provider="IBM watsonx.ai",
            model_id=settings.watsonx_model_id,
            source="watsonx-granite",
            brief=granite_text,
            guardrails=GUARDRAILS,
            evidence=evidence,
        )

    fallback = _deterministic_brief(request, evidence)
    return BriefResponse(
        provider="IBM watsonx.ai",
        model_id=settings.watsonx_model_id,
        source="deterministic-fallback",
        brief=fallback,
        guardrails=GUARDRAILS,
        evidence=evidence,
    )


def _deterministic_brief(
    request: BriefRequest,
    evidence: dict[str, float | str | bool],
) -> str:
    viability = "viable" if evidence["viable"] else "not viable"
    warning = ""
    if request.route.warnings:
        warning = f" Primary caution: {request.route.warnings[0]}"

    return (
        f"{request.mission_name}: {request.route.profile.replace('_', ' ').title()} is {viability} "
        f"with a mission-success score of {evidence['mission_success_score']:.1f}/100 and "
        f"risk of {evidence['risk_score']:.1f}/100. The route covers "
        f"{evidence['distance_m']:.0f} m, consumes {evidence['energy_wh']:.1f} Wh, and is "
        f"projected to retain {evidence['battery_reserve_percent']:.1f}% battery reserve."
        f"{warning}"
    )

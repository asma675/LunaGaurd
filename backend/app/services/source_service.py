"""Grounding sources for the LunaGuard mission copilot.

The service combines authoritative static source metadata with best-effort live
queries to NASA DONKI and the Canadian Space Agency CKAN portal. Live requests
use short timeouts, run concurrently, and are cached for five minutes so the
demo remains responsive. Network failure never blocks route planning.
"""
from __future__ import annotations

import asyncio
import time
from datetime import date, timedelta
from typing import Any

import httpx

from app.core.config import get_settings

NASA_LRO_URL = "https://science.nasa.gov/mission/lro/science-and-data/"
NASA_LRO_DATA_URL = "https://science.nasa.gov/mission/lro/data-products/"
NASA_API_URL = "https://api.nasa.gov"
CSA_LEAD_URL = "https://data.asc-csa.gc.ca/dataset/9151430-4v0p-4t5c-468vnhj714ao64"
CSA_CKAN_URL = "https://data.asc-csa.gc.ca/api/3/action/package_search"
CACHE_SECONDS = 300.0


class SourceService:
    def __init__(self) -> None:
        self._cached_sources: list[dict[str, Any]] | None = None
        self._cached_at = 0.0

    @staticmethod
    def _static_sources() -> list[dict[str, Any]]:
        return [
            {
                "id": "NASA-LRO-LOLA",
                "agency": "NASA",
                "title": "Lunar Reconnaissance Orbiter — Science & Data",
                "url": NASA_LRO_URL,
                "kind": "lunar-topography",
                "status": "authoritative",
                "summary": (
                    "NASA LRO's LOLA instrument measures lunar surface elevation and slope; "
                    "LRO data supports landing-site selection, polar resource studies, and Artemis planning."
                ),
            },
            {
                "id": "NASA-LRO-PDS",
                "agency": "NASA",
                "title": "LRO Data Products / Planetary Data System",
                "url": NASA_LRO_DATA_URL,
                "kind": "lunar-data-catalog",
                "status": "authoritative",
                "summary": (
                    "NASA's LRO data-products page points to the Planetary Data System, LROC map products, "
                    "and QuickMap for lunar maps and topography."
                ),
            },
            {
                "id": "NASA-DONKI",
                "agency": "NASA",
                "title": "DONKI Space Weather API",
                "url": "https://api.nasa.gov/",
                "kind": "live-space-weather",
                "status": "authoritative",
                "summary": (
                    "NASA DONKI provides API access to space-weather observations and notifications including "
                    "solar flares, coronal mass ejections, geomagnetic storms, and related events."
                ),
            },
            {
                "id": "CSA-LEAD",
                "agency": "Canadian Space Agency",
                "title": "Lunar Exploration Analogue Deployment (LEAD) — Rover Data",
                "url": CSA_LEAD_URL,
                "kind": "rover-analogue",
                "status": "authoritative",
                "summary": (
                    "CSA/ESA lunar-analogue rover campaign data includes imagery, LiDAR, estimated rover pose, "
                    "and long-distance operations context from a Quebec quarry field deployment."
                ),
            },
        ]

    async def get_sources(self, *, refresh: bool = False) -> list[dict[str, Any]]:
        now = time.monotonic()
        if not refresh and self._cached_sources is not None and now - self._cached_at < CACHE_SECONDS:
            return [dict(item) for item in self._cached_sources]

        nasa_live, csa_live = await asyncio.gather(
            self._nasa_live_sources(),
            self._csa_live_sources(),
        )
        sources = self._static_sources() + nasa_live + csa_live
        self._cached_sources = sources
        self._cached_at = now
        return [dict(item) for item in sources]

    async def _nasa_live_sources(self) -> list[dict[str, Any]]:
        settings = get_settings()
        today = date.today()
        start = today - timedelta(days=7)
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0), follow_redirects=True) as client:
                response = await client.get(
                    f"{NASA_API_URL}/DONKI/notifications",
                    params={
                        "startDate": start.isoformat(),
                        "endDate": today.isoformat(),
                        "type": "all",
                        "api_key": settings.nasa_api_key,
                    },
                )
                response.raise_for_status()
                items = response.json()[:3]
        except Exception:
            return []

        out: list[dict[str, Any]] = []
        for idx, item in enumerate(items, start=1):
            message = str(item.get("message", "")).replace("\n", " ").strip()
            out.append(
                {
                    "id": f"NASA-DONKI-LIVE-{idx}",
                    "agency": "NASA",
                    "title": item.get("messageType") or "DONKI Space Weather Notification",
                    "url": item.get("messageURL") or "https://api.nasa.gov/",
                    "kind": "live-space-weather",
                    "status": "live",
                    "summary": message[:420] or "Recent NASA DONKI space-weather notification.",
                }
            )
        return out

    async def _csa_live_sources(self) -> list[dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(5.0), follow_redirects=True) as client:
                response = await client.get(CSA_CKAN_URL, params={"q": "lunar rover", "rows": 3})
                response.raise_for_status()
                results = response.json().get("result", {}).get("results", [])[:3]
        except Exception:
            return []

        out: list[dict[str, Any]] = []
        for idx, item in enumerate(results, start=1):
            out.append(
                {
                    "id": f"CSA-CKAN-LIVE-{idx}",
                    "agency": "Canadian Space Agency",
                    "title": item.get("title") or "CSA Open Data",
                    "url": f"https://data.asc-csa.gc.ca/dataset/{item.get('name', '')}",
                    "kind": "open-data-catalog",
                    "status": "live",
                    "summary": str(item.get("notes") or "CSA open-data record")[:420],
                }
            )
        return out

    async def build_context(self, max_sources: int = 8) -> tuple[str, list[dict[str, Any]]]:
        sources = (await self.get_sources())[:max_sources]
        lines = [
            f"[{source['id']}] {source['agency']} — {source['title']}: {source['summary']}"
            for source in sources
        ]
        return "\n".join(lines), sources


_source_service: SourceService | None = None


def get_source_service() -> SourceService:
    global _source_service
    if _source_service is None:
        _source_service = SourceService()
    return _source_service

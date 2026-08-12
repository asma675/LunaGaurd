# LunaGuard — Judge Evidence Map

LunaGuard is intentionally organized around the five official judging criteria: **Technical Execution, Innovation, Challenge Fit, Feasibility, and Real-World Impact**.

## 1. Technical Execution

What to inspect in the running prototype:

- **Mission Planner** calls the FastAPI backend for terrain, three weighted A* route profiles, deterministic route metrics, mission execution, and emergency reassessment.
- **Digital Twin Lab** starts with the real route-planning endpoint, streams simulated telemetry, injects a selected failure around mid-traverse, calls the real emergency-replanning endpoint, and continues the recovery traverse when viable.
- **AI Mission Copilot** calls `/api/ai/copilot`; when watsonx credentials are configured the backend uses IBM Granite through `ModelInference` on IBM watsonx.ai.
- **Grounding service** exposes NASA LRO/LOLA, NASA LRO data products, NASA DONKI, and Canadian Space Agency rover/open-data sources; live network calls degrade safely.
- **Authentication** supports locally persisted prototype users/sessions and optional Google Identity Services.
- **Docker** packages the Next.js frontend and FastAPI backend with backend health gating.

Key files:

```text
backend/app/services/planner.py
backend/app/services/emergency.py
backend/app/services/source_service.py
backend/app/services/auth_service.py
backend/app/api/ai.py
backend/app/api/auth.py
frontend/app/digital-twin/page.tsx
frontend/app/copilot/page.tsx
frontend/components/globe/LunarGlobe.tsx
```

**Judge line:** “Granite explains the decision; it does not invent the physics.”

## 2. Innovation

LunaGuard is not a single-route pathfinder and not a generic space chatbot. It combines:

1. multi-objective route trade studies,
2. deterministic explainability,
3. a NASA-style mission decision timeline,
4. a digital twin with dynamic failure injection,
5. emergency replanning from the rover's current position,
6. a grounded IBM Granite mission copilot,
7. explicit source/provenance boundaries,
8. human authorization rather than autonomous execution.

The innovation is the **complete resilient-autonomy lifecycle**:

`plan → explain → simulate → fail → recover → audit`.

## 3. Challenge Fit

The project directly addresses space-exploration decision support:

- safer lunar surface route selection,
- energy-aware and risk-aware rover planning,
- anomaly response under changing conditions,
- translation of mission and source data into concise operator intelligence,
- explainable decisions in a high-consequence environment.

The platform makes the IBM AI component visible without outsourcing safety calculations to an LLM.

## 4. Feasibility

Credibility comes from explicit boundaries:

- hard slope/traversability and route metrics are deterministic;
- AI narration cannot change route calculations;
- route-planning terrain is labeled **synthetic**;
- 3D globe visual layers are labeled generated proxies rather than raw NASA pixels;
- NASA/CSA source retrieval has offline-safe curated metadata;
- Google sign-in is optional; local prototype accounts remain available;
- the architecture isolates terrain ingestion so validated mission DEMs can replace the synthetic service later.

A real deployment would still require mission-grade DEM ingestion, rover dynamics, uncertainty propagation, role-based access, telemetry interfaces, validation/certification, and mission assurance review.

## 5. Real-World Impact

The value proposition is reduced decision latency with preserved human authority. A mission operator can see:

- which route is recommended,
- why it is recommended,
- what the trade-offs are,
- what changed after an anomaly,
- whether the original route remains viable,
- what recovery is proposed,
- which source material informed the AI explanation,
- an audit trail of the complete decision sequence.

The same architecture can extend to lunar/Mars rovers, remote science vehicles, planetary analogues, and other autonomous systems operating under delayed communication and resource constraints.

## Best evidence sequence for judges

1. **Dashboard** — establish platform scope and IBM stack.
2. **Mission Planner** — calculate the three route profiles and show deterministic evidence.
3. **AI Mission Copilot** — ask “Why is slope critical for lunar rover routing?” and show Granite + NASA/CSA citations.
4. **Digital Twin Lab** — run `Terrain obstruction`; let the anomaly trigger and recovery route complete.
5. **Mission Timeline** — show the plan/anomaly/recovery/audit events that were just generated.
6. **Data Sources / Globe** — show source provenance and explicitly point out the synthetic/proxy data boundaries.

That sequence demonstrates all five judging criteria in one coherent story.

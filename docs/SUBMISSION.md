# LunaGuard — Submission Copy

## Project title
**LunaGuard — Explainable Resilient Autonomy for Lunar Missions**

## One-line pitch
LunaGuard is a human-in-the-loop lunar mission intelligence platform that plans explainable rover routes, simulates failures, replans recovery in a digital twin, preserves an audit timeline, and uses IBM Granite on watsonx.ai for NASA/CSA-grounded mission guidance.

## Challenge theme
**August Challenge — Advance Space Exploration with AI**

## Problem statement
Lunar rover operations are not a single shortest-path problem. Mission teams must balance terrain slope, hazard, energy, battery reserve, time, and changing vehicle conditions. A route that is acceptable at mission start can become unsafe after battery degradation, loss of mobility, or discovery of blocked terrain. Operators therefore need not only a path, but transparent alternatives, rapid reassessment, trustworthy explanations, and a record of why a decision changed.

## Solution
LunaGuard turns a rover route planner into an explainable mission-operations platform.

It:
- computes `FASTEST`, `LOWEST_ENERGY`, and `SAFEST` constrained routes;
- exposes deterministic distance/energy/battery/slope/risk/viability evidence;
- visualizes terrain and route trade-offs;
- runs an end-to-end digital-twin traverse with dynamic anomaly injection;
- replans from the rover's current position after an emergency;
- records AI, operator, anomaly, recovery, and telemetry events in a Mission Timeline;
- provides a 3D lunar globe UX with toggleable mission layers;
- grounds Mission Copilot responses in listed NASA and Canadian Space Agency source material;
- uses IBM watsonx.ai + Granite for generated mission intelligence when configured;
- keeps a clearly labeled deterministic fallback when cloud AI is unavailable.

## AI approach

LunaGuard combines complementary AI/decision methods:

1. **Search and planning AI** — weighted A* searches a constrained terrain grid under different mission objectives.
2. **Deterministic explainability** — mission metrics are formula-derived and traceable.
3. **Generative AI** — IBM Granite through watsonx.ai turns deterministic mission evidence and supplied NASA/CSA context into concise operator guidance.
4. **Human-in-the-loop control** — AI recommends and explains; the operator retains authority.

The key safety boundary is: **Granite explains the decision; it does not invent the physics.**

## IBM technology

- **IBM Bob** — primary development tool across architecture, frontend/backend implementation, debugging, tests, Docker deployment, and documentation.
- **IBM watsonx.ai** — runtime foundation-model service.
- **IBM Granite 3.3 8B Instruct** — grounded mission narration and Copilot answers.

## NASA / Canadian Space Agency grounding

The Copilot source service includes authoritative references for NASA LRO/LOLA, NASA LRO data products/PDS, NASA DONKI space weather, and the Canadian Space Agency Lunar Exploration Analogue Deployment rover dataset. It also performs best-effort live NASA DONKI and CSA CKAN lookups.

The route-planning terrain itself remains deliberately **synthetic** for reproducibility; the app does not falsely label it as NASA flight data. The 3D globe's visual layers are likewise disclosed as generated proxies.

## Technical execution highlights

- FastAPI / Python backend with typed Pydantic API models.
- Next.js 14 / React / TypeScript multi-page mission console.
- Three constrained weighted-A* route profiles.
- Deterministic energy, battery, slope, risk, viability, and mission-success evidence.
- Emergency recovery planning from the live rover position.
- Digital Twin Lab using real route-plan and reassessment endpoints.
- NASA-style Mission Timeline audit UX.
- Interactive canvas-based 3D lunar globe.
- IBM watsonx.ai / Granite mission brief and grounded Copilot endpoints.
- Concurrent, cached best-effort NASA/CSA source retrieval.
- Prototype local account auth with hashed passwords/sessions and optional Google sign-in.
- Docker Compose deployment with backend health gating.

## Innovation

The differentiator is the full resilient-autonomy lifecycle:

**plan → explain → simulate → fail → recover → audit**

Rather than presenting a generic chatbot or isolated path visualization, LunaGuard joins route planning, failure simulation, recovery, provenance, grounded AI explanation, and operator traceability in one coherent mission workflow.

## Feasibility

The prototype is intentionally runnable on a student laptop and remains useful if cloud AI or live source APIs are unavailable. Its deterministic safety/route engine is isolated from external-data and generative-AI adapters. A production evolution can therefore replace synthetic terrain with validated mission DEMs, add actual rover telemetry, and harden identity/audit infrastructure without replacing the core operator workflow.

## Real-world impact

LunaGuard targets a high-value operational question: **how can mission teams make faster, safer, more auditable decisions when the world changes after the route was approved?**

The same architecture can apply to planetary rovers, remote scientific vehicles, and other autonomous systems operating under delayed communication and limited energy.

## Three-minute demo

Use the sequence in `docs/DEMO_SCRIPT.md`:

1. Dashboard — mission-platform scope and IBM stack.
2. Mission Planner — three deterministic route strategies.
3. AI Mission Copilot — Granite + NASA/CSA citation evidence.
4. Digital Twin — inject blocked terrain, replan, continue recovery.
5. Mission Timeline — show the audit trail just created.
6. Globe / Data Sources — close on spatial context and honest provenance.

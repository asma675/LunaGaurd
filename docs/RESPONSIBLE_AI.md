# LunaGuard — Responsible AI and Data Provenance

## Safety statement

LunaGuard is a **hackathon decision-support and mission-simulation prototype**, not a certified flight system. It must not be used to command real spacecraft or rovers.

## Core design rule

> **Granite explains the decision; it does not invent the physics.**

Route geometry, traversability, energy, slope, hazard, battery reserve, risk, mission-success metrics, and viability are deterministic backend outputs. Generative AI is downstream of that evidence.

## Human authority

The interface repeatedly labels the workflow **human-in-the-loop**. The prototype can recommend a route or recovery action, but it does not issue commands to hardware.

Human checkpoints include:

- route choice,
- mission start,
- emergency review,
- interpretation of Copilot output,
- report/audit review.

## Copilot grounding

The AI Mission Copilot receives:

1. curated NASA/Canadian Space Agency source summaries,
2. best-effort live source records when available,
3. optional LunaGuard mission context,
4. the operator's question.

Its prompt requires it to:

- answer only from the supplied context,
- cite bracketed source IDs,
- distinguish source facts from inference,
- avoid invented telemetry,
- avoid invented numerical safety claims,
- state when evidence is insufficient.

The response exposes structured citation records in the UI.

## Cloud AI degradation

If watsonx credentials are missing or the model call fails:

- route planning continues,
- emergency replanning continues,
- Copilot returns a labeled deterministic fallback,
- the UI does not pretend Granite was live.

This keeps the language model outside the critical availability path.

## Dataset truthfulness

### Route-planning terrain

The current terrain grid is **synthetic**. It is generated for deterministic demonstration and does not represent a real lunar landing site.

### 3D Lunar Globe

The interactive globe's topography, relief, polar illumination, and marker layers are **visual proxies**. They demonstrate how real mission layers could be organized and explored; they are not raw NASA pixels or a scientifically validated lunar DEM.

### NASA / CSA sources

The Copilot source catalog includes authoritative public source records and optional live API/catalog results. A source being listed does **not** mean every pixel/value in the mission planner came from that agency.

This distinction is shown on the Data Sources page to prevent data-origin ambiguity.

## Rover-model limitations

The rover is simplified. The prototype does not model full chassis dynamics, wheel-soil interaction, thermal behavior, dust accumulation, communication geometry, localization uncertainty, sensor noise, or fault-tolerant flight software.

A production system would need rover-specific dynamics and mission qualification.

## Uncertainty

The demo treats its terrain and rover parameters as known point estimates. A production mission planner should propagate uncertainty through terrain, localization, energy, thermal, mobility, and hazard models and provide confidence/robustness envelopes.

## Authentication limitations

Local accounts are included to make the prototype feel like a real operator platform. Although passwords are salted and hashed and bearer tokens are stored as hashes, the implementation is still prototype-grade.

A real mission system should use managed identity, MFA, RBAC/ABAC, secure cookies or equivalent hardened session handling, audit-backed authorization, TLS, rate limits, recovery controls, and enterprise secrets management.

## Appropriate uses

- hackathon demonstration,
- mission-planning UX research,
- algorithm education,
- rover analogue exercises,
- autonomy concept exploration,
- architecture prototyping.

## Inappropriate uses

- real rover command generation,
- certified mission planning,
- safety decisions without expert review,
- claims that synthetic/proxy data is real NASA/CSA mission data.

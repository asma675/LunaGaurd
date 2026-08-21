LunaGuard

Explainable Resilient Autonomy for Lunar Missions

AI Builders Challenge with IBM Bob — August 2026: Advance Space Exploration with AI

LunaGuard is a full-stack lunar mission decision-support platform. It plans rover routes, compares energy/risk/time trade-offs, simulates mid-mission failures, replans from the rover's live position, keeps an operator-readable decision timeline, and uses IBM Granite through local inference or IBM watsonx.ai to turn deterministic mission evidence and authoritative NASA / Canadian Space Agency source material into grounded mission intelligence.

The current competition build can also ingest an official NASA LRO / LOLA Planetary Data System GDR elevation product and automatically derive terrain layers such as slope, roughness, hazard, and traversability from that imported elevation crop. NASA DONKI data can be accessed with a private NASA_API_KEY, while the Data Sources page keeps raw source provenance, derived mission layers, live feeds, and AI inference visibly separated.

IBM Bob was used as the primary AI-assisted development tool. LunaGuard is a prototype for simulation and decision support, not a certified flight system.

Challenge fit at a glance

LunaGuard is built for the Advance Space Exploration with AI challenge: turning complex, data-heavy mission inputs into insight-driven, operator-usable decisions. The project focuses on lunar rover planning, anomaly response, resilient recovery, explainable AI, and human oversight—directly addressing the challenge themes of mission success, smarter decision-making, safety, reliability, and accessible space-data interpretation.

Challenge need

LunaGuard response

Smarter mission decisions

Deterministic FASTEST / LOWEST_ENERGY / SAFEST route trade studies plus operator-readable AI explanation

Mission safety and reliability

Hard traversability and slope constraints, anomaly injection, emergency replanning, recovery viability, and human authorization

Complex space data made usable

NASA LRO/LOLA terrain ingestion, NASA DONKI context, CSA evidence, provenance labels, and IBM Granite explanations

AI as a core component

IBM Granite Mission Copilot and route briefs grounded in deterministic mission evidence and authoritative source context

IBM Bob as primary development tool

Architecture exploration, implementation, debugging, integration, validation, documentation, and project-level Bob/MCP workflows

Why LunaGuard is different

Most route demos stop at start → destination. LunaGuard demonstrates a complete resilient-autonomy loop:

plan → compare → explain → authorize → simulate → fail → reassess → recover → validate → audit

The safety-critical boundary is deliberate: Granite explains the decision; it does not invent the physics. Route geometry, energy, slope, hazard, viability, and mission-success metrics are computed deterministically by the backend.

LunaGuard also separates three kinds of evidence so operators can understand what they are looking at:

Mission evidence — deterministic route, energy, slope, hazard, and recovery calculations.

Source evidence — NASA / Canadian Space Agency material used for scientific and operational context.

AI inference — IBM Granite-generated explanation grounded in the supplied mission and source evidence.

Latest 2026 updates

The latest LunaGuard release expands the original mission-planning platform while keeping the core deterministic safety architecture intact.

New platform capabilities

Dark and Light Mode — operators can switch between mission-control dark mode and a high-readability light interface, with the preference persisted for later sessions.

Collapsible mission sidebar — operators can collapse navigation to maximize the mission workspace while preserving fast access to every module.

Improved typography and spacing — larger text, cleaner card spacing, reduced visual crowding, and improved responsive layouts.

Validation Lab — runs repeatable mission-planning and recovery scenarios and reports measured route viability, hard-constraint violations, battery reserve, risk, latency, and recovery performance.

Local IBM Granite support — LunaGuard can use IBM Granite locally through Ollama without requiring a paid cloud inference service.

IBM watsonx.ai support — cloud Granite inference remains available when watsonx credentials are configured.

Question-aware Copilot fallback — when Granite is unavailable, the Copilot provides mission-aware deterministic responses instead of returning the same generic answer for unrelated questions.

Route-aware AI explanations — the Copilot can explain the most recently planned FASTEST, LOWEST_ENERGY, or SAFEST route using real LunaGuard metrics.

Evidence boundary — the UI visibly distinguishes deterministic mission evidence, NASA/CSA source evidence, and AI-generated interpretation.

AI numeric safety guard — mission-critical values remain authoritative in LunaGuard's deterministic backend rather than being invented by the language model.

Authenticated NASA API support — LunaGuard supports a private NASA_API_KEY through .env, with DEMO_KEY available as a development fallback; the Data Sources page reports whether NASA API access is authenticated without exposing the credential.

Real NASA LRO / LOLA terrain ingestion — scripts/import_lola_pds.py imports a matched NASA PDS3 GDR .IMG + .LBL pair. The competition demo was verified with ldem_75s_240m.img, producing a compact 100×100 terrain crop at 240 m/cell that LunaGuard automatically detects on backend restart.

Derived terrain intelligence from real elevation — when a LOLA crop is active, LunaGuard derives slope, roughness, hazard, and traversability while preserving a visible provenance boundary between NASA measurements and LunaGuard-derived mission layers.

Improved Digital Twin workflow — mission failure, reassessment, recovery, telemetry, and completion are presented as one continuous operational story.

Enhanced IBM Bob integration — project-level Bob/MCP tooling can inspect LunaGuard health, mission AI status, sources, validation evidence, and application capabilities during development.

Updated LunaGuard branding — refreshed mission-control visual identity and LunaGuard logo treatment.

Creator / About section — includes project creator information, LinkedIn, GitHub, and current internship availability.

Internship availability — the creator is actively seeking Fall 2026, Winter 2027, and Summer 2027 internships, especially in AI, software engineering, and space technology.

Competition-ready pages

Page

Judge-visible capability

Dashboard

Executive mission view, platform architecture, IBM AI status, system health, quick access to each capability, and theme-aware mission interface

Mission Planner

Original LunaGuard terrain planner with FASTEST / LOWEST_ENERGY / SAFEST trade studies, route evidence, execution and emergency recovery

Validation Lab

Repeatable backend validation of route planning, constraint compliance, mission viability, latency, battery reserve, risk, and anomaly recovery

Mission Timeline

NASA-style audit trail for planning, operator actions, AI decisions, anomalies, telemetry, and recovery events

Digital Twin Lab

End-to-end simulated traverse with live telemetry, dynamic failure injection, real backend replanning, and post-recovery completion

3D Lunar Globe

Interactive lunar sphere with toggleable topography/relief/illumination/grid/mission-marker visual layers and explicit provenance labels

AI Mission Copilot

IBM Granite through local inference or watsonx.ai, grounded in listed NASA LRO/LOLA, NASA DONKI, and CSA rover-analogue sources; deterministic question-aware fallback if AI inference is unavailable

Data Sources

NASA API authentication status, authoritative NASA/CSA source catalog, live-feed status, data limitations, active LOLA terrain provenance, and explicit separation of source data from derived mission layers

Login / Profile

Local prototype accounts plus optional Google Identity Services sign-in; persistent backend sessions

About / Creator

Project background, creator profile, LinkedIn/GitHub links, technical focus, and internship availability

Judging criteria map

Criterion

LunaGuard evidence

Technical Execution

IBM Bob primary development workflow; Next.js + TypeScript frontend; FastAPI backend; weighted A* planning; deterministic energy/risk constraints; emergency replanning; digital twin; runtime validation; Docker; SQLite auth; NASA API integration; real NASA LOLA PDS ingestion; local IBM Granite through Ollama; optional IBM watsonx.ai / Granite

Innovation

Explainable resilient autonomy rather than a single-path demo: plan → compare → explain → authorize → simulate → fail → reassess → recover → validate → audit, with a deliberate separation between deterministic physics, authoritative source evidence, and generative AI

Challenge Fit

Directly addresses the challenge goal of making space exploration more insight-driven through lunar mission planning, rover safety, anomaly response, mission-data interpretation, and operator decision support

Feasibility

Hard safety constraints remain deterministic; real NASA elevation can be ingested through a repeatable importer; Docker packages the system reproducibly; local/cloud Granite options degrade gracefully; human authorization remains in the loop

Real-World Impact

Demonstrates a practical path toward safer and more explainable lunar rover operations, with an architecture that can evolve toward higher-resolution DEMs, live telemetry, uncertainty models, mission audit storage, and role-based mission control

See docs/JUDGING.md for the detailed evidence map and docs/DEMO_SCRIPT.md for a three-minute judge demo.

Technology stack and integrations

Layer

Technology / integration

Role in LunaGuard

Primary AI-assisted development

IBM Bob

Architecture, implementation, debugging, integration, validation, documentation, UI refinement, and Bob/MCP experimentation

Generative AI

IBM Granite 3.3

Operator-facing mission explanation and grounded Copilot responses

Local AI runtime

Ollama (granite3.3:2b)

Local-first Granite inference for low-cost, offline-friendly development and demonstration

Cloud AI option

IBM watsonx.ai (ibm/granite-3-3-8b-instruct)

Optional managed Granite inference path

Frontend

Next.js 14 + React + TypeScript

Multi-page mission-operations interface

Backend

FastAPI + Python

Route planning, recovery, validation, AI routing, auth, source services, and terrain processing

Mission planning

Constrained weighted A*

FASTEST, LOWEST_ENERGY, and SAFEST route profiles with deterministic constraints

Real lunar terrain

NASA LRO / LOLA PDS GDR

Elevation ingestion and derived slope / roughness / hazard / traversability

Live/public space context

NASA DONKI API

Best-effort recent space-weather notifications

Additional authoritative evidence

Canadian Space Agency Open Data

Lunar-analogue rover imagery, LiDAR, pose, and remote-operations context

Auth / persistence

SQLite + PBKDF2-HMAC-SHA256

Prototype local users and persistent sessions

Deployment

Docker Compose

Reproducible frontend/backend startup and local judging environment

Start in Windows

Open Docker Desktop and wait for the engine to be running.

Open PowerShell in the extracted LunaGuard folder.

Run:

docker compose up -d --build
docker compose ps

Then open:

LunaGuard: http://localhost:3000

FastAPI docs: http://localhost:8000/docs

Backend health: http://localhost:8000/health

You can also double-click START_LUNAGUARD.cmd.

Stop with:

docker compose down

Enable IBM Granite

LunaGuard supports two Granite inference paths:

Local IBM Granite through Ollama

IBM Granite through watsonx.ai

The route planner, recovery engine, validation tools, and deterministic evidence remain functional even if no LLM is available.

Option 1 — Free local IBM Granite

Install Ollama and download Granite:

ollama pull granite3.3:2b

LunaGuard can connect to the local Ollama service through:

AI_PROVIDER=auto
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=granite3.3:2b

This provides a free local Granite inference path for development and demonstration.

Option 2 — IBM watsonx.ai

Copy .env.example to .env and set:

WATSONX_API_KEY=YOUR_IBM_CLOUD_API_KEY
WATSONX_PROJECT_ID=YOUR_WATSONX_PROJECT_ID
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL_ID=ibm/granite-3-3-8b-instruct

Then rebuild:

docker compose down
docker compose up -d --build

The UI reports whether a response came from local Granite, watsonx / Granite, or LunaGuard's offline-safe deterministic evidence engine.

NASA API configuration

NASA-backed services use:

NASA_API_KEY=YOUR_NASA_API_KEY

For development, LunaGuard can fall back to:

NASA_API_KEY=DEMO_KEY

A personal NASA/data.gov API key is recommended for public demonstrations because it avoids relying on the shared development key.

Never commit the real key to GitHub. Keep it in .env.

NASA LRO / LOLA terrain import

LunaGuard can move beyond the synthetic benchmark by importing a matched NASA LOLA PDS3 GDR image/label pair:

python scripts\import_lola_pds.py `
  --img "..\ldem_75s_240m.img" `
  --lbl "..\ldem_75s_240m.lbl"

The verified competition-demo import produced:

data\lola\lola_south_pole_100x100.npz
100x100 cells
240 m/cell
source product: ldem_75s_240m.img

After import, restart the backend:

docker compose restart backend

When the file is detected, the Data Sources page reports NASA LOLA active. LunaGuard then derives slope, roughness, hazard, and traversability from the imported elevation data while preserving the source/derived-data distinction.

Optional Google configuration

Optional Google sign-in requires a Google OAuth Web client ID:

GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID

Configure http://localhost:3000 as an authorized JavaScript origin in the Google Cloud OAuth client. Local email/password accounts work without Google configuration.

Core mission engine

LunaGuard supports two terrain modes: a deterministic 100×100 synthetic benchmark for reproducible testing, and an automatically detected NASA LRO / LOLA elevation crop for real-data demonstrations. When a LOLA crop is present, the terrain service uses imported elevation and derives the route-planning layers from that data; otherwise it falls back to the seeded synthetic benchmark. The planner then produces three constrained A* profiles:

FASTEST

LOWEST_ENERGY

SAFEST

Every profile must respect the rover's hard traversability and maximum-slope limits. The backend computes:

distance and estimated travel time

energy required and projected battery reserve

maximum slope encountered

average hazard and normalized risk

mission-success score

viability, warnings, and hard-constraint violations

The emergency service can then reassess a mission after:

battery degradation

reduced mobility / slope capability

terrain obstruction

communication-delay scenarios supported by the API model

The Digital Twin Lab uses these real planning/reassessment endpoints: it does not fake the route decision in the browser.

Validation Lab

LunaGuard includes a dedicated Validation Lab so technical claims can be measured instead of manually estimated.

Validation scenarios can report evidence such as:

route-discovery success

viable-route rate

hard-constraint violations

planning latency

projected battery reserve

route risk

mission-success score

anomaly-recovery viability

The validation layer is designed for repeatable testing of the deterministic mission engine and recovery workflow.

Results should be presented as measured runtime evidence rather than invented benchmark claims.

IBM AI architecture

NASA / CSA source catalog ───────────────────┐
                                             │
Mission context ─────────────────────────────┼─> Grounded evidence package
                                             │             │
Deterministic route evidence ────────────────┘             ▼
                                                  AI provider router
                                                   /             \
                                                  ▼               ▼
                                      Local IBM Granite      IBM watsonx.ai
                                           Ollama             Granite
                                                  \             /
                                                   ▼           ▼
                                                  Mission narration
                                                         │
                                                         ▼
                                   deterministic mission metrics remain authoritative

Two distinct AI experiences are exposed:

Mission Brief — narrates a selected route's deterministic evidence.

Mission Copilot — answers operator questions using mission context plus listed NASA/CSA source material.

The Copilot is instructed to distinguish:

deterministic mission facts

external source facts

AI inference

It must not invent telemetry, route geometry, battery values, safety limits, or mission-critical numbers.

If Granite is unavailable, the AI layer degrades gracefully to LunaGuard's question-aware deterministic evidence engine so the mission platform remains functional.

Human-in-the-loop mission architecture

LunaGuard is intentionally designed as decision support rather than an autonomous authority.

The operational loop is:

Mission objective
      ↓
Deterministic planning
      ↓
Route trade study
      ↓
Human review / authorization
      ↓
Digital twin execution
      ↓
Telemetry + anomaly
      ↓
Deterministic reassessment
      ↓
Recovery recommendation
      ↓
Granite explanation
      ↓
Human decision
      ↓
Mission timeline / audit

This keeps the operator in control while still using AI to reduce cognitive load and explain complex mission evidence.

Data provenance

The route-planning terrain is explicitly provenance-aware. LunaGuard keeps a deterministic synthetic benchmark for reproducible testing, but automatically switches to an imported NASA LRO / LOLA PDS GDR elevation crop when one is present.

The current competition workflow has been verified using the official ldem_75s_240m.img + .lbl product pair. scripts/import_lola_pds.py converts the PDS product into LunaGuard's compact terrain asset; the backend then derives slope, roughness, hazard, and traversability from the imported elevation. The UI reports NASA LOLA active when that real elevation crop is in use.

The 3D globe contains generated visual proxies for lunar topography, relief, illumination, and mission overlays; those rendered pixels are not presented as raw NASA imagery.

The Copilot source layer references authoritative public material, including:

NASA Lunar Reconnaissance Orbiter / LOLA science and data

NASA LRO data products / Planetary Data System pathways

NASA DONKI space-weather API

Canadian Space Agency Lunar Exploration Analogue Deployment rover data

best-effort live CSA open-data search

See docs/RESPONSIBLE_AI.md and the in-app Data Sources page.

Responsible AI boundary

LunaGuard treats generative AI as an explanation and interpretation layer, not as the source of mission physics.

DETERMINISTIC
Route geometry
Energy
Battery reserve
Slope
Hazard
Risk
Constraint compliance
Recovery viability

SOURCED
NASA / CSA mission context
Lunar science information
Space-weather context

GENERATIVE
Explanation
Summarization
Operator-readable mission narration
Follow-up question answering

This architecture makes it possible to use AI without silently replacing deterministic safety logic with language-model output.

Authentication

The prototype includes:

local registration and login

PBKDF2-HMAC-SHA256 password hashing with per-user salts

random bearer sessions stored by hash in SQLite

optional Google Identity Services login

persistent Docker volume for the auth database

For a production deployment, use a managed identity provider, secure HTTP-only cookies, CSRF protections, rate limiting, account recovery, MFA, and centralized audit storage.

User experience and accessibility

LunaGuard's latest interface includes:

dark mode

light mode

persistent theme preference

collapsible desktop mission sidebar

persistent mission-control visual language

larger typography

improved spacing between controls and cards

responsive layouts for smaller screens

reduced information density on high-complexity pages

clearer AI/source/mission status indicators

consistent mission-state and evidence labeling

The goal is to keep a technically dense mission-operations platform readable without turning the interface into a crowded dashboard.

Creator

Asma Ahmed
Computer Science / Software Engineering

LunaGuard was designed and developed as an exploration of explainable AI, resilient autonomy, mission decision support, and human-centered space software.

GitHub: https://github.com/asma675

LinkedIn: https://www.linkedin.com/in/asma-ahmed67/

Open to opportunities

I am actively looking for internship opportunities for:

Fall 2026

Winter 2027

Summer 2027

I am especially interested in opportunities involving AI, software engineering, intelligent systems, and space technology.

IBM Bob development workflow

IBM Bob was used as the primary AI-assisted development tool throughout LunaGuard, directly satisfying the challenge's required-technology criterion. Bob supported the project from architecture exploration through implementation, debugging, integration, validation, documentation, and mission-Copilot refinement.

VS Code was also used for hands-on inspection, Docker operations, testing, and targeted final refinements, while IBM Bob remained the primary AI-assisted development environment.

Bob supported work including:

initial architecture exploration

frontend/backend implementation

debugging Docker and runtime issues

TypeScript and React troubleshooting

API integration

mission workflow iteration

test and validation improvements

documentation

UI refinement

mission-Copilot integration

project-level MCP experimentation

LunaGuard also includes project-level Bob/MCP configuration so the development environment can interact with selected application capabilities and inspect system evidence.

See docs/BOB_USAGE.md for the detailed development record.

Architecture

graph LR
  U[Operator] --> N[Next.js Mission UI]

  N --> F[FastAPI]

  F --> P[Constrained A* Planner]
  F --> E[Emergency Replanner]
  F --> T[Terrain Service]
  F --> V[Validation Service]
  F --> A[Auth Service / SQLite]
  F --> S[NASA + CSA Source Service]

  S --> D[NASA / CSA Public Sources]

  F --> R[AI Provider Router]
  R --> O[Local IBM Granite / Ollama]
  R --> W[IBM watsonx.ai / Granite]

  P --> X[Deterministic Mission Evidence]
  E --> X
  V --> X

  X --> N
  X --> R

  O --> N
  W --> N

More detail: docs/ARCHITECTURE.md.

Repository structure

lunaguard/
├── backend/                 FastAPI planning, recovery, AI, auth, validation and source services
├── frontend/                Next.js multi-page mission operations console
├── data/                    deterministic demo and lunar-data support assets
├── demo/                    demo support material
├── docs/                    judging, architecture, API, responsible AI, Bob usage
├── scripts/                 verification scripts
├── docker-compose.yml
├── START_LUNAGUARD.cmd
└── README.md

Submission checklist

Run the full judge demo without errors.

Verify the backend reports healthy.

Verify the frontend can reach the backend on port 8000.

Verify NASA API configuration without exposing the secret and confirm the Data Sources page reports the expected authenticated/demo status.

Configure either local IBM Granite or watsonx.ai for the recorded Copilot demonstration.

Confirm the Copilot visibly identifies its active AI/fallback mode.

Run the Validation Lab and capture genuine measured results.

Capture Dashboard, Planner, Validation Lab, Digital Twin recovery, Timeline, Copilot evidence, Globe, and Data Sources screenshots.

Confirm NASA LOLA active is visible for the real-terrain demo and verify the imported terrain source is correctly labeled.

Test both dark and light mode and the collapsible sidebar.

Confirm LinkedIn and GitHub creator links.

Add the public GitHub repository URL.

Add the publicly accessible demo video of 3 minutes maximum.

Explain specifically how IBM Bob was used; see docs/BOB_USAGE.md.

Complete and upload the required IBM SkillsBuild activity certificate.

Confirm .env is ignored by Git.

Confirm no NASA, IBM, Google, or other secret API keys are committed.

Regenerate any secret that has previously been publicly exposed.

Publish the final challenge project page before the submission deadline.

Judge-visible proof points

For the three-minute demo, the strongest evidence is visible directly in the running product:

IBM Bob — briefly show the LunaGuard project in Bob and explain where Bob supported architecture, implementation, debugging, integration, and documentation.

Mission Planner — show FASTEST / LOWEST_ENERGY / SAFEST routes and deterministic trade-off metrics.

Digital Twin — inject a failure and show real backend reassessment and recovery from the rover's updated state.

IBM Granite Copilot — show a route/recovery explanation while emphasizing that Granite explains deterministic evidence rather than generating safety physics.

NASA LOLA active — show the Data Sources page reporting the real imported NASA LRO/LOLA elevation crop.

Validation Lab — show measured backend evidence rather than invented benchmark claims.

Mission Timeline — show the auditable sequence of planning, authorization, anomaly, recovery, and operator decisions.

These proof points intentionally map to the competition's five judging dimensions: Technical Execution, Innovation, Challenge Fit, Feasibility, and Real-World Impact.

Final project message

LunaGuard is built around a simple principle:

Mission-critical AI should be useful without becoming unverifiable.

The deterministic mission engine determines what is physically and operationally viable. IBM Granite helps operators understand why.

Granite explains the decision. LunaGuard does not let AI invent the physics.

License

MIT — see LICENSE.

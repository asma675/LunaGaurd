LunaGuard

Explainable Resilient Autonomy for Lunar Missions

Selected Challenge Theme: August Challenge — Advance Space Exploration with AI

LunaGuard is a human-in-the-loop lunar mission decision-support platform for rover route planning, risk-aware recovery, mission simulation, and operator intelligence. It compares multiple route strategies, exposes the trade-offs behind each recommendation, simulates failures during a mission, replans from the rover's current position, and preserves an operator-readable mission timeline.

IBM Bob was used as the primary development environment for the original LunaGuard codebase and its full-stack iteration workflow.

Problem statement

Lunar rover navigation is not simply a shortest-path problem. Mission teams must balance terrain slope, hazard exposure, travel time, energy use, battery reserve, and changing rover capability. A route that is safe when a mission begins can become unsafe after a battery loss, mobility degradation, or newly detected terrain obstruction.

Operators therefore need more than a route line on a map. They need:

multiple viable alternatives,

transparent trade-offs,

fast reassessment when conditions change,

clear evidence behind recommendations,

source-aware mission guidance,

and an audit trail of what changed and why.

Solution

LunaGuard combines deterministic mission planning with explainable AI-assisted decision support in a multi-page mission-operations console.

The platform can:

generate FASTEST, LOWEST_ENERGY, and SAFEST route profiles;

compute distance, travel time, energy use, projected battery reserve, maximum slope, hazard/risk, viability, and mission-success evidence;

visualize terrain, route alternatives, and rover constraints;

simulate an active mission in a Digital Twin Lab;

inject battery, mobility, and terrain-obstruction failures;

replan from the rover's current position after an anomaly;

record planning, AI, anomaly, recovery, and telemetry events in a Mission Timeline;

provide an interactive 3D Lunar Globe with toggleable visualization layers;

provide a Mission Copilot grounded in NASA and Canadian Space Agency source material;

optionally use IBM watsonx.ai + Granite for generated mission narration when credentials are configured;

remain functional with a labeled deterministic fallback when cloud AI is unavailable.

The core resilience loop is:

plan → compare → explain → authorize → simulate → fail → reassess → recover → audit

AI approach and architecture

LunaGuard deliberately separates safety-relevant calculations from generative narration.

1. Classic AI search for route planning

The backend uses constrained weighted A* search to find rover routes under different mission objectives. Each route profile uses the same hard terrain and slope constraints but optimizes different operational priorities.

2. Deterministic mission evidence

The backend computes mission metrics before any generative-AI call:

route geometry,

distance,

estimated time,

energy required,

projected battery reserve,

maximum encountered slope,

hazard/risk score,

viability,

warnings and constraint violations.

3. Emergency reassessment

When mission conditions change, LunaGuard applies the new constraints and replans from the rover's current position rather than restarting the mission from the original start point.

4. Grounded mission intelligence

The Mission Copilot uses curated NASA / Canadian Space Agency source references and mission context. When IBM watsonx.ai credentials are configured, IBM Granite can generate concise operator-facing explanations. When cloud inference is unavailable, LunaGuard uses a clearly labeled deterministic fallback rather than pretending a model response is live.

5. Human-in-the-loop control

LunaGuard recommends and explains. The operator retains decision authority.

Design principle: Granite explains the decision; it does not invent the physics.

Architecture

graph LR
  U[Mission Operator] --> UI[Next.js / TypeScript Console]
  UI --> API[FastAPI Backend]
  API --> P[Weighted A* Planner]
  API --> E[Emergency Replanner]
  API --> T[Terrain Service]
  API --> S[NASA / CSA Source Service]
  API --> A[Auth Service]
  P --> D[Deterministic Mission Evidence]
  E --> D
  D --> UI
  S --> C[Mission Copilot]
  D --> C
  C -. optional .-> W[IBM watsonx.ai / Granite]
  C --> UI

Selected challenge theme

August Challenge — Advance Space Exploration with AI

LunaGuard directly addresses space mission planning and decision support by helping rover operators turn terrain and mission constraints into understandable route choices, respond to anomalies, and preserve a traceable record of decisions.

How IBM Bob was used

IBM Bob was the primary development environment for the original LunaGuard codebase and was used throughout the software-development lifecycle.

Ideation and architecture

IBM Bob helped turn the initial concept of an AI-assisted lunar rover route planner into a full-stack architecture using:

Next.js / React / TypeScript,

FastAPI / Python,

typed mission and terrain contracts,

weighted A* route planning,

energy and risk scoring,

emergency reassessment,

Docker Compose deployment.

Backend implementation

Bob was used to scaffold and iterate on:

FastAPI endpoints,

Pydantic request/response models,

terrain generation and validation,

route-planning logic,

emergency-event models,

recovery planning,

automated backend tests.

Frontend implementation

Bob was used to build and refine:

mission configuration and rover constraints,

terrain and route visualization,

route comparison,

telemetry and mission execution,

emergency recovery UX,

multi-page mission-console organization,

API integration and error handling.

Debugging and hardening

Bob supported an iterative inspect → run → diagnose → patch → test workflow across issues such as frontend/backend schema drift, Docker health checks, structured logging, TypeScript build errors, timer types, emergency-event contracts, and runtime React errors.

Documentation and deployment

Bob was also used for project documentation, Docker deployment configuration, testing workflows, and architecture notes.

Evidence to include in the public repository or demo: screenshots or short clips of the real IBM Bob workspace/history used while developing LunaGuard.

Main product pages

Page

Purpose

Dashboard

Mission overview, platform health, and quick access to core workflows

Mission Planner

Route planning, trade-off analysis, terrain, rover constraints, and mission execution

Mission Timeline

Operator-readable audit trail of planning, AI, anomalies, telemetry, and recovery

Digital Twin Lab

End-to-end simulated mission with live telemetry, anomaly injection, and replanning

3D Lunar Globe

Interactive lunar visualization with rotating globe and toggleable layers

AI Mission Copilot

Source-grounded mission Q&A with optional IBM Granite narration

Data Sources

NASA / CSA provenance, source status, and limitations

Login / Profile

Prototype operator authentication and profile workflow

Data provenance and responsible AI

LunaGuard clearly separates real source references from simulated mission data.

Route-planning terrain is synthetic deterministic demo terrain for reproducibility.

Globe layers are visualization proxies and are not presented as raw NASA imagery.

The Mission Copilot references NASA LRO / LOLA, NASA space-weather information, and Canadian Space Agency rover-analogue / open-data material.

Generated AI narration is not allowed to override deterministic route viability or safety metrics.

Cloud AI failure does not prevent mission planning or emergency recovery.

Technology stack

Frontend

Next.js 14

React

TypeScript

Tailwind CSS

Recharts

Backend

Python

FastAPI

Pydantic

NumPy

SQLite-based prototype authentication

AI / IBM

IBM Bob — primary development environment

IBM watsonx.ai + Granite — optional runtime mission narration / Copilot generation when configured

Weighted A* — classic AI search for mission route planning

Data / integration

NASA LRO / LOLA references

NASA space-weather source integration

Canadian Space Agency rover-analogue / open-data references

Docker Compose

Run locally

Requirements

Docker Desktop

Docker Compose

Start

docker compose up -d --build

Then open:

App: http://localhost:3000

API docs: http://localhost:8000/docs

Backend health: http://localhost:8000/health

Stop with:

docker compose down

Do not commit .env files or API keys.

Repository structure

LunaGuard/
├── backend/             FastAPI mission, planning, recovery, AI, source and auth services
├── frontend/            Next.js multi-page mission operations console
├── data/                demo data and source documentation
├── demo/                repeatable mission demo assets
├── docs/                architecture, API, responsible AI and IBM Bob documentation
├── scripts/             validation / verification helpers
├── docker-compose.yml
└── README.md

Demo flow

A strong short demo is:

Show the Dashboard and mission objective.

Open Mission Planner and compare FASTEST / LOWEST_ENERGY / SAFEST.

Start the Digital Twin simulation and inject a terrain obstruction.

Show LunaGuard replanning from the rover's current position.

Open Mission Timeline to show the resulting audit trail.

Show Mission Copilot source grounding and IBM Bob development evidence.

Creator

Asma Ahmed SyrotikinCreator and developer of LunaGuard.

https://github.com/asma675/LunaGaurd-/edit/main/README.md

License
MIT — see LICENSE.

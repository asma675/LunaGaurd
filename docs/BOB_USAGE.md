# LunaGuard — IBM Bob Usage Documentation

> An honest, detailed account of how IBM Bob AI was used throughout the LunaGuard project.

---

## Overview

LunaGuard was built **entirely within IBM Bob** over the course of the August 2025 IBM Bob AI Builders Challenge. Bob served as the primary development environment for architecture design, code implementation, testing, and documentation.

This document records:
- What Bob planned and built
- The specific capabilities used
- Example prompts and their outcomes
- Human decisions, corrections, and oversight
- The custom `lunaguard-mission-review` skill

---

## 1. Architecture Design

**Bob's role:** Full architecture design through iterative conversation.

The initial prompt described the problem (lunar rover route planning with explainability) and the challenge theme. Bob proposed:
- A FastAPI backend with separate services for terrain generation, route planning, energy modeling, and emergency replanning
- A Next.js frontend with a canvas-based terrain visualization
- Three simultaneous route profiles as a Pareto front rather than a single route
- Deterministic explainability as a first-class requirement (not a post-hoc addition)

**Human decision:** The emergency replanning feature was expanded from the initial Bob proposal (which had a single "replan" button) to include 4 distinct emergency types with different weight profiles, after discussion about real mission scenarios.

**Example prompt used:**
> "Design the architecture for a lunar rover route planner that explains its decisions. The terrain is a 100×100 grid. I want three route profiles. It needs to handle emergencies mid-mission. The tech stack should be Python backend, Next.js frontend."

---

## 2. Repository Scaffolding

**Bob's role:** Created the full directory structure, all configuration files, and all package manifests.

Files created by Bob in the scaffolding phase:
- `backend/requirements.txt` (all Python dependencies with pinned versions)
- `backend/app/__init__.py`, `backend/app/main.py`
- `frontend/package.json` (Next.js 14, React 18, Tailwind, TypeScript)
- `frontend/tsconfig.json`, `frontend/tailwind.config.ts`
- `.env.example` (with placeholder values — no real credentials)
- `.gitignore` (comprehensive Python + Node + Docker entries)
- `AGENTS.md` (AI agent instructions for future contributors)
- `LICENSE` (MIT)

**Human oversight:** Reviewed all dependency versions; confirmed that `WATSONX_API_KEY` is not in `.gitignore` exceptions and cannot accidentally be committed.

---

## 3. Backend Services Implementation

**Bob's role:** Implemented all backend services through a sequence of focused prompts.

### Terrain Service
Bob generated the `TerrainService` class with:
- Gaussian crater bowl model with configurable size distribution
- Central-difference slope calculation
- Illumination approximation
- Surface type classification
- Fixed-seed reproducibility

**Correction applied:** Initial implementation placed craters too densely (overlapping rims). Human correction prompted Bob to add minimum inter-crater distance enforcement.

### Route Planner (A*)
Bob implemented the A* algorithm with:
- 8-directional movement
- Admissible Euclidean heuristic
- Three profile weight configurations
- Infinite cost for slope > max_slope
- `math.inf` propagation through heapq (required a tie-breaker counter)

**Example prompt:**
> "Implement A* for 8-directional grid search. The cost function needs slope penalty, energy cost, and distance. Slopes above max_slope must return math.inf cost. Generate three profiles: Safe (slope-heavy), Balanced, Fast (distance-heavy)."

### Energy Model
Bob derived the energy formula from first principles (inclined plane work model) after being given the rover mass, base consumption rate, and surface type definitions.

### Emergency Service
Bob implemented the full emergency replanning service including the 4 emergency types, energy viability check, and explicit `InsufficientEnergyError` for the no-viable-path case.

**Critical human oversight:** Verified that the emergency service does NOT silently return a route that violates the energy constraint. Initial implementation returned `None` for infeasible routes; this was corrected to raise a typed exception with context.

### watsonx Integration
Bob implemented the watsonx client with:
- IBM watsonx.ai Python SDK integration
- Prompt template with computed metrics injection
- Number extraction and validation logic
- Graceful fallback to deterministic explanation

---

## 4. Frontend Implementation

**Bob's role:** Generated all React/Next.js components.

### Terrain Canvas
Bob generated a `TerrainMap` component that renders the 100×100 terrain grid using the HTML5 Canvas API. The canvas:
- Colors cells by elevation using an HSL gradient
- Supports overlay modes (slope, illumination, hazard)
- Draws route paths as colored polylines
- Animates the rover position marker

**Human refinement:** Added CSS for dark theme integration and adjusted the color gradient endpoints after visual inspection of the initial render.

### Route Cards
Bob generated `RouteCard` components with score breakdown, profile comparison, and recommended-route highlighting.

### Emergency Panel
Bob generated the `EmergencyPanel` with all 4 emergency type buttons, real-time battery percentage display, and recovery route result display.

---

## 5. Test Generation

**Bob's role:** Generated the full pytest test suite (~122 backend tests) and Jest test suite (~51 frontend tests).

**Most valuable test Bob generated:**
```python
def test_slope_greater_than_max_blocks_path():
    """A* must never route through a cell with slope > max_slope."""
```
This test caught a subtle bug where cells with exactly `max_slope` (not strictly greater) were passing through. Bob's test prompted the fix.

**Example prompt:**
> "Write pytest tests for the emergency service. Make sure to test: (1) energy viability check raises InsufficientEnergyError, (2) replan starts from current_position not original start, (3) emergency weight profiles are applied correctly."

---

## 6. Documentation

**Bob's role:** Generated all documentation files.

| File | Bob's Contribution |
|---|---|
| `README.md` | Full content including Mermaid diagram, all 26 sections |
| `docs/ARCHITECTURE.md` | System overview, component maps, data flow diagrams |
| `docs/ALGORITHM.md` | Full formula derivations, worked numerical example |
| `docs/ASSUMPTIONS.md` | All technical assumptions with impact assessments |
| `docs/API.md` | All 7 endpoints with full request/response schemas |
| `docs/TESTING.md` | Test strategy, test catalog, all run commands |
| `docs/RESPONSIBLE_AI.md` | All 11 responsible AI topics |
| `docs/BOB_USAGE.md` | This file |
| `docs/DEMO_SCRIPT.md` | Full 3-minute script with narration |
| `docs/SUBMISSION_COPY.md` | Hackathon submission text |
| `docs/JUDGING_ALIGNMENT.md` | Feature-to-criterion matrix |
| `docs/BUILD_STATUS.md` | Feature completion tracker |
| `AGENTS.md` | AI agent instructions |

**Human review:** All documents reviewed by the human developer; factual claims about rover physics verified against published NASA rover performance data.

---

## 7. Deployment Configuration

**Bob's role:** Generated Dockerfiles, docker-compose.yml, and environment variable schema.

Bob correctly identified that:
- The backend healthcheck must use `curl` on the `/health` endpoint
- The frontend depends on `service_healthy` (not just `service_started`) to ensure the API is ready
- watsonx credentials must be passed as environment variables, never baked into images

---

## 8. The lunaguard-mission-review Skill

**Bob's role:** Created the custom Bob skill at `.bob/skills/lunaguard-mission-review/SKILL.md`.

This skill was created to enable safety-focused code review of LunaGuard itself by future Bob sessions. The skill instructs Bob to:
- Verify all metrics are formula-computed
- Check hard constraints cannot be bypassed
- Verify emergency reassessment runs A* from current position
- Check no API keys in frontend code
- Verify watsonx fallback works

**Skill usage in this project:**
The skill was run against the completed implementation. Results are documented in `docs/SKILL_REVIEW_RESULTS.md`.

---

## 9. Screenshot Placeholders

> 📸 *Add these screenshots after running the application:*

| Screenshot | What to Capture |
|---|---|
| `docs/images/bob-architecture-prompt.png` | The Bob conversation where the architecture was designed |
| `docs/images/bob-astar-implementation.png` | Bob implementing the A* algorithm |
| `docs/images/bob-test-generation.png` | Bob generating the pytest test suite |
| `docs/images/bob-skill-creation.png` | Bob creating the lunaguard-mission-review skill |

---

## 10. Bob Tool Usage Summary

| Bob Tool | Used For |
|---|---|
| `write_file` | Creating all source files and documentation |
| `apply_diff` | Targeted fixes to implementation bugs |
| `read_file` | Reviewing generated code before committing |
| `execute_command` | Running tests, verifying builds |
| `use_skill` | Activating lunaguard-mission-review for safety review |
| `create_html_artifact` | Not used (documentation is Markdown) |
| `update_todo_list` | Tracking progress across multi-file generation sessions |

---

## Summary

IBM Bob served as the primary development tool for every layer of LunaGuard. Bob's contributions were:
- **Architectural** — the three-profile A* system, deterministic explainability, emergency replanning state machine
- **Implementation** — all backend services, all frontend components, all configuration
- **Quality** — full test suite with safety-critical test cases
- **Documentation** — this entire `docs/` directory

Human contributions were:
- Problem framing and challenge alignment
- Domain knowledge (rover physics, mission planning context)
- Review and correction of generated code
- Oversight of safety-critical logic (energy viability, constraint enforcement)
- Final verification that computed values match documented formulas

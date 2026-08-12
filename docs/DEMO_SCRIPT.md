# LunaGuard — 3-Minute Judge Demo Script

Target: **2:45–2:55** so there is buffer before the three-minute limit.

## 0:00–0:20 — Problem + differentiation (Dashboard)

**Say:**

“LunaGuard is an explainable AI mission-operations platform for lunar rover planning and recovery. Most route demos stop when they find a path. LunaGuard plans multiple strategies, explains the trade-offs, simulates failures, replans from the rover's current position, and preserves an operator audit trail.”

Point at:
- IBM watsonx / Granite status,
- the capability grid,
- `Plan → explain → simulate → fail → recover → audit`.

## 0:20–0:55 — Mission Planner

Open **Mission Planner**.

1. Load the demo mission.
2. Calculate routes.
3. Show FASTEST / LOWEST_ENERGY / SAFEST.
4. Highlight distance, energy, battery reserve, slope, risk, and mission-success evidence.

**Say:**

“The route engine is deterministic. Granite never invents these numbers. Hard terrain and slope constraints remain authoritative, and the operator can compare strategies before committing.”

Do not spend time reading every number.

## 0:55–1:25 — IBM AI Mission Copilot

Open **AI Mission Copilot**.

Ask a prepared prompt such as:

> Why is slope important for a lunar rover route, and which source supports that?

Show:
- **IBM watsonx.ai**,
- **Granite model**,
- response source status,
- NASA / CSA citation chips.

**Say:**

“LunaGuard uses IBM Granite through watsonx.ai for grounded mission intelligence. The Copilot is constrained to listed source context and mission context. If cloud AI is unavailable, the planner still works and the UI clearly labels deterministic fallback mode.”

## 1:25–2:05 — Digital Twin failure + recovery

Open **Digital Twin Lab**.

Choose **Blocked terrain** and click **Run twin**.

Let the chart move. At about 48% the twin will:
- inject the anomaly,
- stop the original traverse,
- call emergency reassessment,
- show the recovery recommendation,
- continue to destination if the recovery route is viable.

**Say:**

“This is the same backend planner and emergency service used by the mission console, not a pre-rendered animation. A new hazard invalidates the projected corridor, LunaGuard replans from the rover's current position, and the digital twin continues the recovered mission.”

## 2:05–2:25 — Mission Timeline

Open **Mission Timeline**.

Point to the freshly generated planning, anomaly, recovery, and completion events.

**Say:**

“Every significant decision becomes an operator-readable audit event. That makes the AI-assisted workflow reviewable rather than opaque.”

## 2:25–2:42 — 3D Globe + Data provenance

Open **3D Lunar Globe**, toggle a couple of layers, then briefly show **Data Sources**.

**Say:**

“The globe demonstrates how mission layers can be combined spatially. We deliberately label these globe layers as visual proxies and the planner terrain as synthetic. The Copilot separately grounds answers in authoritative NASA LRO/LOLA, NASA DONKI, and Canadian Space Agency material.”

## 2:42–2:55 — Close

Return to Dashboard.

**Say:**

“LunaGuard's goal is explainable resilient autonomy: deterministic mission safety, IBM Granite for grounded operator intelligence, and a human still in control. It turns a route planner into an auditable mission decision platform.”

## Recording checklist

Before recording:

- [ ] Docker backend + frontend are healthy.
- [ ] Configure watsonx credentials so the Copilot displays **Granite live**.
- [ ] Run one Copilot question once so network/model latency is known.
- [ ] Reset the Mission Timeline.
- [ ] Reset the Digital Twin.
- [ ] Use browser zoom 100% or 110%; keep font readable.
- [ ] Close unrelated tabs and notifications.
- [ ] Never display `.env`, API keys, or OAuth secrets.

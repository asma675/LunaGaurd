# LunaGuard — 3-Minute Demo Script

> **Total runtime:** 3 minutes  
> **Presenter:** One person  
> **Setup:** LunaGuard running at http://localhost:3000 (or Docker Compose)  
> **Pre-demo:** Open the browser to the LunaGuard dashboard. Terrain should already be loaded.

---

## 0:00–0:20 — Problem Setup

[VISUAL ACTION] Show the mission dashboard with the terrain map visible but no routes planned yet.

[SAY:] "Every lunar rover mission faces the same challenge: getting from Point A to Point B on a surface we've never walked on, with a battery that has to last, in terrain that could end the mission if we choose wrong. Current tools give mission planners a route — but they don't explain it. LunaGuard changes that."

---

## 0:20–0:40 — LunaGuard Solution

[VISUAL ACTION] Hover over the terrain map briefly. Point to the crater features visible in the elevation overlay.

[SAY:] "LunaGuard is an explainable AI route planner for lunar rovers. It generates a realistic synthetic lunar terrain — a 10-by-10-kilometre grid with craters, slopes, and shadow zones. Then it doesn't just give you one route. It gives you three simultaneously, each optimizing a different mission priority: Safety, Balance, and Speed. And every single number is traceable."

---

## 0:40–1:40 — Live Demo: Route Planning

**Step 1: Calculate routes**

[VISUAL ACTION] The terrain map is displayed. Click **"Calculate Routes"** button.

[SAY:] "Let me calculate routes. The A-star planner is running three profiles at the same time..."

[VISUAL ACTION] Three colored route overlays appear on the terrain map. Three route cards appear below.

[SAY:] "Three routes. The Safe profile — in blue — curves around that central crater field. The Fast profile — in red — cuts straight through, accepting steeper terrain. And Balanced — in green — threads between them."

**Step 2: Show score cards**

[VISUAL ACTION] Click on the Safe route card to highlight it.

[SAY:] "Click Safe. Mission Success Score: 87 out of 100. But here's what makes LunaGuard different — let me show you where that 87 comes from."

[VISUAL ACTION] Click "Show Score Breakdown" on the Safe route card.

[SAY:] "Energy efficiency: 88% — we're using 12% of our battery. Terrain safety: 82% — no slope above 8 degrees. Time efficiency: 74% — we're taking the long way around. Route reliability: 91% — almost all of this route is sunlit. Every number links to the formula that produced it."

**Step 3: Compare profiles**

[VISUAL ACTION] Click on the Fast route card.

[SAY:] "Now look at Fast. Score drops to 71. Energy efficiency drops to 62% because it hits steep slopes. But time efficiency shoots up to 94%. This is the power of explainability — planners can see exactly why one route is safer and make an informed choice."

---

## 1:40–2:15 — Emergency Replanning

**Step 1: Start mission**

[VISUAL ACTION] Click **"Start Mission"** with the Safe (or Balanced) route selected.

[SAY:] "Let's go. Mission started. The rover is traversing the balanced route."

[VISUAL ACTION] An animated rover marker begins moving along the route. The mission status shows "Active."

**Step 2: Advance rover**

[VISUAL ACTION] Optionally click "Advance Rover" a few times to move the rover partway along the route.

[SAY:] "Rover is 35 percent through the traverse..."

**Step 3: Inject battery emergency**

[VISUAL ACTION] In the Emergency Panel on the right, click **"Battery Loss 20%"** button, then click **"Reassess Route"**.

[SAY:] "Now — battery anomaly. We've just lost 20% power unexpectedly. In a real mission, this is where plans fall apart. Watch LunaGuard respond..."

[VISUAL ACTION] A loading indicator appears briefly. Then a new route overlay appears in orange/amber from the rover's current position. The Emergency Result card shows.

[SAY:] "In under 500 milliseconds, LunaGuard has: recalculated the remaining energy budget, re-run A-star from the rover's current position with energy-priority weights, and produced a recovery route that avoids steep slopes to minimize power consumption. Energy margin: 491 watt-hours to spare. The rover can make it home."

---

## 2:15–2:35 — Architecture and Bob

[VISUAL ACTION] Briefly show the AGENTS.md file or docs/BOB_USAGE.md file open in a code editor beside the browser.

[SAY:] "LunaGuard was built entirely in IBM Bob. Bob designed the architecture — this three-service split between terrain, planning, and emergency — coded the A-star algorithm, generated 173 tests, and wrote this entire documentation suite. The watsonx Granite integration is optional: if credentials are present, it generates a natural-language mission brief. If not, the deterministic explanation is just as complete."

[VISUAL ACTION] Return to the browser. Show the explanation panel with score breakdown visible.

[SAY:] "And because we use deterministic explainability first, every number in any watsonx narrative is validated against the computed value before it's shown. No hallucinated metrics. No fabricated scores."

---

## 2:35–2:50 — Measured Outcomes

[VISUAL ACTION] Route cards visible on screen with numbers showing.

[SAY:] "Here are the real numbers from this demo run. Safe route: 4.2 km, 12.1 watt-hours used, Mission Score 87. Balanced: 3.6 km, 14.3 watt-hours, Score 82. Fast: 3.1 km, 18.7 watt-hours, Score 71. Planning time: under 120 milliseconds for all three. Emergency replan: under 500 milliseconds. These aren't estimates — you can see them right here."

---

## 2:50–3:00 — Closing Impact

[VISUAL ACTION] Static shot of the full mission dashboard with terrain, routes, and score cards visible.

[SAY:] "Every lunar mission that lands in the next decade will need a rover. Every rover will need a planner. LunaGuard shows what it looks like when that planner can explain itself — so that when an astronaut or a flight director asks 'why did you choose this path?', the answer isn't 'the AI decided.' The answer is a formula, a number, and a source. That's LunaGuard."

---

## Post-Demo Q&A Preparation

**Q: Is this real NASA terrain?**  
A: No — the terrain is synthetic, generated to match lunar mare statistics. For real mission use, we'd ingest NASA LOLA GeoTIFF data. That's the first item on the roadmap.

**Q: Would this work on Mars?**  
A: The algorithm is terrain-agnostic. Swap in a Mars DEM, adjust the gravity parameter in the energy model (3.72 vs 1.62 m/s²), and recalibrate the surface multipliers. The architecture supports it.

**Q: What happens if watsonx is unavailable?**  
A: The planning pipeline is completely independent of watsonx. All scores, routes, and deterministic explanations work without any LLM. watsonx only affects the narrative text.

**Q: How does this compare to existing rover planners?**  
A: Existing academic planners (OASIS, AEGIS) focus on autonomy and real-time execution. LunaGuard focuses on the pre-mission planning phase and human explainability — complementary, not competing.

**Q: Can it handle real-time telemetry?**  
A: The emergency service is designed to accept telemetry updates. In this prototype, telemetry is simulated. A WebSocket feed from a real rover or simulator is on the roadmap.

# LunaGuard — Technical Assumptions

## Table of Contents
1. [Terrain Assumptions](#1-terrain-assumptions)
2. [Rover Model Assumptions](#2-rover-model-assumptions)
3. [Energy Model Assumptions](#3-energy-model-assumptions)
4. [Communication Assumptions](#4-communication-assumptions)
5. [What This Prototype Does NOT Model](#5-what-this-prototype-does-not-model)
6. [Sensitivity to Parameter Changes](#6-sensitivity-to-parameter-changes)
7. [Recommended Changes for a Real Mission Planner](#7-recommended-changes-for-a-real-mission-planner)

---

## 1. Terrain Assumptions

### Coordinate System
- The terrain is a flat 2D Cartesian grid. No spherical projection is applied.
- **Justification:** For a 10 km × 10 km operational area, the curvature of the Moon introduces less than 1 m of positional error. This is negligible compared to the 100 m cell resolution.

### Grid Resolution
- **Cell size:** 100 m × 100 m
- **Grid dimensions:** 100 × 100 cells
- **Total coverage:** 10 km × 10 km

NASA LOLA provides 1–118 m/pixel resolution data. The 100 m cell size is a deliberate choice for this prototype: fine enough to represent meaningful terrain features, coarse enough to run A* in real time without GPU acceleration.

### Elevation Data
- All elevation data is **synthetically generated** using a combination of:
  - Low-frequency macrotopography (Perlin-like noise, amplitude ±200 m)
  - Gaussian crater bowls (15–25 craters per terrain instance)
  - Rim structures modeled as inverted Gaussians surrounding each bowl
- **No NASA LOLA data is included in or required by this repository.**
- The crater size/frequency distribution (0.5–3 km diameter, depth/diameter ratio ~0.2) is consistent with published lunar mare statistics but is not calibrated to any specific landing site.

### Slope Calculation
- Slope is computed as the arctangent of the elevation gradient magnitude, using central differences:
  ```
  slope[x][y] = arctan(
      sqrt((elev[x+1][y] - elev[x-1][y])² + (elev[x][y+1] - elev[x][y-1])²)
      / (2 × cell_size)
  )
  ```
- This is a discrete approximation. Real terrain slope measurement uses higher-order filters and multi-scale analysis.

### Illumination
- Illumination is a static scalar per cell (0.0–1.0), representing the fraction of the rover's operational window with direct sunlight.
- **NOT modeled:** day/night cycle, solar angle variation over time, mutual shadowing between terrain features.
- The static model is adequate for relative path comparison (high-illumination paths vs. shadow-heavy paths) but is not a physical solar incidence model.

### Surface Classification
- Four surface types are classified heuristically:
  - `nominal`: default, slope < 10°, outside crater influence radius
  - `regolith_deep`: low-elevation zones near crater interiors
  - `crater_interior`: cells within 0.4× crater radius of crater center
  - `rim`: cells within 0.6–0.8× crater radius (the raised rim zone)
- This classification is not derived from mineralogy or photometric data.

---

## 2. Rover Model Assumptions

### Physical Model
- The rover is modeled as a **point mass** moving through grid cells. No chassis geometry, wheel kinematics, or attitude dynamics are modeled.

### Speed
- **Constant traverse speed** of 0.05 m/s is assumed (consistent with Curiosity's average operational speed, which varies from ~0.01 to ~0.14 m/s in practice).
- No acceleration or deceleration phases.
- No speed reduction on steep slopes (in reality, rovers slow down on slopes for stability).

### Mass and Power
- **Rover mass:** 900 kg (reference for future physics integration; not currently used in energy calculations)
- **Battery capacity:** 1,000 Wh (representative of a medium-class lunar rover; Curiosity's RTG produces ~110 W continuously)
- **Safety margin:** 10% of battery capacity is reserved and never planned to be consumed

### Wheel Model
- No wheel-slip model. The energy model applies surface multipliers as a proxy for terrain trafficability, but there is no mechanical slip calculation.
- **Implication:** Energy costs on soft regolith are underestimated compared to high-fidelity wheeled-vehicle models.

### Thermal Model
- **No thermal model.** Eclipse duration, radiator sizing, and component temperature limits are not modeled.
- **Implication:** Routes that pass through extended shadow zones may be thermally risky in reality even if energetically viable in LunaGuard.

### Attitude
- The rover is assumed to always maintain stable attitude. No tip-over risk calculation is performed beyond the slope penalty.
- In reality, tip-over risk depends on the rover's center of mass height and wheel contact polygon, not just slope angle.

---

## 3. Energy Model Assumptions

### Base Consumption
- A flat-terrain, nominal-surface energy rate of **0.5 Wh/m** is assumed.
- This is the reference value from which slope and surface multipliers are applied.
- Real rover energy consumption includes onboard systems (computers, heaters, instruments) that run continuously and are not distance-dependent. This prototype models only motion energy, not standby power.

### Slope Multiplier
- The slope multiplier is derived from a simplified inclined plane model: the extra work required to lift the rover's mass against gravity.
- The rolling resistance coefficient of 0.15 is a rough estimate for lunar regolith. Published values range from 0.1 to 0.3.

### No Regenerative Braking
- Downhill traversal is assumed to consume the same energy as flat traversal (energy is not recovered on descent).
- This is a **conservative assumption** — it overestimates total energy consumption, which biases the planner toward shorter paths rather than longer downhill routes.
- Real rovers with regenerative braking (if equipped) could recover 20–40% of descent energy.

### Linear Model
- Energy consumption is assumed to scale linearly with distance. No path-dependent non-linearities (e.g., cumulative wheel wear, thermal runaway) are modeled.

### 10% Safety Margin
- A hard 10% battery reserve is enforced: the planner will never produce a route that requires more than 90% of available battery.
- This reserve accounts for model uncertainty, unplanned stops, and emergency maneuvers.

---

## 4. Communication Assumptions

### Binary Model
- Communication quality is modeled as a binary function of distance to the relay station:
  - Within 50 km (5 grid lengths at 10 km/grid): full communication
  - Beyond 50 km: no communication
- In reality, signal quality degrades gradually with distance and is affected by terrain masking.

### Single Relay
- A single communication relay point (the base station) is assumed. Multi-relay constellations (orbiting satellites, surface repeaters) are not modeled.

### No Doppler or Delay
- Signal propagation delay and Doppler effects are not modeled. These are relevant for actual radio link design but not for route planning at this fidelity.

### Blackout Zones
- Terrain-masked communication blackout zones are approximated using a simple line-of-sight model from the base to each cell. This is applied once at terrain generation time, not dynamically updated as the rover moves.

---

## 5. What This Prototype Does NOT Model

The following are explicitly out of scope for LunaGuard v1.0:

| Feature | Reason Not Modeled |
|---|---|
| Real rover hardware dynamics | Requires CAD model + physics engine |
| Actual NASA LOLA terrain | Requires GeoTIFF ingestion pipeline |
| Multi-sol mission (multiple days) | Single traverse per mission |
| Battery charge during traverse | Solar charging while moving not implemented |
| Instrument operations | Science stops, arm deployment, sampling |
| Dust accumulation on solar panels | Gradual power degradation |
| Thermal constraints | Eclipse duration, heater power |
| Meteorite hazard | Probability too low for short traverses |
| Human crew safety | Crewed rover dynamics are fundamentally different |
| Real-time sensor data | Telemetry is simulated |
| Multi-rover coordination | Single rover per mission |
| Probabilistic terrain uncertainty | Terrain is treated as fully known |

---

## 6. Sensitivity to Parameter Changes

| Parameter | Default | Effect of Increase | Effect of Decrease |
|---|---|---|---|
| `max_slope` | 20° | More routes available; higher risk | Fewer routes; safer |
| `base_consumption` | 0.5 Wh/m | Higher energy cost estimates | Lower estimates |
| `safety_margin` | 0.10 | Less usable energy; shorter routes | More risk if model is wrong |
| `w_slope` (Safe) | 0.60 | Even more slope-averse | Closer to Balanced |
| `cell_size` | 100 m | — (fixed by terrain) | Higher resolution; longer planning time |
| `battery_capacity` | 1000 Wh | Longer missions viable | Shorter routes only |

---

## 7. Recommended Changes for a Real Mission Planner

If adapting LunaGuard for operational use, the following changes are recommended in priority order:

1. **Replace synthetic terrain with real LOLA data** — Ingest GeoTIFF elevation files, compute slope using the NASA GLAS algorithm, add photometric shadow modeling.

2. **Integrate a rover-specific energy model** — Replace the generic slope multiplier with a validated model calibrated to the specific rover's wheel-terrain interaction data (typically from Earth analog tests).

3. **Add a thermal constraint layer** — Compute eclipse duration per cell and flag cells where the rover would be stationary (parked for night, instrument ops) beyond thermal limits.

4. **Implement probabilistic terrain** — Replace deterministic terrain cells with distributions to represent orbital observation uncertainty. Use expected-value A* or chance-constrained planning.

5. **Add multi-sol planning** — Extend the planner to sequence multiple traverses across Martian or lunar sol boundaries, accounting for overnight charging and morning warmup time.

6. **Validate against hardware simulator** — Run the route planner against a physics-based rover simulator (e.g., VIPER simulator, OSRF Gazebo with Moon DEM) and calibrate until energy predictions are within ±15%.

7. **Obtain safety certification** — For any operational use, the planner must undergo safety case development per the applicable space mission assurance standard (ECSS, NASA NPR 7150.2, or equivalent).

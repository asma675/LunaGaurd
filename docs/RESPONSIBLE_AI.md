# LunaGuard — Responsible AI

> This document describes LunaGuard's approach to responsible, transparent, and trustworthy AI for a safety-relevant space exploration application.

---

## 1. Decision-Support Limitation

**LunaGuard is a decision-support tool, not a certified mission planning system.**

All routes produced by LunaGuard must be reviewed and approved by qualified mission operators before any traversal begins. The system is designed to augment human judgment, not replace it.

LunaGuard has NOT undergone:
- Flight heritage or space heritage qualification
- Safety case development per ECSS-E-ST-40C or NASA NPR 7150.2
- Validation against real rover hardware dynamics
- Review by a space agency mission assurance board

**Appropriate use:** Mission simulation, algorithm research, education, pre-mission rehearsal, trade study support.  
**Inappropriate use:** Operational flight planning for an actual lunar rover mission.

This limitation is displayed in the LunaGuard UI header on every page.

---

## 2. Simulated Rover Assumptions

The rover model in LunaGuard is a simplified abstraction:
- **Point mass** with constant speed — no chassis geometry, attitude dynamics, or wheel kinematics
- **No tip-over analysis** — slope constraint is a proxy only; actual tip-over depends on the rover's specific center-of-mass height and wheel contact geometry
- **No thermal model** — routes through extended shadow zones may be thermally dangerous in reality
- **No dust degradation model** — solar panel efficiency is treated as constant

Mission planners using LunaGuard as a reference must apply their own rover-specific models to validate any route before use.

---

## 3. Dataset Limitations

**All terrain data in LunaGuard is synthetic.** No real NASA LOLA data, no site-specific elevation data, and no mission-specific hazard maps are included.

The synthetic terrain is:
- Generated algorithmically using Gaussian crater models
- Parameterized from published lunar mare statistics (not calibrated to a specific site)
- Reproducible with a fixed seed (default: 42) but **not representative of any actual lunar landing site**

This is clearly labeled in:
- The UI terrain overlay header ("Synthetic Terrain — Demo Only")
- The API response metadata (`"data_source": "synthetic"`)
- This document and `docs/ASSUMPTIONS.md`
- The README dataset provenance section

**For any real mission planning application, the terrain service must be replaced with calibrated LOLA or equivalent data.**

---

## 4. Terrain Resolution Limitations

The 100 m × 100 m cell resolution means:
- Sub-100 m hazards (individual boulders, small craters < 50 m diameter) are invisible to the planner
- The slope estimate for each cell represents a 100 m average, which may conceal local steep areas within a nominally safe cell
- Route waypoints are grid-cell centers — actual traversal path within a cell is not resolved

This is a fundamental limitation of any grid-based planner at this resolution. Real mission planners typically use multi-resolution approaches: coarse-grid global planning followed by fine-grid local reactive navigation.

---

## 5. Uncertainty Quantification

LunaGuard currently treats all terrain values as exact known quantities. The following sources of uncertainty are **not modeled**:

| Uncertainty Source | Not Modeled Because |
|---|---|
| Orbital observation noise | Terrain is synthetic |
| Instrument calibration errors | No real sensor data |
| Terrain change over time (seismic settling, micrometeorite impacts) | Static terrain |
| Energy model parameter uncertainty | Fixed parameters, no bounds propagation |
| Rover-terrain interaction variability | No stochastic wheel model |

A production system should represent terrain values as probability distributions and use chance-constrained planning or Monte Carlo simulation to propagate uncertainty through the route score.

---

## 6. Explainability Approach

LunaGuard uses a **deterministic, formula-traced explainability approach** rather than a post-hoc AI explanation. Every number in every score breakdown can be traced to:

1. A specific formula in `docs/ALGORITHM.md`
2. The specific input terrain cell values that produced it
3. The specific profile weight configuration used

This means LunaGuard's explanations are:
- **Reproducible** — same inputs always produce the same explanation
- **Traceable** — every score links to source data
- **Not approximate** — no SHAP values, LIME, or attention weights that might vary

When watsonx Granite-3-8b is used to generate narrative explanations, all numerical values in the narrative are validated against the pre-computed deterministic metrics before the response is returned. If the LLM produces a number that differs from the computed value by more than 1%, the narrative is rejected and the deterministic explanation is returned instead.

---

## 7. Human Oversight Requirements

LunaGuard is designed with the following human oversight checkpoints:

| Decision Point | Human Role |
|---|---|
| Route profile selection | Human selects which profile (Safe/Balanced/Fast) to proceed with |
| Mission start authorization | Human explicitly clicks "Start Mission" after reviewing the route |
| Emergency recovery approval | Human reviews the proposed recovery route before accepting |
| Mission report | Human downloads and reviews the full JSON report |

The system does not autonomously execute any action. All route execution is simulated in the demo — no actual rover commands are issued.

---

## 8. Language Model Hallucination Controls

When IBM watsonx Granite-3-8b is used for narrative explanation generation, the following controls are applied:

**Hard numeric validation:**
```python
def validate_llm_response(llm_text: str, computed_metrics: RouteMetrics) -> bool:
    """
    Extract all numbers from LLM response.
    Reject if any number deviates > 1% from computed metrics.
    """
    extracted_numbers = extract_numbers(llm_text)
    for number in extracted_numbers:
        if not any(
            abs(number - ref) / max(ref, 1e-6) < 0.01
            for ref in computed_metrics.all_values()
        ):
            return False  # Reject: unrecognized number
    return True
```

**Temperature and token controls:**
- Temperature: 0.2 (low temperature for factual outputs)
- Max new tokens: 300 (prevents verbose rambling)
- Stop sequences: `["</s>", "\n\n\n"]`

**Prompt engineering:**
The prompt explicitly includes all computed metrics and instructs the model to use only the provided numbers, never to invent values.

**Fallback policy:**
If validation fails or watsonx is unavailable, a template-based deterministic explanation is returned. The mission success score is never derived from or influenced by the LLM output.

---

## 9. Protection Against Fabricated Metrics

The Mission Success Score and all component scores are computed by deterministic Python functions before any LLM call. The architecture ensures:

- The score computation path does not involve any LLM call
- The watsonx client receives the computed score as input — it does not produce it
- The LLM output is used only for narrative text, never for numerical results
- Test `test_explainer.py::test_score_not_derived_from_llm` verifies this separation

---

## 10. Appropriate Uses

LunaGuard is appropriate for:

- ✅ Pre-mission route planning exercises and simulations
- ✅ Algorithm comparison and research (testing different heuristics, weight profiles)
- ✅ Education about lunar terrain navigation challenges
- ✅ Hackathon demonstrations of AI-assisted space mission planning
- ✅ Prototype for evaluating the user interface of a route planning tool
- ✅ Basis for a more capable system with real terrain data and validated rover models

---

## 11. Inappropriate Uses

LunaGuard must NOT be used for:

- ❌ Generating routes for an actual lunar rover mission (certified or otherwise)
- ❌ Replacing expert judgment in real mission planning workflows
- ❌ Any application where a planning error could endanger hardware, crew, or scientific instruments
- ❌ Claiming validated accuracy for energy or risk predictions without hardware calibration
- ❌ Using the synthetic terrain as a representation of any specific lunar landing site
- ❌ Presenting watsonx-generated narratives as authoritative mission assessments

---

## Responsible AI Summary

| Principle | LunaGuard Implementation |
|---|---|
| **Transparency** | All formulas documented; all scores traceable to source data |
| **Explainability** | Deterministic score decomposition; watsonx narrative validated |
| **Human oversight** | All mission decisions require explicit human action |
| **Honesty about limitations** | Limitations displayed in UI, documented in ASSUMPTIONS.md |
| **No fabricated metrics** | LLM output validated against computed values; fallback on failure |
| **Safety-first constraints** | Hard slope constraints structurally enforced; cannot be bypassed |
| **Data provenance** | Synthetic terrain clearly labeled everywhere |
| **Appropriate scope** | Tool clearly positioned as prototype / decision-support only |

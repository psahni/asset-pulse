# /brainstorm

## Purpose

Explore the problem space for a feature or capability without committing to any solution. Surface unknowns, constraints, and trade-offs. Generate at least three viable approaches for the user to evaluate.

This is the first stage of the SDD workflow. Nothing from this stage is binding — it is divergent thinking. The goal is breadth, not depth.

---

## Inputs

- A feature request, problem statement, or question (plain text from the user)
- Any relevant context: existing docs in `docs/specs/`, mockups in `docs/mockups/`, or constraints the user states

Invoke the `researcher` agent when external knowledge is needed (market data APIs, competitive landscape, library options, etc.).

---

## Process

1. Restate the problem in your own words to confirm understanding
2. List all open questions and unknowns
3. Identify constraints (technical, legal, UX, performance, cost)
4. Invoke the researcher agent if market, API, or competitive research is needed
5. Generate at least 3 distinct candidate approaches, each with:
   - A short name and one-line summary
   - Key advantages
   - Key trade-offs or risks
   - Rough implementation complexity (low / medium / high)
6. Do NOT recommend one approach — present all options neutrally
7. Ask the user to select an approach or request refinement

---

## Outputs

A brainstorm document saved to:

```
docs/specs/brainstorm-{feature-name}.md
```

---

## Deliverables

The brainstorm document must contain:

- **Problem Statement** — restated clearly
- **Open Questions** — unknowns that must be resolved before /define
- **Constraints** — hard limits that any solution must respect
- **Research Summary** — (if researcher agent was invoked) key findings
- **Candidate Approaches** — minimum 3, each with name, summary, advantages, trade-offs, complexity
- **Next Step** — explicit prompt asking user to select an approach

---

## Exit Criteria

- At least 3 viable approaches are documented
- All open questions are listed (they do not need to be answered yet)
- The user has selected an approach or explicitly requested refinement
- The brainstorm doc is saved to `docs/specs/`

**Do not proceed to /define until exit criteria are met and the user has selected an approach.**

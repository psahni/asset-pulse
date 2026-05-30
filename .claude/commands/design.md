# /design

## Purpose

Produce a technical design from the approved specification. Map spec requirements to components, data flows, API contracts, and integration points. Resolve all technical ambiguity before any code is written.

This is the third stage of the SDD workflow. Output here drives the /tasks breakdown and is the blueprint for /build.

---

## Inputs

- Approved specification: `docs/specs/spec-{feature-name}.md`
- Mockups from `docs/mockups/` relevant to this feature
- Technology stack constraints from `CLAUDE.md`
- Any architectural context the user provides

---

## Process

1. Read the approved spec fully before designing anything
2. Map each user story and acceptance criterion to one or more technical components
3. Identify the component tree: pages, layouts, containers, UI components
4. Define the data flow: where data originates, how it moves, where it is stored or cached
5. Define API contracts: route shapes, request/response types, error shapes (do not implement — define contracts only)
6. Identify database entities needed (do not write schema — list entities and their relationships)
7. List external integration points: which third-party APIs are called, when, and what they return
8. Identify shared utilities or hooks needed
9. Note testing approach: which components need RTL tests, which flows need Playwright coverage
10. Present the design to the user for review before saving

---

## Outputs

A technical design document saved to:

```
docs/specs/design-{feature-name}.md
```

---

## Deliverables

The design document must contain:

- **Feature Name and Spec Reference** — link to the approved spec
- **Component Breakdown** — text diagram of the component tree with one-line role descriptions
- **Data Flow** — how data moves from source to UI (narrative + ASCII diagram if helpful)
- **API Contracts** — route, method, request shape, response shape, error shape for each endpoint
- **Database Entities** — entity names, key fields, relationships (no SQL — prose description)
- **External Integrations** — which APIs, what data they provide, how they are consumed
- **Shared Utilities / Hooks** — reusable logic identified during design
- **Testing Plan** — which units need Vitest, which components need RTL, which journeys need Playwright
- **Open Technical Decisions** — any remaining choices the user must approve before /tasks

---

## Exit Criteria

- Every acceptance criterion from the spec maps to at least one technical component or API contract
- No architectural ambiguity remains
- All external integrations are named and their data contracts are described
- The user has reviewed and approved the design document
- The design is saved to `docs/specs/`

**Do not proceed to /tasks until exit criteria are met and the user has approved the design.**

# /define

## Purpose

Translate the selected brainstorm approach into a formal, structured specification. This document becomes the contract for what will be built. Every decision made here gates what /design and /build may produce.

This is the second stage of the SDD workflow. Thinking here is convergent — one approach, fully specified.

---

## Inputs

- Approved brainstorm document: `docs/specs/brainstorm-{feature-name}.md`
- The approach the user selected from /brainstorm
- Any mockups in `docs/mockups/` relevant to this feature
- User clarifications provided during this session

---

## Process

1. Confirm the selected approach with the user before writing anything
2. Write user stories in the format: *As a [user], I want to [action] so that [outcome]*
3. Define acceptance criteria for each user story (testable, unambiguous conditions)
4. Define data requirements: what data is needed, where it comes from, how it is stored
5. Define non-functional requirements: performance targets, error handling expectations, accessibility requirements
6. Define explicit scope boundaries: what is IN scope and what is OUT of scope
7. List dependencies: external APIs, services, or other features this depends on
8. Resolve all open questions from the brainstorm document (or escalate to user)
9. Present the draft spec to the user for review before saving

---

## Outputs

A specification document saved to:

```
docs/specs/spec-{feature-name}.md
```

---

## Deliverables

The spec document must contain:

- **Feature Name and Summary** — one paragraph
- **User Stories** — written in standard format, numbered
- **Acceptance Criteria** — per user story, testable conditions
- **Data Requirements** — data inputs, outputs, storage needs, external sources
- **Non-Functional Requirements** — performance, accessibility, error states, loading states
- **Scope** — explicit IN scope and OUT of scope lists
- **Dependencies** — external APIs, services, other features
- **Open Questions Resolved** — carry-over from brainstorm, now answered
- **Out of Scope** — explicit list of things that will NOT be built in this iteration

---

## Exit Criteria

- All user stories have acceptance criteria
- No open questions remain unresolved
- Scope is explicitly bounded (IN and OUT lists are present)
- The user has reviewed and approved the spec document
- The spec is saved to `docs/specs/`

**Do not proceed to /design until exit criteria are met and the user has approved the spec.**

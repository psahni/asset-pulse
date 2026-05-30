# /tasks

## Purpose

Decompose the approved technical design into a prioritized, ordered list of atomic, executable implementation tasks. Each task must be small enough to implement and verify independently.

This is the fourth stage of the SDD workflow. The task list is the direct input to /build.

---

## Inputs

- Approved technical design: `docs/specs/design-{feature-name}.md`
- Approved specification: `docs/specs/spec-{feature-name}.md`
- Technology stack from `CLAUDE.md`

---

## Process

1. Read the approved design fully before generating tasks
2. Identify all discrete units of work: database migrations, API routes, components, hooks, utilities, tests
3. Order tasks by dependency: foundational work (schema, types, utilities) before consumers (components, routes)
4. Write each task with:
   - A short, imperative title (e.g., "Create price ticker component")
   - A clear done-criteria: the specific, verifiable condition that marks this task complete
   - An estimated complexity: S (< 1 hour) / M (1–4 hours) / L (4–8 hours)
   - Any blocking dependencies (other tasks that must complete first)
5. Flag any task that is L complexity for possible further decomposition
6. Group tasks into logical phases if the feature is large
7. Present the task list to the user for review before saving

---

## Outputs

A task list document saved to:

```
docs/specs/tasks-{feature-name}.md
```

---

## Deliverables

The task list document must contain:

- **Feature Name and Design Reference** — link to the approved design
- **Task List** — numbered, ordered by dependency, each with:
  - Title (imperative)
  - Done-criteria (specific, verifiable)
  - Complexity (S / M / L)
  - Blocking dependencies (task numbers)
- **Phase Groups** — (optional) logical groupings for large features
- **Total Estimate** — sum of all task complexities as a range
- **Risks and Flags** — any tasks with high uncertainty or external dependencies

---

## Exit Criteria

- Every component, API route, database entity, and test from the design has at least one corresponding task
- Every task has a clear, verifiable done-criteria
- No task is larger than L; L tasks are flagged for review
- Task ordering respects dependencies (no task references a blocker that comes after it)
- The user has reviewed and approved the task list
- The task list is saved to `docs/specs/`

**Do not proceed to /build until exit criteria are met and the user has approved the task list.**

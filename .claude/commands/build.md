# /build

## Purpose

Implement the approved task list. One task at a time, with tests written alongside code. Gate each task on passing tests and verified acceptance criteria before marking it done.

This is the fifth and final stage of the SDD workflow. All prior stages must be approved before /build begins.

---

## Inputs

- Approved task list: `docs/specs/tasks-{feature-name}.md`
- Approved technical design: `docs/specs/design-{feature-name}.md`
- Approved specification: `docs/specs/spec-{feature-name}.md`
- Mockups: `docs/mockups/` (primary visual reference during implementation)
- Technology stack from `CLAUDE.md`

---

## Process

1. Read the full task list, design, and spec before writing any code
2. Work through tasks in dependency order — never skip ahead
3. For each task:
   a. Implement the minimum code required to satisfy the done-criteria
   b. Write tests (unit, component, or e2e) that verify the done-criteria
   c. Run the tests — do not mark the task done until they pass
   d. Check the implementation against the relevant acceptance criteria in the spec
   e. Check against the mockup if the task produces UI
   f. Mark the task done in the todo list only after all of the above pass
4. Surface blockers immediately — do not work around spec or design ambiguity silently
5. Do not add features, refactors, or improvements not in the approved task list
6. Do not skip the pre-commit hook checks

---

## Outputs

- Working code in `src/`
- Passing test suite (Vitest + RTL + Playwright as appropriate)
- Updated task list with all tasks marked done

---

## Deliverables

- All tasks from the task list implemented
- Unit tests passing (`vitest run`)
- Component tests passing
- Playwright e2e tests passing for critical journeys
- All acceptance criteria from the spec verifiably met
- No TypeScript errors (`tsc --noEmit`)
- No lint errors

---

## Exit Criteria

- Every task in the task list is marked done
- All tests pass with no skips or suppressions
- Every acceptance criterion from the approved spec is met
- TypeScript compiles with no errors
- Linting passes with no errors
- The feature behaves as shown in the mockups (for UI features)
- The user has reviewed and accepted the implementation

**Do not consider /build complete until all exit criteria pass.**

---

## During /build: What NOT to Do

- Do not implement features not in the approved task list
- Do not refactor surrounding code unless it is blocking the task
- Do not skip or suppress failing tests
- Do not use `// @ts-ignore` or `// eslint-disable` without a comment explaining why
- Do not hard-code values that belong in environment variables
- Do not commit secrets or API keys

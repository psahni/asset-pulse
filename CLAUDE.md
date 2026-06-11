# Asset Pulse — CLAUDE.md

## Project Overview

**Asset Pulse** is an asset intelligence application that delivers real-time market data, price history, and contextual insights for three core assets:

- Bitcoin (BTC)
- Gold (XAU)
- Silver (XAG)

The application is built for users who want a unified, clean view of these assets without switching between multiple platforms. It surfaces prices, trends, alerts, and market context in a single dashboard.

HTML mockups for the UI have been prepared separately and live in `docs/mockups/`. They are the source of truth for visual design during implementation.

---

## Goals

- Provide real-time and historical price data for Bitcoin, Gold, and Silver
- Display market intelligence: trends, volatility indicators, relative performance
- Support price alerts and notifications
- Deliver a fast, responsive experience on all screen sizes
- Store user preferences and alert configurations persistently
- Be maintainable and testable from day one

---

## Technology Stack

### Application

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |

### Testing

| Scope | Tool |
|---|---|
| Unit tests | Vitest |
| Component tests | React Testing Library |
| End-to-end tests | Playwright |

---

## Next.js Conventions

- **Always use App Router.** Never Pages Router.
- **Always use Server Components by default.** Only add `'use client'` when interactivity is required (event handlers, browser APIs, hooks).
- **Never use `useEffect` for data fetching.** Use async Server Components instead.
- **All server actions go in `app/actions/` folder.**
- **Use `next/image` for all images.** Never a raw `<img>` tag.
- **Use `next/link` for all internal navigation.** Never a raw `<a>` tag.
- **Always use dynamic imports for heavy client components** (e.g. charts, rich text editors).
- **Never fetch data in `layout.tsx`.** Fetch in `page.tsx` or dedicated Server Components only.

---

## React Conventions
- Always use functional components. Never class components.
- Keep components under 150 lines. Split if larger.
- One component per file. Filename matches component name.
- Props must always be typed with TypeScript interface.
- Never use index as key in .map() loops.
- Avoid useEffect unless absolutely necessary.
  If you use it, always clean up subscriptions.
- Lift state only as high as needed — no higher.
- Use custom hooks to extract complex logic from components.
  Custom hooks go in src/hooks/ folder.

---

## TypeScript Conventions
- Strict mode is ON. Never use any type.
- Never use type assertions (as Type) unless unavoidable.
- Always define return types on functions explicitly.
- Use interface for object shapes. Use type for unions/aliases.
- Never use non-null assertion (!) unless you can prove it.
- All API responses must have typed interfaces.
  Never return untyped JSON.

---

## Design Patterns
- Container/Presenter pattern for complex components.
  Container handles logic. Presenter handles rendering.
- All API calls go through src/lib/api.ts only.
  Never call fetch() directly inside components.
- All constants go in src/lib/constants.ts.
- All utility functions go in src/lib/utils.ts.
- Barrel exports (index.ts) for each major folder.

---

## Linting and Formatting
- ESLint must pass with zero warnings before every commit.
- Prettier formatting must be applied before every commit.
- Run: npm run lint && npm run typecheck before committing.
- Never suppress ESLint rules with eslint-disable comments
  unless you explain why in a comment above it.

---

## Testing
- Every component must have a co-located test file.
  PostCard.tsx → PostCard.test.tsx
- Tests go in __tests__/ folder or alongside the component.
- Unit test every utility function in src/lib/.
- Never test implementation details.
- Test behaviour not code structure.
- Every API route must have at least one integration test.
- Minimum coverage target: 70% per file.

---

## SDD Workflow

This project follows **Spec-Driven Development (SDD)**. No implementation begins until the specification chain is complete.

```
/brainstorm  →  Explore the problem space; generate candidate approaches
     ↓
/define      →  Write the formal specification with acceptance criteria
     ↓
/design      →  Produce the technical design: components, data flow, API contracts
     ↓
/tasks       →  Decompose the design into atomic, executable tasks
     ↓
/build       →  Implement tasks with tests; gate on all tests passing
```

Each stage produces a document saved to `docs/specs/`. No stage may be skipped. Each stage requires explicit user approval before the next begins.

Command templates for each stage live in `.claude/commands/`.

---

## Coding Principles

- **No premature abstraction.** Three similar lines is better than a helper that doesn't earn its keep. Abstract only when the third use case appears.
- **No speculative features.** Build exactly what the approved spec describes. Do not add "while we're at it" features.
- **No comments explaining WHAT.** Well-named identifiers do that. Only add a comment when the WHY is non-obvious: a hidden constraint, a subtle invariant, a bug workaround.
- **Type safety at boundaries.** Validate and type all external data (API responses, user input, database reads) at the point of entry. Trust internal typed code.
- **No security vulnerabilities.** No SQL injection, XSS, command injection, or OWASP Top 10 issues. Use parameterized queries via Drizzle. Sanitize all user input before rendering.
- **Prefer editing existing files** over creating new ones. Do not create files speculatively.
- **Match scope to what was asked.** A bug fix is not an invitation to refactor surrounding code.

---

## Testing Principles

- **Unit tests (Vitest):** Cover pure functions, data transformations, and utility logic.
- **Component tests (React Testing Library):** Test components from the user's perspective — what they see and interact with, not implementation details.
- **End-to-end tests (Playwright):** Cover critical user journeys: viewing asset prices, setting alerts, navigating between views.
- **No mocking internals.** Do not mock modules within the same codebase. Mock only external boundaries (network, database) using established patterns.
- **Tests gate /build.** A /build task is not complete until its tests pass. Never mark a task done with a failing test suite.
- **Tests live next to the code they test.** Unit and component tests in `__tests__/` adjacent to source. Playwright tests in `e2e/`.

---

## What NOT to Do

- **Do not skip SDD stages.** No /design before /define is approved. No /build before /tasks is approved.
- **Do not make architectural decisions before /define.** Technology choices beyond the stack are spec-driven.
- **Do not begin implementation before /design is approved.** Mockups and specs drive implementation, not intuition.
- **Do not add features not in the approved spec.** Open a new /brainstorm for anything out of scope.
- **Do not force-push to main.** Ever.
- **Do not skip pre-commit hooks** (`--no-verify`). Fix the underlying issue instead.
- **Do not commit secrets, API keys, or credentials.** Use environment variables. Use `.env.local` locally; never commit it.
- **Do not write `any` in TypeScript** except as a last resort with a comment explaining why.
- **Do not leave `console.log` in production code.** Use a structured logger.

---

## Communication During /build

- **Always summarize each completed task.** After marking a task done, output a summary table showing: what was built, files created/modified, done-criteria checks (✓/✗), and any notable decisions or deviations. Then ask if the user wants to continue to the next task.

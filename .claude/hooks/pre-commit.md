# Pre-Commit Hook

## Purpose

This document defines what the pre-commit hook must enforce once the project enters the /build phase. The hook runs automatically before every commit and blocks the commit if any check fails.

Configure this hook in `.husky/pre-commit` or via the `lint-staged` configuration in `package.json` when the project is initialized during /build.

---

## Required Checks

### 1. TypeScript Type Check

```bash
tsc --noEmit
```

- Must pass with zero errors
- Strict mode is enabled (`"strict": true` in `tsconfig.json`)
- No `// @ts-ignore` without an explanatory comment immediately above it

---

### 2. Linting

```bash
eslint . --max-warnings 0
```

- Must pass with zero errors and zero warnings
- No `// eslint-disable` without an explanatory comment immediately above it
- ESLint config must include rules for React, TypeScript, and accessibility (jsx-a11y)

---

### 3. Unit Tests

```bash
vitest run
```

- All unit and component tests must pass
- No skipped tests (`it.skip`, `describe.skip`, `test.skip`) without a comment explaining why and a tracking ticket
- Coverage must not drop below the baseline established at project initialization

---

### 4. No Stray Console Logs

Scan `src/` for raw `console.log`, `console.error`, `console.warn` calls:

```bash
grep -r "console\.\(log\|warn\|error\)" src/ --include="*.ts" --include="*.tsx"
```

- Raw console calls are not permitted in `src/`
- Use the project's structured logger instead (configured during /build)
- Exception: files explicitly named `logger.ts` or `logger.tsx`

---

## What the Hook Does NOT Do

- Does NOT run Playwright e2e tests (too slow for pre-commit; run in CI)
- Does NOT run database migrations
- Does NOT build the Next.js application (run in CI)

---

## Bypassing the Hook

**Never use `--no-verify`** to skip the hook.

If the hook is failing:
1. Read the error output carefully
2. Fix the underlying issue
3. Commit again

If a check is producing a false positive, investigate and fix the rule or the code — do not suppress it.

---

## CI Integration

The same checks that run in the pre-commit hook must also run in CI on every pull request. The CI pipeline should additionally run:

- `next build` — production build must succeed
- `playwright test` — e2e tests against a deployed preview environment
- Database migration dry-run

CI configuration is defined during /build when the project is initialized.

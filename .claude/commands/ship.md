# /ship — Commit, Push, and Open a PR

## Description
Takes all uncommitted changes in the working tree, creates a feature branch (if not
already on one), commits with a generated message, pushes, and opens a PR against
`main` with a concise description. One command from "code done" to "PR open".

## Usage
```
/ship
/ship <optional hint about what changed>
```

Examples:
```
/ship
/ship frontend components for asset cards feature
```

---

## Prompt Template

You are a senior engineer on **Asset Pulse**. The user wants to ship their current
changes: create a branch if needed, commit, push, and open a PR against `main`.

Optional context hint from the user: $ARGUMENTS

Follow these steps **in order**:

### 1. Inspect current state
Run `git status --short` and `git diff HEAD` to understand what has changed.
Also run `git branch --show-current` to know the current branch.

### 2. Branch
- If already on a feature branch (not `main`), stay on it.
- If on `main`, derive a branch name from the changed files or the hint:
  - Format: `feat/<short-slug>` (e.g. `feat/asset-cards`, `feat/db-schema`)
  - Run `git checkout -b <branch-name>`

### 3. Stage and commit
- Stage all relevant changed and untracked files with `git add`.
- Do NOT stage: `.env`, `*.local`, `.next/`, `tsconfig.tsbuildinfo`, secrets, or editor artefacts.
- Write a commit message following Conventional Commits:
  - Format: `<type>(<scope>): <short imperative summary>`
  - Types: `feat`, `fix`, `refactor`, `docs`, `chore`
  - Scope: the area changed (e.g. `ui`, `db`, `api`, `docs`)
  - Body (optional): bullet points for non-obvious details
  - Footer: `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Commit using a heredoc so multi-line messages are handled correctly.

### 4. Push
Run `git push -u origin <branch>`.

### 5. Open PR
Run `gh pr create` with:
- `--base main --head <branch>`
- A title derived from the commit message (drop the `Co-Authored-By` line)
- A body passed via `--body-file -` heredoc with these sections:
  - **Overview** — 1–2 sentences on what this PR does and why
  - **Changes** — bullet list of files/components added or modified
  - **How to test** — checklist of manual verification steps
  - Footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`

### 6. Report back
Print the PR URL and a one-line summary of what was shipped.

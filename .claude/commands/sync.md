# /sync — Switch to Main and Pull Latest

## Description
Switches to the `main` branch and pulls the latest changes from origin.
Use this after merging a PR to get your local main up to date.

## Usage
```
/sync
```

---

## Prompt Template

You are a senior engineer on **Asset Pulse**.

Run the following commands in order:

1. `git checkout main`
2. `git pull origin main --rebase`

Report which branch you switched from, how many files changed, and confirm
the local `main` is now up to date with origin.

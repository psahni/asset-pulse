# .claude/commands/quality-check.md

Run a full quality audit on the file or component
specified in $ARGUMENTS.

Check all of the following and report findings
with severity (Critical / Warning / Info):

Next.js best practices
React best practices
TypeScript strictness
Design pattern compliance
Test coverage exists
ESLint compliance

Output a structured report:
✅ Passed checks
❌ Failed checks with exact fix required
⚠️  Warnings with recommendation

Do not fix anything. Report only.
I will decide what to fix.

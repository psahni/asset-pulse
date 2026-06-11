# .claude/skills/component-review/SKILL.md

---

name: component-review
description: >
Automatically review any React or Next.js component
for best practices violations. Trigger when creating
or modifying any .tsx component file.

---

Before finalising any component, check:

Next.js:
□ Is "use client" only added if interactivity needed?
□ Is data fetching in Server Component not useEffect?
□ Is next/image used instead of <img>?
□ Is next/link used instead of <a>?

React:
□ Is component under 150 lines?
□ Are props typed with an interface?
□ Is index used as key anywhere in .map()?
□ Are all useEffect dependencies correct?

TypeScript:
□ Is any type used anywhere?
□ Are return types explicitly defined?
□ Are all props interfaces exported?

If any check fails:
→ Fix the violation before completing the task
→ Explain what was wrong and why it was fixed

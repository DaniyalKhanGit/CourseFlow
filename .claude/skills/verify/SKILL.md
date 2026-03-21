---
name: verify
description: Run lint, type check, and tests to verify the project is in a good state. Update commands once the stack is scaffolded.
---

Run the following checks in order and report any failures:

1. **Lint** — run the project linter (e.g., `npm run lint` or `npx eslint .`)
2. **Type check** — run the TypeScript compiler check (e.g., `npx tsc --noEmit`)
3. **Tests** — run the test suite (e.g., `npm test`)

> These commands are placeholders. Update this skill once the build system and test framework are set up. Check CLAUDE.md for the current commands.

If any step fails, show the error output and suggest a fix before marking done.

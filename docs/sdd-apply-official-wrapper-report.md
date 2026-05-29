# SDD Apply Report: add-mercadopago-official-wrapper

status: completed

## Executive summary

Implemented the isolated official Mercado Pago MCP wrapper module under `src/mercadopago-official-wrapper/`. The existing docs MCP remains unchanged as the default `pnpm start` entrypoint, while `pnpm start:official` now launches a local stdio bridge that validates `AUTH_HEADER`, spawns `npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:<AUTH_HEADER>`, sanitizes stderr/errors, and exposes injectable seams for mocked tests.

## Artifacts

- `openspec/changes/add-mercadopago-official-wrapper/apply-progress.md`
- `openspec/changes/add-mercadopago-official-wrapper/tasks.md`
- `docs/mercadopago-official-wrapper.md`
- `docs/sdd-apply-official-wrapper-report.md`

## Tests

- `pnpm test` baseline before changes: 13 files, 85 tests passed.
- RED: `pnpm test` failed after new tests because `src/mercadopago-official-wrapper/index.js` did not exist.
- GREEN/final: `pnpm test` passed — 16 files, 97 tests.
- Final build: `pnpm build` passed.

## Changed files

- `src/mercadopago-official-wrapper/config.ts`
- `src/mercadopago-official-wrapper/command.ts`
- `src/mercadopago-official-wrapper/errors.ts`
- `src/mercadopago-official-wrapper/runner.ts`
- `src/mercadopago-official-wrapper/server.ts`
- `src/mercadopago-official-wrapper/index.ts`
- `tests/mercadopago-official-wrapper/config-command-errors.test.ts`
- `tests/mercadopago-official-wrapper/runner.test.ts`
- `tests/mercadopago-official-wrapper/integration-docs.test.ts`
- `docs/mercadopago-official-wrapper.md`
- `README.md`
- `package.json`
- `openspec/changes/add-mercadopago-official-wrapper/tasks.md`
- `openspec/changes/add-mercadopago-official-wrapper/apply-progress.md`

## Review size

Single PR path remains under the approved 800-line budget: approximately 671 hand-authored implementation/test/doc/package/README lines by file line count. Existing untracked OpenSpec proposal/design/tasks/report artifacts from prior SDD phases are separate review context.

## Risks

- Runtime still depends on local `npx` and package/network availability for `mcp-remote`.
- No live Mercado Pago MCP call was made by design; Pi/OpenCode should be smoke-tested manually with a real token outside source control.
- Upstream official MCP/auth errors may still be opaque through `mcp-remote`, but wrapper stderr redaction prevents token leakage.

## Next recommended

- Run a fresh review before PR/merge.
- Build locally and configure Pi/OpenCode with `docs/mercadopago-official-wrapper.md` using a real local-only `AUTH_HEADER`.

## Skill resolution

paths-injected

Loaded:

- `/home/juan/.config/opencode/skills/work-unit-commits/SKILL.md`
- `/home/juan/.config/opencode/skills/cognitive-doc-design/SKILL.md`

## Memory

Memory tools were unavailable in this subagent tool namespace; no Engram save/session summary was written.

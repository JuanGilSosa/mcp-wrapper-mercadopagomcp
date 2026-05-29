# Apply Progress: add-mercadopago-official-wrapper

## Delivery decision

Single PR under the user-approved 800-line review budget. The 400-line guard was acknowledged as high risk, but the wrapper is isolated; split only if hand-authored changed lines exceed 800.

## Completed tasks

- Created RED tests for config/command/error handling, runner lifecycle, docs preservation, package wiring, and Pi/OpenCode docs.
- Implemented isolated `src/mercadopago-official-wrapper/` module.
- Added `start:official` while preserving `start: node dist/server.js`.
- Added Pi/OpenCode wrapper documentation and linked it from README.
- Updated `tasks.md` checkboxes and delivery guard to reflect the approved single-PR path.

## Files changed

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

## TDD Cycle Evidence

| Cycle | RED evidence | GREEN / refactor evidence |
|-------|--------------|---------------------------|
| Config/command/errors | `pnpm test` failed because `../../src/mercadopago-official-wrapper/index.js` did not exist for new tests. | Added config/command/errors/index sources; covered documented placeholder command, effective spawn args, auth validation, and redaction. |
| Runner lifecycle | Same RED run included missing runner exports for mocked lifecycle tests. | Added injectable runner with mocked spawn/stdio/timer seams; tests cover spawn args, bridging, sanitized stderr, spawn error, non-zero close, and startup timeout cleanup. |
| Docs/package preservation | Same RED run included missing wrapper module/docs/package wiring. | Added `start:official`, wrapper docs, README link; tests assert `pnpm start` remains `node dist/server.js` and docs MCP exports remain available. |
| Final refactor | N/A after GREEN; only focused cleanup/verification. | `pnpm test` passed: 16 files, 97 tests. `pnpm build` passed. |

## Commands run

- `pnpm test` — baseline before changes: 13 files, 85 tests passed.
- `pnpm test` — RED after tests: 3 new suites failed with missing wrapper module imports.
- `pnpm test` — GREEN/final: 16 files, 97 tests passed.
- `pnpm build` — passed.
- Fresh review found one blocker: startup timeout only cleared on child stdout, so an idle but successfully spawned bridge could be killed.
- Post-review fix: clear startup timeout on child `spawn`, first stdout data, or first stderr data; add idempotent signal cleanup coverage.
- `pnpm test && pnpm build` after review fix — passed: 16 files, 99 tests; build passed.
- `git diff --stat`, `git diff --numstat`, and line-count check for review size.

No dependency install/add command was required.

## Deviations from design

- Combined config, command, and errors tests into one concise test file to keep review size under 800 lines.
- Combined docs preservation, package wiring, and docs assertions into one integration/static test file for the same reason.
- Did not export wrapper APIs from top-level `src/index.ts`; this keeps existing docs public surface stable while wrapper APIs remain available from their module path.

## Remaining tasks

- Optional second fresh review before PR/merge after the startup-timeout fix.
- If a real Pi/OpenCode environment still fails, collect client stderr and verify local Node/npm can run `npx -y mcp-remote`.

## Workload / PR boundary

- Approved path: single PR under 800 lines.
- Hand-authored changed/new implementation, tests, docs, and package/README wiring are approximately 671 lines by file line count; below 800.
- The change is isolated to wrapper module, tests, docs, package script, and OpenSpec progress/tasks updates.

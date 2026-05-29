# Tasks: add-mercadopago-official-wrapper

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 520-780 additions/deletions |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 config/command/errors → PR 2 runner lifecycle/stdio bridge → PR 3 docs/package wiring/verification |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: single-pr-under-800-approved
400-line budget risk: High

Note: the user-approved review budget for this change is 800 lines, so a tightly scoped implementation may still fit one PR under that budget. The 400-line SDD guard is high risk because the design forecasts 520-780 changed lines. Confirm single-PR under 800 vs chained PRs before `sdd-apply`.

## Non-goals and safety notes

- Do not delete, replace, or weaken `src/mercadopago-docs/**`.
- Keep existing `pnpm start` behavior stable: it must continue to launch `dist/server.js` for the curated docs MCP server.
- Do not implement a custom HTTP MCP client or make live calls to `https://mcp.mercadopago.com/mcp` in tests.
- Do not hardcode, commit, echo, snapshot, or log real access tokens.
- Use pnpm only. If any install/add becomes necessary, use `pnpm ... --ignore-scripts`; no dependency install is expected.

## Acceptance criteria

- [x] New isolated wrapper module exists under `src/mercadopago-official-wrapper/` with no auto-start side effects from its `index.ts`.
- [x] Wrapper validates `AUTH_HEADER=Bearer <ACCESS_TOKEN>` before spawning and rejects missing, empty, or non-Bearer auth.
- [x] Effective child command is `npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:<AUTH_HEADER value>`.
- [x] Safe/redacted views never expose `Bearer <ACCESS_TOKEN>` or `Authorization:Bearer <ACCESS_TOKEN>`.
- [x] Runner uses injectable spawn/stdio/timer seams and unit tests never invoke real `npx` or the official MCP endpoint.
- [x] Local stdin/stdout bridge, sanitized stderr, startup timeout, child close, and signal cleanup are covered by tests.
- [x] Existing docs MCP exports and default `src/server.ts`/`src/index.ts` behavior remain stable.
- [x] Pi/OpenCode configuration docs show the local wrapper path, required env shape, safe pnpm commands, and troubleshooting.
- [x] Strict TDD evidence is recorded: failing RED test output before implementation, then GREEN verification with `pnpm test`.

## Work units

### 0. Pre-apply decision gate

- [x] Confirm delivery strategy before implementation because the 400-line SDD guard forecasts High risk while the approved project review budget is 800 lines.
  - Files/artifacts: `openspec/changes/add-mercadopago-official-wrapper/tasks.md`.
  - Verification: decision recorded in apply notes before code changes.
  - Rollback: no code changes in this gate.

### 1. RED: config, command, and redaction tests

- [x] Add failing Vitest tests for auth parsing and command construction.
  - Target files: `tests/mercadopago-official-wrapper/config.test.ts`, `tests/mercadopago-official-wrapper/command.test.ts`, `tests/mercadopago-official-wrapper/errors.test.ts`.
  - Test cases:
    - documented client evidence shape uses `npx`, `-y`, `mcp-remote`, official URL, `--header`, `Authorization:${AUTH_HEADER}`, and `env.AUTH_HEADER`;
    - effective spawn args contain `Authorization:Bearer <ACCESS_TOKEN>` because Node spawn does not expand placeholders;
    - missing/empty `AUTH_HEADER` fails before spawn;
    - non-Bearer auth fails before spawn;
    - safe command views and mapped errors redact token values.
  - Verification: run `pnpm test` and record expected failures.
  - Rollback: remove only these new test files.

### 2. GREEN: implement config, command, and stable errors

- [x] Implement the smallest source needed to pass Work Unit 1.
  - Target files: `src/mercadopago-official-wrapper/config.ts`, `src/mercadopago-official-wrapper/command.ts`, `src/mercadopago-official-wrapper/errors.ts`, `src/mercadopago-official-wrapper/index.ts`.
  - Requirements:
    - default remote URL: `https://mcp.mercadopago.com/mcp`;
    - default command: `npx`;
    - default args: `['-y', 'mcp-remote', remoteUrl, '--header', 'Authorization:<authHeader>']`;
    - stable error codes: `MissingAuth`, `InvalidAuth`, `SpawnFailed`, `StartupTimeout`, `ChildExited`, `BridgeClosed`;
    - redaction handles full `AUTH_HEADER`, `Bearer <token>`, and `Authorization:Bearer <token>` forms.
  - Verification: `pnpm test` passes for the new config/command/error tests.
  - Rollback: remove `src/mercadopago-official-wrapper/{config,command,errors,index}.ts` and related tests.

### 3. TRIANGULATE: edge cases for config and redaction

- [x] Add additional failing tests for whitespace trimming, inherited environment preservation without wholesale logging, and redaction inside stderr-like strings.
  - Target files: same tests from Work Unit 1.
  - Verification: run `pnpm test` and record RED failures.
- [x] Update implementation until these tests pass without broadening scope.
  - Target files: same source files from Work Unit 2.
  - Verification: `pnpm test`.
  - Rollback: revert this work unit independently if redaction behavior becomes too broad or brittle.

### 4. RED: runner lifecycle and stdio bridge tests

- [x] Add failing tests around mocked child process boundaries.
  - Target file: `tests/mercadopago-official-wrapper/runner.test.ts`.
  - Test cases:
    - spawn is not called when config validation fails;
    - spawn receives command, args, env, and `stdio: ['pipe', 'pipe', 'pipe']`;
    - local stdin pipes to child stdin and child stdout pipes to local stdout;
    - child stderr is forwarded only after token redaction;
    - spawn `error` maps to `SpawnFailed` without leaking token/internals;
    - startup timeout maps to `StartupTimeout` and kills/cleans child;
    - child non-zero close maps to `ChildExited`;
    - zero close resolves as normal `BridgeClosed` behavior;
    - SIGINT/SIGTERM/SIGHUP cleanup is idempotent.
  - Verification: run `pnpm test` and record expected failures.
  - Rollback: remove `runner.test.ts` only.

### 5. GREEN: implement injectable runner and server entrypoint

- [x] Implement the stdio bridge runner with injectable spawn, streams, and timers.
  - Target file: `src/mercadopago-official-wrapper/runner.ts`.
  - Requirements:
    - validate synchronously before spawn;
    - use `child_process.spawn` only behind an injectable `SpawnLike` seam;
    - pipe stdin/stdout without parsing MCP JSON-RPC;
    - sanitize child stderr before forwarding;
    - clear startup timeout on first child output or spawn success signal defined by implementation tests;
    - make cleanup idempotent.
- [x] Add side-effect entrypoint for clients.
  - Target file: `src/mercadopago-official-wrapper/server.ts`.
  - Requirements:
    - parse `process.env.AUTH_HEADER` at runtime;
    - never log raw env or tokens;
    - set process exit code from mapped runner result/errors.
  - Verification: `pnpm test`.
  - Rollback: remove `runner.ts` and `server.ts`; earlier config/command/errors module remains isolated.

### 6. TRIANGULATE: preserve existing docs MCP behavior

- [x] Add failing regression tests that protect the current docs MCP entry points.
  - Target files: `tests/mercadopago-official-wrapper/docs-preservation.test.ts` or existing docs test location if present.
  - Test cases:
    - `src/index.ts` still exports existing `mercadopago-docs` APIs;
    - `src/server.ts` remains the default docs MCP server entrypoint;
    - no wrapper module import causes the docs server to spawn `mcp-remote`.
  - Verification: run `pnpm test` and record RED failures if current coverage is missing.
- [x] Make only minimal export/package adjustments needed for the wrapper while preserving docs behavior.
  - Target files: `src/index.ts`, `src/server.ts` only if needed; prefer no change to `src/server.ts`.
  - Verification: `pnpm test` and inspect `package.json` to confirm `start` remains `node dist/server.js`.
  - Rollback: revert only export/package wiring changes.

### 7. RED/GREEN: package wiring and local launch path

- [x] Add failing tests or static assertions for wrapper launch wiring.
  - Target files: `tests/mercadopago-official-wrapper/package-wiring.test.ts`, `package.json`.
  - Expected wiring: keep `start` unchanged and add a focused script such as `start:official` pointing to `node dist/mercadopago-official-wrapper/server.js`.
  - Verification: run `pnpm test` and record RED failures.
- [x] Update `package.json` minimally.
  - Target file: `package.json`.
  - Requirements:
    - do not add dependencies unless a separate approved decision is recorded;
    - keep `build`, `start`, and `test` stable;
    - add only wrapper-specific script/bin wiring if tests require it.
  - Verification: `pnpm test` and `pnpm build`.
  - Rollback: remove the new script/bin entry.

### 8. RED/GREEN: client documentation

- [x] Add failing documentation tests or static checks for Pi/OpenCode examples.
  - Target files: `tests/mercadopago-official-wrapper/readme.test.ts`, `README.md` and/or `docs/mercadopago-official-wrapper.md`.
  - Required doc assertions:
    - local wrapper config uses `node` plus absolute path to `dist/mercadopago-official-wrapper/server.js`;
    - env contains `AUTH_HEADER: "Bearer <ACCESS_TOKEN>"`;
    - existing docs MCP remains separately available;
    - tokens stay outside source control;
    - commands use `pnpm install --ignore-scripts`, `pnpm build`, and `pnpm test`;
    - troubleshooting covers missing `npx`, missing/invalid auth, startup latency, and upstream official MCP errors.
  - Verification: run `pnpm test` and record RED failures.
- [x] Write concise docs with happy path first and troubleshooting second.
  - Target files: `docs/mercadopago-official-wrapper.md`; optionally link from `README.md`.
  - Verification: `pnpm test`.
  - Rollback: remove docs link and wrapper doc file.

### 9. REFACTOR: review boundaries, naming, and duplication

- [x] Refactor only after tests are GREEN.
  - Target files: `src/mercadopago-official-wrapper/**`, `tests/mercadopago-official-wrapper/**`, docs touched above.
  - Checks:
    - public names are stable and wrapper-specific;
    - no import cycle with `src/mercadopago-docs/**`;
    - no raw token can appear in thrown messages, stderr forwarding, snapshots, or docs examples;
    - each work unit remains independently revertible.
  - Verification: `pnpm test` and `pnpm build`.
  - Rollback: revert only refactor commits; keep prior GREEN behavior.

### 10. Final verification and evidence capture

- [x] Run final verification commands.
  - Commands: `pnpm test`, `pnpm build`.
  - If any dependency command was required, record exact command and confirm it used `--ignore-scripts`.
- [x] Record TDD evidence in the apply report.
  - Include RED failure summaries, GREEN pass summaries, and final `pnpm test`/`pnpm build` results.
- [x] Check review size before PR.
  - Command target: `git diff --stat` and changed-line count.
  - If changed lines exceed 800, stop and split before PR. If changed lines exceed 400, either follow the pre-approved chain decision or record why the 800-line approved budget is being used.

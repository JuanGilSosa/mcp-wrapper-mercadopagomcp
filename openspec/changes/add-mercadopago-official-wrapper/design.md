# Design: Official Mercado Pago MCP Wrapper

Add a separate stdio bridge runner that lets Pi and OpenCode launch the official Mercado Pago MCP server through this project when direct remote configuration fails. The existing curated docs MCP server remains the default and `src/mercadopago-docs` is not deleted, replaced, or weakened.

## Decision summary

| Area | Decision |
|------|----------|
| Runner shape | Add a dedicated wrapper entrypoint under `src/mercadopago-official-wrapper/`; do not modify current `src/server.ts` beyond optional package/script wiring. |
| Bridge model | Local MCP client stdio is piped to a spawned `npx -y mcp-remote ...` child process, and child stdout is piped back to the local client. |
| Official target | `https://mcp.mercadopago.com/mcp` only. |
| Auth input | Require `AUTH_HEADER=Bearer <ACCESS_TOKEN>` at runtime; fail before spawning when missing or malformed. |
| Existing docs server | `src/server.ts`, `src/index.ts`, and `src/mercadopago-docs/**` behavior stay stable; docs server remains `pnpm start`. |
| Test strategy | Strict TDD in apply: Vitest tests first, mocked process boundaries only, `pnpm test` for verification. |
| Review plan | Likely single PR under 800 changed lines if docs stay focused; split only if implementation plus docs grows past budget. |

## Context and constraints

The official connection evidence is:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "mcp-remote",
    "https://mcp.mercadopago.com/mcp",
    "--header",
    "Authorization:${AUTH_HEADER}"
  ],
  "env": {
    "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
  }
}
```

Pi and OpenCode cannot use that direct official configuration reliably for the user. This project will provide a local stdio runner that those clients can launch instead.

Important implementation note: `child_process.spawn(command, args)` does not expand `${AUTH_HEADER}` placeholders. The wrapper therefore parses `AUTH_HEADER` itself and builds the effective child argument as `Authorization:${authHeader}` while documenting the official evidence above. Tests should assert both the documented official shape and the effective spawn shape with redaction.

## Module boundaries

Create a new isolated module:

```text
src/mercadopago-official-wrapper/
  config.ts      # env parsing, defaults, validation
  command.ts     # official command construction and safe/redacted views
  errors.ts      # stable wrapper errors and redaction helpers
  runner.ts      # injectable child process runner and stdio bridge lifecycle
  server.ts      # side-effect stdio entrypoint for clients
  index.ts       # public exports for tests/docs, no auto-start side effects
```

Optional package wiring in apply:

- Add script such as `start:official` → `node dist/mercadopago-official-wrapper/server.js`.
- Optionally add `bin` entries for client-friendly absolute command targets.
- Keep existing `start` → current docs server behavior.
- Do not add a runtime dependency for `mcp-remote`; the bridge intentionally invokes `npx -y mcp-remote`.

Top-level `src/index.ts` may export wrapper types/functions only if useful, but must not introduce side effects or change existing docs exports.

## Public contracts

### Config parsing

`parseOfficialWrapperConfig(input)` should accept injected inputs for tests:

```ts
type OfficialWrapperConfigInput = {
  env?: NodeJS.ProcessEnv;
  startupTimeoutMs?: number;
  shutdownGraceMs?: number;
};
```

It returns a config containing:

- `authHeader`: trimmed `AUTH_HEADER` value.
- `remoteUrl`: default `https://mcp.mercadopago.com/mcp`.
- `command`: default `npx`.
- `args`: `['-y', 'mcp-remote', remoteUrl, '--header', `Authorization:${authHeader}`]`.
- `redactedArgs`: same shape with token replaced, for logs/errors.
- `startupTimeoutMs`: default around 10 seconds.
- `shutdownGraceMs`: default around 2 seconds.

Validation rules:

- Missing or empty `AUTH_HEADER` fails before spawn.
- Prefer requiring `Bearer ` prefix to catch common client env mistakes.
- Never accept tokens from source files, package scripts, or committed config examples.

### Command construction

`buildOfficialRemoteCommand(config)` should be pure and deterministic:

```ts
type OfficialRemoteCommand = {
  command: 'npx';
  args: string[];
  env: NodeJS.ProcessEnv;
  redacted: { command: string; args: string[] };
};
```

The effective child command is:

```bash
npx -y mcp-remote https://mcp.mercadopago.com/mcp --header "Authorization:Bearer <ACCESS_TOKEN>"
```

The docs/client evidence remains the placeholder form `Authorization:${AUTH_HEADER}` plus `env.AUTH_HEADER`.

### Injectable runner

`runOfficialWrapper(options)` should accept injectable process and stdio dependencies:

```ts
type SpawnLike = (
  command: string,
  args: readonly string[],
  options: { env: NodeJS.ProcessEnv; stdio: ['pipe', 'pipe', 'pipe'] },
) => ChildProcessLike;

type OfficialWrapperRunnerOptions = {
  config?: OfficialWrapperConfig;
  spawn?: SpawnLike;
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  now?: () => number;
  setTimeout?: typeof globalThis.setTimeout;
  clearTimeout?: typeof globalThis.clearTimeout;
};
```

This keeps tests isolated from real `npx`, real network, and real Mercado Pago services.

## Stdio bridge data flow

```text
Pi/OpenCode
  command: node dist/mercadopago-official-wrapper/server.js
  env.AUTH_HEADER=Bearer <ACCESS_TOKEN>
        │ stdin/stdout MCP JSON-RPC
        ▼
local wrapper runner
  validates env, starts child, owns lifecycle
        │ stdin -> child.stdin
        │ child.stdout -> stdout
        │ child.stderr -> sanitized stderr
        ▼
npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:<token>
        │ remote MCP transport
        ▼
https://mcp.mercadopago.com/mcp
```

Bridge behavior:

- Pipe local `stdin` to child `stdin` and child `stdout` to local `stdout` without parsing MCP messages.
- Pipe child `stderr` to local `stderr` only after token redaction.
- On local stdin end, close child stdin.
- On child close, resolve/reject with mapped wrapper status and set process exit code in `server.ts`.
- On SIGINT/SIGTERM/SIGHUP, ask the child to terminate, then force-kill after `shutdownGraceMs`.

## Error model and redaction

Define stable errors separate from `src/mercadopago-docs/errors.ts`:

| Code | When | Visible message |
|------|------|-----------------|
| `MissingAuth` | `AUTH_HEADER` missing/empty | `AUTH_HEADER is required and must be set to Bearer <ACCESS_TOKEN>.` |
| `InvalidAuth` | Auth present but wrong shape | `AUTH_HEADER must use the Bearer scheme.` |
| `SpawnFailed` | `spawn` emits error | `Failed to start Mercado Pago official MCP bridge.` |
| `StartupTimeout` | Child does not become usable before timeout | `Mercado Pago official MCP bridge did not start in time.` |
| `ChildExited` | Child exits non-zero | `Mercado Pago official MCP bridge exited unexpectedly.` |
| `BridgeClosed` | Normal close | Not an error when exit code is 0. |

Redaction rules:

- Redact the complete `AUTH_HEADER` value wherever it appears.
- Redact both `Bearer <token>` and `Authorization:Bearer <token>` forms.
- Redact command args, thrown errors, stderr forwarding, and test snapshots.
- Do not log environment objects wholesale.

## Lifecycle and timeout behavior

- Validate configuration synchronously before spawn.
- Start child with `stdio: ['pipe', 'pipe', 'pipe']` and inherited environment plus explicit `AUTH_HEADER`.
- Startup timeout protects clients from hanging on missing `npx`, package-cache stalls, or blocked network. In unit tests, drive this with injected timers.
- The runner treats the first child output or spawn success as enough to clear startup timeout; it does not make a live MCP initialize call in unit scope.
- Cleanup must be idempotent: multiple close/error/signal events must not double-reject or double-kill.
- No unit test may call the official URL or invoke real `npx`.

## Documentation plan

Update README or add `docs/mercadopago-official-wrapper.md` with a short happy path first.

### Pi/OpenCode local wrapper config

After `pnpm build`, clients should point to the local wrapper, not directly to the official remote config:

```json
{
  "mcpServers": {
    "mercado-pago-official": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-mercadopago-glosari/dist/mercadopago-official-wrapper/server.js"
      ],
      "env": {
        "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
      }
    }
  }
}
```

Docs must also show:

- Existing docs MCP config remains available separately as `mercado-pago-docs`.
- Real tokens must stay outside source control.
- Required commands use pnpm only: `pnpm install --ignore-scripts`, `pnpm build`, `pnpm test`.
- Troubleshooting for missing `npx`, missing/invalid `AUTH_HEADER`, `mcp-remote` startup latency, and upstream official MCP errors.

## TDD seams and required tests

Apply phase must follow `RED -> GREEN -> TRIANGULATE -> REFACTOR` with `pnpm test`.

Recommended test files:

```text
tests/mercadopago-official-wrapper/config.test.ts
tests/mercadopago-official-wrapper/command.test.ts
tests/mercadopago-official-wrapper/errors.test.ts
tests/mercadopago-official-wrapper/runner.test.ts
tests/mercadopago-official-wrapper/readme.test.ts
```

Required failing tests before implementation:

1. Builds the official documented client evidence shape with `npx`, `-y`, `mcp-remote`, official URL, `--header`, `Authorization:${AUTH_HEADER}`, and `env.AUTH_HEADER`.
2. Builds the effective spawn command with `Authorization:Bearer <ACCESS_TOKEN>` because Node spawn does not expand env placeholders.
3. Rejects missing/empty `AUTH_HEADER` before spawn.
4. Rejects non-Bearer auth before spawn.
5. Redacts token values from safe command views, mapped errors, and stderr forwarding.
6. Maps spawn errors to `SpawnFailed` without leaking internals.
7. Enforces startup timeout and cleans up the child.
8. Pipes stdin/stdout and sanitizes stderr through mocked streams.
9. Handles child close and termination signals idempotently.
10. Preserves existing docs MCP exports/server factory and default `src/server.ts` behavior.
11. Documents Pi and OpenCode local wrapper config and safe pnpm commands.

## Rollout and review forecast

Expected apply workload:

| Area | Forecast |
|------|----------|
| Wrapper source | ~220-320 lines |
| Tests | ~220-320 lines |
| Docs/package wiring | ~80-140 lines |
| Total hand-authored | ~520-780 lines |

This should fit a single PR under the 800-line review budget if implementation remains focused and avoids broad README rewrites. If RED/GREEN work exceeds the forecast, split into chained PRs:

1. Config/command/errors/tests.
2. Runner/stdio lifecycle/tests.
3. Client docs/package wiring/tests.

No dependency install is expected. If any dependency operation becomes necessary, use pnpm only and include `--ignore-scripts`.

## Out of scope

- Replacing the curated docs MCP server.
- Implementing a custom HTTP MCP client.
- Live integration tests against `https://mcp.mercadopago.com/mcp`.
- Committing access tokens or sample real credentials.
- Renaming existing `mercado_pago_search_docs` or `mercado_pago_read_doc` tools.

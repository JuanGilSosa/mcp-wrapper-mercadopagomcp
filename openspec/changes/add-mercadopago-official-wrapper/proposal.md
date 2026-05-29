# Change Proposal: add-mercadopago-official-wrapper

## Problem
The official Mercado Pago MCP server is available at `https://mcp.mercadopago.com/mcp`, but the user cannot connect to it directly from Pi or OpenCode using the official remote configuration. The project already has a local TypeScript MCP server for curated Mercado Pago documentation, so the smallest useful path is to add a separate local wrapper module that bridges local MCP clients to the official remote MCP server without replacing existing docs behavior.

## Intent
Add a controlled wrapper module that lets the local MCP server connect to the official Mercado Pago MCP server through `mcp-remote` as a child/stdio bridge. The wrapper should expose a stable local surface for Pi and OpenCode while preserving all existing `src/mercadopago-docs` code and the current `createMercadoPagoDocsMcpServer` entry point.

## Evidence From Official Docs
Known official configuration pattern:

```bash
AUTH_HEADER="Bearer <ACCESS_TOKEN>" \
  npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:${AUTH_HEADER}
```

Equivalent client shape uses:

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

## Goals
- Add a new TypeScript module for the official Mercado Pago MCP wrapper.
- Use `mcp-remote` as a spawned child/stdio bridge instead of implementing a full HTTP MCP client in this slice.
- Keep credentials external: read `AUTH_HEADER` or equivalent environment/config input; never hardcode access tokens.
- Preserve the existing docs MCP implementation in `src/mercadopago-docs` and current docs server factory.
- Provide a stable local launch path/configuration that Pi and OpenCode can use when direct official MCP configuration fails.
- Add strict-TDD tests first in apply phase, using mocked child process/transport boundaries only.
- Use pnpm only; every `pnpm install` or `pnpm add` command must include `--ignore-scripts`.

## Non-Goals
- Do not delete, replace, or weaken the existing Mercado Pago docs MCP module.
- Do not implement a full remote HTTP MCP client in this slice.
- Do not hardcode Mercado Pago access tokens or commit sample real tokens.
- Do not make live calls to `https://mcp.mercadopago.com/mcp` in unit tests.
- Do not change the official docs search/read semantics from the existing docs MCP server as part of this proposal.

## Proposed Scope

### New Module
Create an isolated module, likely under `src/mercadopago-official-wrapper/`, responsible for:

- Building the official remote command:
  - command: `npx`
  - args: `-y`, `mcp-remote`, `https://mcp.mercadopago.com/mcp`, `--header`, `Authorization:${AUTH_HEADER}`
- Validating required auth configuration before spawning.
- Spawning and supervising the child process through an injectable process runner for tests.
- Mapping startup/auth/process failures into stable local errors.
- Keeping all wrapper exports separate from `src/mercadopago-docs`.

### Local MCP Surface
Prefer a small controlled local surface for Pi/OpenCode rather than transparent, unbounded proxying:

- A dedicated local runner/config path for the official wrapper.
- Stable local tool names or wrapper entry points that can be documented for client setup.
- Clear separation between:
  - existing docs MCP: local curated docs search/read tools.
  - new official wrapper: bridge to Mercado Pago official MCP via `mcp-remote`.

Final tool names and whether the wrapper is a separate binary or opt-in server mode should be decided in design, with a bias toward minimizing changes to `src/server.ts` and avoiding regressions for current users.

### Authentication
- Required runtime input: `AUTH_HEADER=Bearer <ACCESS_TOKEN>` or an equivalent explicit environment variable documented for clients.
- The wrapper must pass the header in the official format: `Authorization:${AUTH_HEADER}`.
- Tests should assert that missing/empty auth fails before spawn and that token values are not logged.

### Documentation
Document client setup for Pi and OpenCode with:

- Build/start instructions for the local wrapper.
- Required environment variable shape.
- A warning that real tokens must stay outside source control.
- Troubleshooting for missing `npx`, missing auth, and official server connection failures.

## Affected Areas
- New `src/mercadopago-official-wrapper/` module.
- Public exports/barrels only if needed for the wrapper without disrupting existing docs exports.
- Optional new runner file or server mode for the wrapper.
- Tests with mocked process spawning/stdio bridge behavior.
- README or client-configuration docs for Pi and OpenCode.
- OpenSpec follow-up artifacts: design and tasks before implementation.

## Risks
- `mcp-remote` behavior, install/cache behavior, or CLI flags may change upstream.
- `npx -y mcp-remote` can add startup latency and requires network/package availability unless already cached.
- Auth errors from the official MCP server may be opaque when tunneled through `mcp-remote`.
- A transparent proxy could expose unstable upstream tools; a controlled wrapper reduces this risk but may require careful local naming/contract design.
- Pi/OpenCode may differ in environment variable expansion, so docs must show explicit per-client configuration.
- Spawning child processes introduces lifecycle, stderr, timeout, and cleanup edge cases.

## Rollback Plan
- Keep the wrapper isolated so it can be disabled or reverted without touching `src/mercadopago-docs`.
- Preserve the current `src/server.ts` docs MCP behavior unless a later design explicitly adds an opt-in mode.
- If `mcp-remote` proves unreliable, leave the existing docs MCP as the stable default and defer official-server bridging to a later design.
- Remove wrapper docs/config examples and the new module only; no data migration is required.

## Acceptance Outline
- OpenSpec proposal, design, and tasks are captured before implementation proceeds.
- Strict TDD apply phase writes failing Vitest tests before implementation for:
  - command/args construction for `npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:${AUTH_HEADER}`.
  - missing/empty auth rejection before spawn.
  - no token leakage in errors/log-safe output.
  - child process spawn failure mapping.
  - process cleanup/close behavior.
  - preservation of existing docs MCP exports and server factory.
  - documented Pi/OpenCode configuration examples.
- Unit tests use mocked process boundaries and do not make live official MCP network calls.
- Verification command remains `pnpm test`.
- Any dependency operation uses pnpm with `--ignore-scripts`.

## Success Criteria
- Pi and OpenCode users have a documented local MCP configuration path that reaches the official Mercado Pago MCP server through the project wrapper.
- The existing local docs MCP remains available and unchanged in behavior.
- Tokens are supplied only through environment/configuration and are never hardcoded or logged.
- The implementation remains small enough for the 800-line review budget or is split into chained PRs before apply.
- Strict TDD evidence exists for the wrapper behavior and docs preservation.

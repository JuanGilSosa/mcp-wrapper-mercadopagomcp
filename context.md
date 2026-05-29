# Code Context

## Files Retrieved
1. `src/mercadopago-docs/mcp.ts` (lines 1-114) - core MCP adapter: tool constants, handler factory, SDK type alias, and `registerTool` bridge.
2. `src/index.ts` (lines 1-21) - current top-level stdio server entrypoint using `McpServer` and `StdioServerTransport`.
3. `src/mercadopago-docs/index.ts` (lines 1-24) - public package barrel exports; currently omits runner/server factory exports and `OfficialMcpServer`.
4. `package.json` (lines 1-22) - scripts/dependencies; SDK already present, but `start` points at missing `dist/server.js` while source entry compiles from `src/index.ts`.
5. `tsconfig.json` (lines 1-18) - build config; currently includes tests/config outside `rootDir`, causing `pnpm build` to fail.
6. `README.md` (lines 1-62) - integration docs and safety boundaries; no stdio runner/client configuration documented yet.
7. `tests/mercadopago-docs/mcp.test.ts` (lines 1-176) - existing unit coverage for tool handlers and registration with mocked fetch only.
8. `tests/mercadopago-docs/scaffold.test.ts` (lines 1-32) - public surface snapshot; must change if new APIs are exported from `src/mercadopago-docs/index.ts`.
9. `tests/mercadopago-docs/readme.test.ts` (lines 1-23) - README assertions for boundaries and safe dependency commands.

## Key Code

Current reusable MCP adapter is in `src/mercadopago-docs/mcp.ts`:

```ts
export type MercadoPagoDocsHandlerOptions = {
  fetch: FetchLike;
  cache?: MemoryCache<string>;
  index?: readonly IndexedDoc[];
  now?: () => Date;
  extract?: typeof extractDocumentation;
};

export type OfficialMcpServer = McpServer;
```

`createMercadoPagoDocsHandlers(options)` returns `{ callTool(name, input) }`, mapping:
- `mercado_pago_search_docs` -> `searchDocs(input, { index })`
- `mercado_pago_read_doc` -> validates/parses input, resolves `doc_id`, fetches allowlisted doc, extracts content, returns MCP text result.

`registerMercadoPagoDocsTools(server, handlers)` expects only this structural API:

```ts
type ToolRegistrar = {
  registerTool(
    name: string,
    config: Record<string, unknown>,
    handler: (input: unknown) => Promise<McpTextResult>,
  ): unknown;
};
```

Current stdio wiring already exists, but only as top-level side-effect code in `src/index.ts`:

```ts
const server = new McpServer({ name: "mercado-pago-docs", version: "0.1.0" });
const handlers = createMercadoPagoDocsHandlers({
  fetch: globalThis.fetch,
  cache: createMemoryCache({ ttlMs: 300_000, maxEntries: 100 }),
});
registerMercadoPagoDocsTools(server, handlers);
await server.connect(new StdioServerTransport());
```

Expected APIs for a standalone runner:
- SDK imports: `McpServer` from `@modelcontextprotocol/sdk/server/mcp.js`; `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`.
- Prefer extracting a factory like `createMercadoPagoDocsMcpServer(options?: { fetch?: FetchLike; cache?: MemoryCache<string>; index?: readonly IndexedDoc[]; now?: () => Date; extract?: ...; name?: string; version?: string; }) : McpServer` into `src/mercadopago-docs/mcp.ts` or a new `src/mercadopago-docs/server.ts`.
- Prefer a tiny runner file such as `src/server.ts` that imports the factory and calls `await server.connect(new StdioServerTransport())`.

## Architecture

The code separates pure/testable docs behavior from MCP transport:

1. `schemas.ts`, `allowlist.ts`, `fetcher.ts`, `extract.ts`, `search.ts` implement validation, safe fetch/extract, and local search.
2. `mcp.ts` adapts those functions into MCP-compatible tool handlers and registers two tools on any object with `registerTool`.
3. `src/index.ts` currently combines server construction, handler creation, tool registration, and stdio transport connection in one side-effect entrypoint.
4. Tests currently stop at handler/registration unit level. They do not instantiate a real SDK server or stdio transport.

Files likely to touch for the runner:
- `src/mercadopago-docs/mcp.ts`: add/export server factory, or keep adapter only and put factory in a new module.
- `src/server.ts` (new) or repurpose `src/index.ts`: standalone stdio executable entrypoint.
- `src/index.ts`: either become package barrel/root export or delegate to `src/server.ts`; avoid unwanted top-level stdio side effects if this is imported as a library.
- `src/mercadopago-docs/index.ts`: export any new factory if it is meant to be public; update public-surface test accordingly.
- `package.json`: fix `start` target (`node dist/index.js` or `node dist/server.js` matching source), consider `bin` if this should be runnable by MCP clients, and maybe add a dev script.
- `tsconfig.json`: fix build include/rootDir issue before relying on compiled runner.
- `README.md`: add MCP client/stdio integration snippet and clarify build/start commands.
- `tests/mercadopago-docs/mcp.test.ts` or new runner/factory test: cover server factory registration without opening stdio.
- `tests/mercadopago-docs/scaffold.test.ts`: update exported key snapshot if public API changes.
- `tests/mercadopago-docs/readme.test.ts`: extend if README adds required commands/snippets.

## Start Here

Start with `src/index.ts`. It already contains the desired stdio wiring, but it is not aligned with `package.json` (`start` points to `dist/server.js`) and it is not a reusable standalone runner/factory. Extracting this code cleanly determines the smallest implementation.

Implementation guidance:
1. Add a reusable server factory around the existing `McpServer` + `createMercadoPagoDocsHandlers` + `registerMercadoPagoDocsTools` wiring.
2. Add/keep a side-effect runner that only does `await create...Server(...).connect(new StdioServerTransport())`.
3. Update `package.json` scripts to point at the actual emitted JS path. If choosing `src/server.ts`, `start` should be `node dist/server.js`; if keeping `src/index.ts`, `start` should be `node dist/index.js`.
4. Fix `tsconfig.json` so `pnpm build` emits runnable JS. Current `include: ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]` with `rootDir: "src"` fails TS6059 for tests/config outside `src`.
5. Document MCP client config in README, e.g. build then run command/path, while preserving boundaries: official docs only, mocked tests, no Q&A synthesis.

Test strategy:
- Keep `pnpm test` network-free; do not spawn a live stdio process in unit tests unless stdio streams are fully mocked.
- RED: add a test for a server factory using a fake/spy registrar if the factory is in `mcp.ts`, or test exported runner helpers without connecting transport.
- Add a package/script consistency test if desired: README/start path should match the chosen source entry.
- Run `pnpm test` and `pnpm build`. Current `pnpm build` fails with TS6059 due to `tsconfig.json`; that must be fixed for a standalone compiled runner.

Risks / constraints:
- Top-level `await server.connect(new StdioServerTransport())` in an importable root module makes imports hang/start transport. Avoid exporting library APIs from a side-effect runner.
- Public surface test is strict; exporting a new factory from `src/mercadopago-docs/index.ts` requires updating expected keys.
- `OfficialMcpServer` is declared in `mcp.ts` but not exported through the barrel and may not be needed; avoid exporting type-only aliases unless there is a concrete consumer.
- `package.json` has no `bin`/`exports`; if this should be installed as an MCP server package, add them intentionally.
- MCP SDK `registerTool` schema expectations can be sensitive: current code uses `searchDocsInputSchema.shape` for search and full `readDocInputSchema` for read. Existing tests accept this; verify against SDK docs/types if changing factory typing.
- README safe dependency rule requires `--ignore-scripts` for dependency commands; preserve this in new docs/tests.

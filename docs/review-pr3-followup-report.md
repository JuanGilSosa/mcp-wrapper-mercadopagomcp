## Review
- Correct: The medium finding is resolved. `ERROR_CODES` now includes stable `InvalidInput` (`src/mercadopago-docs/errors.ts:3-12`), and `toMcpError()` maps `ZodError` to `{ code: 'InvalidInput', message: 'Tool input validation failed' }` instead of falling through to `FetchFailed` (`src/mercadopago-docs/errors.ts:44-56`).
- Correct: MCP handler catch path still wraps validation failures into MCP error results (`src/mercadopago-docs/mcp.ts:81-89`), so malformed search/read inputs are converted consistently.
- Correct: Tests cover both direct error mapping and MCP tool behavior: Zod validation maps to `InvalidInput` (`tests/mercadopago-docs/errors.test.ts:41-49`), malformed search/read tool inputs return `InvalidInput`, and read validation does not call fetch (`tests/mercadopago-docs/mcp.test.ts:107-128`).
- Correct: OpenSpec and apply progress were updated to include malformed tool input and the follow-up evidence (`openspec/changes/add-mercadopago-docs-mcp/specs/mercadopago-docs-mcp/spec.md:101-110`, `openspec/changes/add-mercadopago-docs-mcp/apply-progress.md:190-192`).
- Correct: Focused verification passed: `pnpm test -- tests/mercadopago-docs/errors.test.ts tests/mercadopago-docs/mcp.test.ts` reported 12 files / 83 tests passed.
- Blocker: None found.
- Note: No new high issues found in the reviewed follow-up files.

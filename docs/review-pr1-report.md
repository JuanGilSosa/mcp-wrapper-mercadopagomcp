## Review

### Approval
Approved for PR 1 with one medium follow-up requested before MCP wiring uses the read schema as a tool boundary.

### Correct
- PR1 scope compliance: only root scaffold, source matrix, schemas/errors, allowlist, redirects, tests, and apply progress are present. No fetch/cache, extraction, search/index, MCP SDK wiring, or README docs were implemented. Evidence: `src/mercadopago-docs/` contains only `allowlist.ts`, `errors.ts`, `index.ts`, `official-sources.ts`, `redirects.ts`, `schemas.ts`; `package.json` includes only `zod`, `typescript`, `vitest`, and `@types/node`.
- Strict TDD evidence is plausible and aligned with artifacts. `openspec/changes/add-mercadopago-docs-mcp/apply-progress.md` records RED/GREEN/TRIANGULATE cycles and final verification. Current verification passed: `pnpm test` => 6 files / 46 tests passed; `pnpm exec tsc --noEmit` passed.
- pnpm install rule appears honored in artifacts and package state. `openspec/config.yaml` requires `--ignore-scripts`; `apply-progress.md` records `pnpm add zod --ignore-scripts` and `pnpm add -D typescript vitest @types/node --ignore-scripts`; `package.json`/`pnpm-lock.yaml` match those dependencies.
- Allowlist core is conservative: HTTPS required, userinfo rejected, non-443 ports rejected, exact official-host matrix enforced, docs/reference path families enforced, unsupported locales rejected, and redirect helpers validate every hop through the same allowlist. Evidence: `src/mercadopago-docs/allowlist.ts:60-81`, `src/mercadopago-docs/redirects.ts:16-30`.
- Error model exposes the required stable codes and filters context before MCP-facing output. Evidence: `src/mercadopago-docs/errors.ts:1-20`, `src/mercadopago-docs/errors.ts:24-36`.

### Medium
- `readDocInputSchema` validates URL shape only, not URL safety. `src/mercadopago-docs/schemas.ts:21-26` uses `z.url()` for `url`, so inputs such as `https://example.com/` or `http://localhost/...` would pass schema validation and require a separate allowlist call. This is safe only if future MCP wiring always composes `readDocInputSchema` with `validateOfficialDocsUrl()` before fetch. Requested fix: either add a composed read-input validation helper for PR1 exports/tests, or clearly document/test that the schema is shape-only and the read boundary must call the allowlist before any network operation.

### Low
- The official source matrix is intentionally conservative, but the verification note is lightweight: `src/mercadopago-docs/official-sources.ts:15-16` cites preliminary parent web search. This is acceptable for PR1, but before expanding hosts or relying on the matrix for production search/index, keep the verification artifact explicit and avoid adding country-specific hosts without recorded evidence.
- Review workload risk: hand-authored PR1 scope is reasonable, but `apply-progress.md` notes ~531 non-lockfile lines plus ~780 generated lockfile lines. If lockfiles count in the human review budget, PR1 exceeds the 800-line budget despite the implementation being focused.

### Blocker
- None found.

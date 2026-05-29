# Apply Progress: add-mercadopago-docs-mcp

## PR Boundary

- Completed slices: PR 1 — scaffold, official source matrix, schemas/errors, allowlist, and redirect helpers; PR 2 — fetch/cache and extraction foundation; PR 3 — search/index, MCP wiring, README/docs, and final verification.
- Delivery path: approved chained PRs in 3 slices.
- Work intentionally not included: resources are deferred; first scope remains tools only.

## Completed Tasks

- Discovery confirmed no existing `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts`, `src/`, or `tests/` scaffold.
- Added RED Vitest tests for PR 1 behavior before production modules existed.
- Installed dependencies with pnpm and mandatory `--ignore-scripts`:
  - `pnpm add zod --ignore-scripts`
  - `pnpm add -D typescript vitest @types/node --ignore-scripts`
- Created root TypeScript/Vitest scaffold.
- Created conservative official source matrix artifact for `mercadopago.com` and `www.mercadopago.com` only.
- Implemented Zod schemas for search/read inputs.
- Added `parseSafeReadDocInput()` so future read/MCP fetch boundaries compose shape validation with official URL allowlist validation before any network access.
- Implemented stable domain errors and safe MCP-facing error mapping helper.
- Implemented centralized official docs URL normalization/allowlist validation.
- Implemented pure redirect location/chain validation helpers without network fetching.

## TDD Cycle Evidence

| Cycle | RED evidence | GREEN evidence | TRIANGULATE / REFACTOR evidence |
|---|---|---|---|
| PR1 scaffold/imports | `pnpm test` failed because `src/mercadopago-docs/*` modules did not exist. | Created root scaffold and PR1 public exports; final `pnpm test` passed. | Public surface test asserts only PR1 modules are exported, preventing accidental PR2/PR3 scope creep. |
| Official source matrix | RED tests expected a static verified matrix before `official-sources.ts` existed. | Added conservative matrix with evidence comments and only `mercadopago.com` / `www.mercadopago.com`. | Tests assert country-specific hosts are not guessed before verification. |
| Schemas/errors | RED tests covered input validation and stable errors before `schemas.ts` / `errors.ts` existed. | Implemented Zod schemas and domain error mapping. | Edge tests cover empty/overlong query, unsupported locale/country, invalid limit, invalid doc IDs, and safe context filtering. |
| Allowlist/redirects | RED tests covered unsafe URLs and redirect hops before `allowlist.ts` / `redirects.ts` existed. | Implemented URL normalization, central allowlist validation, and pure redirect helpers. | Edge tests cover mixed-case host, explicit `:443`, query/fragment preservation, unsupported locales, relative redirects, and max redirect hops. |

## Verification Commands

- `pnpm test` after RED tests and scaffold/dependency setup: failed as expected because implementation modules were missing.
- `pnpm test`: passed, 6 test files / 46 tests.
- After fresh review follow-up, `pnpm test`: passed, 6 test files / 52 tests.
- `pnpm exec tsc --noEmit`: passed.

## Files Changed

- `package.json`
- `pnpm-lock.yaml`
- `tsconfig.json`
- `vitest.config.ts`
- `src/mercadopago-docs/index.ts`
- `src/mercadopago-docs/official-sources.ts`
- `src/mercadopago-docs/schemas.ts` — includes shape schemas and safe read-boundary parser
- `src/mercadopago-docs/errors.ts`
- `src/mercadopago-docs/allowlist.ts`
- `src/mercadopago-docs/redirects.ts`
- `tests/mercadopago-docs/scaffold.test.ts`
- `tests/mercadopago-docs/official-sources.test.ts`
- `tests/mercadopago-docs/schemas.test.ts`
- `tests/mercadopago-docs/errors.test.ts`
- `tests/mercadopago-docs/allowlist.test.ts`
- `tests/mercadopago-docs/redirects.test.ts`
- `openspec/changes/add-mercadopago-docs-mcp/apply-progress.md`

## Deviations from Design

- Used root `package.json` plus `src/mercadopago-docs/` and `tests/mercadopago-docs/` because discovery found no monorepo/package scaffold. This follows `tasks.md` and supersedes the design's earlier placeholder path `packages/coding-agent/src/mercadopago-docs/` for this repo.
- Did not install `@modelcontextprotocol/sdk` or `cheerio` in PR 1 because MCP wiring and extraction are out of scope for this slice.

## Workload / Review Notes

- Non-lockfile line count is about 531 lines, within the 800-line PR slice budget.
- `pnpm-lock.yaml` adds about 780 generated lines; if lockfiles count against review budget, PR 1 appears over 800 lines despite the hand-authored slice being focused.
- Repo is not currently a git repository, so no branch/commit was created.

## PR 2 Completed Tasks

- Discovery confirmed PR 1 scaffold and safety modules existed, with dependencies limited to `zod`, `typescript`, `vitest`, and `@types/node` before PR 2.
- Added RED Vitest tests for cache, fetcher, and extraction before production PR 2 modules existed.
- Installed extraction dependency with pnpm and mandatory `--ignore-scripts`:
  - `pnpm add cheerio --ignore-scripts`
- Created `src/mercadopago-docs/cache.ts` with normalized official URL cache keys, bounded in-memory TTL storage, and deterministic hit/miss metadata.
- Created `src/mercadopago-docs/fetcher.ts` with injected fetch, initial URL allowlist validation before network access, manual redirect handling through existing redirect/allowlist helpers, status/content-type error mapping, cache integration, and safe fetch metadata.
- Created static sanitized fixtures under `tests/fixtures/mercadopago-docs/`; no fixture or test fetches live Mercado Pago documentation.
- Created `src/mercadopago-docs/extract.ts` with Cheerio-based extraction that preserves headings, prose, code, tables, official links, and API endpoint examples while removing nav/footer/script/style/cookie/tracking noise.
- Exported only PR 2-safe APIs from `src/mercadopago-docs/index.ts`: cache, fetcher, and extraction helpers. No PR 3 search/index/MCP APIs were added.

## PR 2 TDD Cycle Evidence

| Cycle | RED evidence | GREEN evidence | TRIANGULATE / REFACTOR evidence |
|---|---|---|---|
| Cache | `pnpm test` failed because `src/mercadopago-docs/cache.ts` did not exist after cache tests were added. | Implemented `createMemoryCache()` and `normalizeCacheKey()`; cache tests passed. | Edge tests cover TTL expiry, oldest-entry eviction, normalized official URL keys, explicit `:443`, and fragment stripping. |
| Fetcher | `pnpm test` failed because `src/mercadopago-docs/fetcher.ts` did not exist after fetcher tests were added. | Implemented `fetchOfficialDoc()` using injected fetch, existing URL validation, manual redirect handling, status mapping, content-type checks, and cache metadata. | Edge tests cover relative redirects, outside-allowlist redirects, max redirects, ETag/Last-Modified preservation, cache hit avoiding fetch, unsafe initial URL rejection before fetch, HTTP 404/429/500 mapping, network failure, and unsupported content type. |
| Extraction | `pnpm test` failed because `src/mercadopago-docs/extract.ts` did not exist after extraction tests/fixtures were added. | Installed `cheerio` safely and implemented deterministic extraction from static docs/reference fixtures. | Edge tests cover docs and reference fixture shapes, missing main content, preservation of headings/code/tables/links/API endpoint examples, and removal of layout/script/style/cookie/tracking/unofficial-link noise. |
| PR2 public surface | Scaffold export test failed after PR2 APIs were exported. | Updated the public surface test to include only PR1 + PR2 APIs. | Confirmed no PR3 search/index/MCP/resource exports exist. |

## PR 2 Verification Commands

- `pnpm test` after RED tests: failed as expected because PR 2 implementation modules were missing.
- `pnpm add cheerio --ignore-scripts`: passed.
- `pnpm test`: passed, 9 test files / 69 tests.
- After fresh review low-severity follow-up, `pnpm test`: passed, 9 test files / 69 tests.
- `pnpm exec tsc --noEmit`: passed.

## PR 2 Files Changed

- `package.json`
- `pnpm-lock.yaml`
- `src/mercadopago-docs/cache.ts`
- `src/mercadopago-docs/fetcher.ts`
- `src/mercadopago-docs/extract.ts` — includes nested-link de-duplication after review follow-up
- `src/mercadopago-docs/index.ts`
- `tests/mercadopago-docs/cache.test.ts`
- `tests/mercadopago-docs/fetcher.test.ts`
- `tests/mercadopago-docs/extract.test.ts`
- `tests/mercadopago-docs/scaffold.test.ts`
- `tests/fixtures/mercadopago-docs/docs-page.html`
- `tests/fixtures/mercadopago-docs/reference-page.html`
- `openspec/changes/add-mercadopago-docs-mcp/apply-progress.md`

## PR 2 Deviations from Design

- Deferred `turndown`; Cheerio plus a small deterministic Markdown-ish renderer satisfied the PR 2 extraction tests.
- Fetcher accepts URL strings but validates with `validateOfficialDocsUrl()` before invoking the injected fetch, preserving the “validated URLs only before network access” safety boundary.
- Cache stores HTML bodies only; additional persistent/revalidation behavior remains deferred.

## PR 2 Workload / Review Notes

- Hand-authored PR 2 changed lines are about 663 lines including tests, fixtures, package update, and exports, which stays under the 800-line slice budget.
- `pnpm-lock.yaml` changed due to `cheerio` and transitive dependencies; generated lockfile lines may make raw diff larger than the hand-authored review slice.
- Repo is not currently a git repository, so no branch/commit was created.

## PR 3 Completed Tasks

- Discovery confirmed PR 1/PR 2 modules existed and no search/index/MCP/README implementation was present before PR 3.
- Added RED Vitest tests for search/index/ranking, MCP tool handlers/registration, public exports, and README command safety before production PR 3 modules and README existed.
- Installed the official MCP TypeScript SDK with pnpm and mandatory `--ignore-scripts`:
  - `pnpm add @modelcontextprotocol/sdk --ignore-scripts`
- Created `src/mercadopago-docs/seed-index.ts` with a small curated official-docs-only seed index using the existing conservative `mercadopago.com` / `www.mercadopago.com` source matrix.
- Created `src/mercadopago-docs/rank.ts` with deterministic token scoring over titles, headings, keywords, snippets, and URLs.
- Created `src/mercadopago-docs/search.ts` with schema validation integration, locale/country filters, bounded limits, duplicate URL handling, URL revalidation before returning, and source-result-only output.
- Created `src/mercadopago-docs/mcp.ts` as a thin adapter over existing schemas/search/fetcher/extract/errors. It exposes handlers and an MCP-compatible `registerTool` registration helper for `mercado_pago_search_docs` and `mercado_pago_read_doc`.
- Added `README.md` documenting first-scope behavior, official-docs-only boundary, no Q&A synthesis, mocked-test policy, and safe pnpm commands.
- Updated public exports in `src/mercadopago-docs/index.ts` for PR 3 APIs only.

## PR 3 TDD Cycle Evidence

| Cycle | RED evidence | GREEN evidence | TRIANGULATE / REFACTOR evidence |
|---|---|---|---|
| Search/index | `pnpm test` failed because `rank.ts` and `search.ts` did not exist after search tests were added. | Implemented seed index, ranking, search, URL revalidation, filters, and doc-id resolution; search tests passed. | Edge tests cover empty results, duplicate URL handling, rejected indexed URLs, locale/country filters, bounded limit, deterministic ranking, and no synthesis for explanation-style queries. |
| MCP wiring | `pnpm test` failed because `mcp.ts` did not exist after MCP tests were added. | Installed `@modelcontextprotocol/sdk` safely and implemented thin handler/registration helpers for search/read tools. | Tests cover read by `doc_id`, read by URL with mocked fetch/cache/extract path, rejected read inputs not calling fetch, stable MCP error mapping, unknown tool errors, and public tool registration. |
| README/docs | `pnpm test` failed because `README.md` did not exist after README tests were added. | Created README with scope, boundaries, mocked-test policy, and safe commands. | README test asserts every documented pnpm install/add command includes `--ignore-scripts`. |
| Final public surface | Scaffold export test failed after PR 3 APIs were expected but not exported. | Exported only PR1 + PR2 + PR3 APIs from `src/mercadopago-docs/index.ts`. | Confirmed no resource APIs or answer-synthesis APIs were exported. |

## PR 3 Verification Commands

- `pnpm test` after RED tests: failed as expected because PR 3 implementation modules and README were missing.
- `pnpm add @modelcontextprotocol/sdk --ignore-scripts`: passed.
- `pnpm test`: passed, 12 test files / 81 tests.
- After fresh review medium-severity follow-up, `pnpm test`: passed, 12 test files / 83 tests.
- `pnpm exec tsc --noEmit`: passed.

## PR 3 Files Changed

- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `src/mercadopago-docs/index.ts`
- `src/mercadopago-docs/seed-index.ts`
- `src/mercadopago-docs/rank.ts`
- `src/mercadopago-docs/search.ts`
- `src/mercadopago-docs/mcp.ts`
- `src/mercadopago-docs/errors.ts` — maps Zod tool-input validation failures to stable `InvalidInput` MCP errors after review follow-up
- `tests/mercadopago-docs/search.test.ts`
- `tests/mercadopago-docs/mcp.test.ts`
- `tests/mercadopago-docs/readme.test.ts`
- `tests/mercadopago-docs/scaffold.test.ts`
- `openspec/changes/add-mercadopago-docs-mcp/apply-progress.md`

## PR 3 Deviations from Design

- MCP adapter exposes testable handlers plus a structural `registerTool` helper compatible with MCP SDK server registration. It imports the official SDK type but does not start a transport/server process in PR 3 tests.
- Resources (`mp-docs://index/{locale}` and `mp-docs://page/{doc_id}`) remain deferred because the tasks marked them optional and the first tool scope is complete.
- Search index is a small checked-in seed index; no crawler or live official search API was added.

## PR 3 Workload / Review Notes

- Hand-authored PR 3 changed lines are about 573 lines across source, tests, and README, within the 800-line slice budget.
- `pnpm-lock.yaml` changed due to `@modelcontextprotocol/sdk` and transitive dependencies; generated lockfile lines may make raw diff larger than the hand-authored review slice.
- Repo is not currently a git repository, so no branch/commit was created.

## PR 3 Review Follow-up

- Fresh PR 3 review found malformed MCP tool inputs were mapped through the unknown-error fallback as `FetchFailed`.
- Added stable `InvalidInput` error code for schema/Zod validation failures at the MCP boundary.
- Added tests proving malformed search/read tool inputs return `InvalidInput` and do not call fetch.
- Updated the OpenSpec stable error scenario to include malformed tool input.

## Remaining Tasks

- Further verify any country-specific Mercado Pago hosts before adding them to the source matrix.
- Optional future work: add MCP resources and/or expand the official seed index behind a recorded verification artifact.

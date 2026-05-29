# Implementation Tasks: add-mercadopago-docs-mcp

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900-1,400 total across full scope; keep each slice under 800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 scaffold + schemas/errors/allowlist/redirect tests and implementation → PR 2 fetch/cache/extraction fixtures and implementation → PR 3 search/index/MCP wiring/docs/final verify |
| Delivery strategy | chained PRs |
| Chain strategy | approved: 3 slices |

Decision needed before apply: No — user approved chained PRs in 3 slices.
Chained PRs recommended: Yes
Chain strategy: PR 1 scaffold/safety → PR 2 fetch/cache/extraction → PR 3 search/MCP/docs
400-line budget risk: High

## Scope and Root Decision

- Final simple package root for this repository: use root `package.json` plus `src/mercadopago-docs/` and `tests/mercadopago-docs/` unless an apply-phase discovery proves a monorepo/package scaffold already exists.
- Record this decision in `openspec/changes/add-mercadopago-docs-mcp/design.md` or an apply note before code edits, because the current design mentions `packages/coding-agent/src/mercadopago-docs/` but this repo currently has no package scaffold evidence.
- First scope remains search/read of official Mercado Pago documentation only; no Q&A synthesis, no unofficial sources, no live-network unit tests.

## PR 1 — Scaffold, Host Artifact, Schemas, Errors, Allowlist, Redirects

### 1. Scaffold/tooling RED
- Discovery target: confirm whether root `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, or `vitest.config.ts` exists before editing.
- If absent, plan root files: `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/mercadopago-docs/`, `tests/mercadopago-docs/`.
- Add failing Vitest smoke tests in `tests/mercadopago-docs/scaffold.test.ts` asserting imports from `src/mercadopago-docs/index.ts` are possible and no production behavior exists yet.
- Dependency commands, only if packages are missing:
  - `pnpm add @modelcontextprotocol/sdk zod cheerio --ignore-scripts`
  - `pnpm add -D typescript vitest @types/node --ignore-scripts`
  - `pnpm install --ignore-scripts`
- Verification: `pnpm test` fails for missing scaffold/exports before implementation.

### 2. Scaffold/tooling GREEN
- Create minimal root TypeScript/Vitest scaffold only: `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/mercadopago-docs/index.ts`.
- Ensure `package.json` scripts include `"test": "vitest run"` and package manager remains pnpm.
- Verification: `pnpm test` passes scaffold tests.
- Rollback: remove the root scaffold files and `src/mercadopago-docs/index.ts` if the package root decision changes.

### 3. Host/path verification artifact RED
- Add failing tests in `tests/mercadopago-docs/official-sources.test.ts` for loading a static verified matrix from `src/mercadopago-docs/official-sources.ts`.
- Required matrix fields: `host`, optional `country`, `locales`, and allowed `pathFamilies` of `docs` and `reference`.
- Include candidate Mercado Pago hosts only after verification is recorded; unit tests must not perform live network calls.
- Verification: `pnpm test` fails until the static artifact exists.

### 4. Host/path verification artifact GREEN
- Create `src/mercadopago-docs/official-sources.ts` with the verified official host/path/locale matrix and comments pointing to the manual verification note.
- If verification is incomplete, keep only confirmed hosts and defer others; do not guess at runtime.
- Verification: `pnpm test` passes matrix shape tests.
- Rollback: remove unverified host entries without affecting other modules.

### 5. Schemas and errors RED
- Add failing tests in `tests/mercadopago-docs/schemas.test.ts` and `tests/mercadopago-docs/errors.test.ts`.
- Cover `mercado_pago_search_docs` input validation: trimmed non-empty query, max length, locale/country enum, integer bounded `limit`.
- Cover `mercado_pago_read_doc` validation: exactly one of `doc_id` or `url`, malformed identifiers rejected.
- Cover stable error codes: `InvalidUrl`, `UrlNotAllowed`, `NotFound`, `FetchFailed`, `UnsupportedContentType`, `ExtractionFailed`, `RateLimited`.
- Verification: `pnpm test` fails before implementation.

### 6. Schemas and errors GREEN
- Implement `src/mercadopago-docs/schemas.ts` using Zod and exported TypeScript types.
- Implement `src/mercadopago-docs/errors.ts` with domain errors and safe MCP-facing mapping helpers.
- Verification: `pnpm test` passes schema/error tests.
- Rollback: remove schema/error exports; no network or MCP wiring affected.

### 7. Allowlist and redirects RED
- Add failing tests in `tests/mercadopago-docs/allowlist.test.ts` and `tests/mercadopago-docs/redirects.test.ts`.
- Reject non-HTTPS, localhost, loopback/private/IP literals, userinfo, non-standard ports, path traversal/encoded escape attempts, unofficial hosts, and non-doc/reference paths.
- Accept representative verified `/developers/{locale}/docs/**` and `/developers/{locale}/reference/**` URLs only.
- Test redirect hop validation for all-allowlisted chains and chains leaving the allowlist.
- Verification: `pnpm test` fails before implementation.

### 8. Allowlist and redirects GREEN/TRIANGULATE
- Implement `src/mercadopago-docs/allowlist.ts` and `src/mercadopago-docs/redirects.ts` with centralized URL normalization and hop validation.
- Add triangulating tests for mixed-case hosts, relative redirect `Location`, explicit `:443`, query strings, fragments, and unsupported locales.
- Verification: `pnpm test` passes all PR 1 tests.
- Rollback: disable read-by-URL in later wiring if allowlist uncertainty remains.

## PR 2 — Fetch, Cache, Extraction

### 9. Fetch/cache RED
- Add failing tests in `tests/mercadopago-docs/fetcher.test.ts` and `tests/mercadopago-docs/cache.test.ts` using mocked `fetch` only.
- Cover manual redirects, 404→`NotFound`, 429→`RateLimited`, non-2xx/network→`FetchFailed`, unsupported content type→`UnsupportedContentType`, and cache hit/miss metadata.
- Verification: `pnpm test` fails before implementation and never reaches live Mercado Pago URLs.

### 10. Fetch/cache GREEN/TRIANGULATE
- Implement `src/mercadopago-docs/cache.ts` with bounded in-memory TTL cache.
- Implement `src/mercadopago-docs/fetcher.ts` with injected fetch, validated URLs only, manual redirect policy, content-type checks, and safe metadata.
- Add edge tests for max redirects, ETag/Last-Modified metadata preservation, and cache key normalization.
- Verification: `pnpm test` passes fetch/cache tests.
- Rollback: replace fetcher with a no-op read-disabled adapter while preserving lower-level safety modules.

### 11. Extraction RED
- Add static fixtures under `tests/fixtures/mercadopago-docs/` for official-like HTML pages; fixtures must be committed and sanitized, not fetched during tests.
- Add failing tests in `tests/mercadopago-docs/extract.test.ts` for preserving title, headings, paragraphs, code blocks, tables, official links, and API endpoint examples.
- Add failing tests for removing nav, footer, scripts, styles, cookie banners, tracking markup, and unrelated layout.
- Verification: `pnpm test` fails before implementation.

### 12. Extraction GREEN/TRIANGULATE/REFACTOR
- Implement `src/mercadopago-docs/extract.ts` with Cheerio-based extraction and deterministic cleaned Markdown/text output.
- Validate or omit returned links that fail the official allowlist.
- Add triangulating fixtures for `docs` and `reference` page shapes and missing-main-content extraction failure.
- Refactor selectors into small helpers after tests are green.
- Verification: `pnpm test` passes extraction tests.
- Rollback: reduce read output to raw main text for verified fixtures only if selector complexity exceeds budget.

## PR 3 — Search/Index, MCP Wiring, Docs, Final Verify

### 13. Search/index RED
- Add failing tests in `tests/mercadopago-docs/search.test.ts` and `tests/fixtures/mercadopago-docs/seed-index.ts`.
- Cover query validation integration, deterministic ranking, locale/country filters, bounded limit, snippets, `docs`/`reference` source kinds, and revalidation of every returned URL.
- Include a no-synthesis test: explanation-style queries return only match metadata/snippets, not answers.
- Verification: `pnpm test` fails before implementation.

### 14. Search/index GREEN/TRIANGULATE
- Implement `src/mercadopago-docs/index-store.ts`, `src/mercadopago-docs/rank.ts`, and `src/mercadopago-docs/search.ts` using a small curated official seed index.
- Keep the seed index deterministic and official-docs-only; avoid arbitrary crawling and unofficial search APIs.
- Add edge tests for empty result sets, duplicate URLs, and rejected indexed URLs.
- Verification: `pnpm test` passes search/index tests.
- Rollback: ship a smaller seed index or disable country filtering if verified source coverage is too small.

### 15. MCP wiring RED
- Add failing tests in `tests/mercadopago-docs/mcp.test.ts` for registering tools `mercado_pago_search_docs` and `mercado_pago_read_doc` with the MCP SDK adapter.
- Cover tool input/output serialization, domain error mapping, mocked read flow by `doc_id`, mocked read flow by URL, and optional resources `mp-docs://index/{locale}` / `mp-docs://page/{doc_id}` if included.
- Verification: `pnpm test` fails before implementation.

### 16. MCP wiring GREEN/TRIANGULATE
- Implement `src/mercadopago-docs/mcp.ts` as a thin adapter over schemas, search, fetch/cache, extraction, and errors.
- Export public registration helpers from `src/mercadopago-docs/index.ts`.
- Add triangulating tests that rejected inputs do not call fetch and outputs contain source metadata only.
- Verification: `pnpm test` passes MCP wiring tests.
- Rollback: unregister MCP tools while keeping tested modules available.

### 17. Docs/README RED/GREEN
- Add or update `README.md` with first-scope behavior, official-docs-only boundary, no Q&A synthesis, mocked-test policy, and pnpm install rule.
- Include exact safe commands:
  - `pnpm install --ignore-scripts`
  - `pnpm add @modelcontextprotocol/sdk zod cheerio --ignore-scripts`
  - `pnpm add -D typescript vitest @types/node --ignore-scripts`
  - `pnpm test`
- If docs are tested, add a lightweight assertion that documented commands include `--ignore-scripts` for install/add commands.
- Verification: `pnpm test` and manual README review.

### 18. Final verify and review prep
- Run `pnpm test` after each PR slice and at final integration.
- Confirm no test uses live network access; mocked `fetch`/fixtures only.
- Confirm no output path provides Q&A answers, recommendations, or unofficial content.
- Check changed lines per PR slice remain under 800; if a slice approaches 800, split before review.
- Confirm OpenSpec artifacts updated as needed: `proposal.md`, `spec.md`, `design.md`, and this `tasks.md` remain consistent.

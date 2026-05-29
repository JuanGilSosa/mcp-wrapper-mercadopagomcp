## Review

### Correct
- **PR2 scope compliance:** Approved. The source tree contains PR1 safety modules plus PR2 `cache.ts`, `fetcher.ts`, and `extract.ts`; no PR3 search/index/MCP/resource implementation files are present (`src/mercadopago-docs/`). `package.json` has `cheerio` and `zod`, but no `@modelcontextprotocol/sdk` dependency (`package.json:10-18`). `index.ts` exports cache/fetch/extraction helpers but no search/index/MCP/resource APIs (`src/mercadopago-docs/index.ts:1-17`).
- **Strict TDD evidence is plausible:** `apply-progress.md` records RED/GREEN/TRIANGULATE evidence for cache, fetcher, extraction, and PR2 public surface (`openspec/changes/add-mercadopago-docs-mcp/apply-progress.md:83-90`). Tests exist for cache/fetcher/extraction (`tests/mercadopago-docs/cache.test.ts`, `tests/mercadopago-docs/fetcher.test.ts`, `tests/mercadopago-docs/extract.test.ts`).
- **Fetcher safety:** Initial URL validation runs before cache lookup or injected fetch (`src/mercadopago-docs/fetcher.ts:54-58`). Fetch is injected and called with `{ redirect: 'manual' }` (`src/mercadopago-docs/fetcher.ts:77-79`). Redirect locations are validated through `validateRedirectHop()` before following (`src/mercadopago-docs/fetcher.ts:83-90`). Tests assert unsafe initial URLs do not call fetch and redirected targets remain allowlisted (`tests/mercadopago-docs/fetcher.test.ts:73-116`).
- **Error mapping:** Fetcher maps 404, 429, other non-2xx, network failure, and unsupported content type to stable domain errors (`src/mercadopago-docs/fetcher.ts:36-51`, `src/mercadopago-docs/fetcher.ts:77-97`), with tests covering the mappings (`tests/mercadopago-docs/fetcher.test.ts:128-156`).
- **Cache behavior:** In-memory cache normalizes official URL keys, strips fragments, applies TTL expiry, and evicts oldest entries when over `maxEntries` (`src/mercadopago-docs/cache.ts:28-72`). Tests cover hit/miss metadata, TTL expiry, eviction, and explicit `:443`/fragment normalization (`tests/mercadopago-docs/cache.test.ts:6-80`).
- **Extraction safety and no synthesis:** Extraction validates the canonical URL before processing (`src/mercadopago-docs/extract.ts:136-138`), removes common layout/noise selectors (`src/mercadopago-docs/extract.ts:15-27`, `src/mercadopago-docs/extract.ts:140-143`), validates/omits returned links using the official docs allowlist (`src/mercadopago-docs/extract.ts:42-50`, `src/mercadopago-docs/extract.ts:69-77`), and renders only source-derived headings/prose/code/tables/links (`src/mercadopago-docs/extract.ts:101-133`). Fixture tests cover docs and reference shapes plus noise removal (`tests/mercadopago-docs/extract.test.ts:15-60`).
- **No live-network tests found:** Tests use fixture files and mocked fetch implementations. The default test command passed locally: `pnpm test` → 9 files / 69 tests passed. TypeScript also passed: `pnpm exec tsc --noEmit`.
- **pnpm install rule:** Apply progress records the PR2 dependency command as `pnpm add cheerio --ignore-scripts` (`openspec/changes/add-mercadopago-docs-mcp/apply-progress.md:73-76`).
- **Review workload:** Hand-authored PR2 scope is documented as ~663 lines, under the 800-line budget (`openspec/changes/add-mercadopago-docs-mcp/apply-progress.md:121-124`). Generated lockfile churn may make raw review larger, but the slice is still focused.

### Findings
- **Low — Extraction can duplicate nested link content.** `extractDocumentation()` iterates `main.find('h1,h2,h3,h4,h5,h6,p,pre,table,ul,ol,a')` (`src/mercadopago-docs/extract.ts:148-150`). Because this selects both block elements and descendant `<a>` elements, a link inside a paragraph is rendered once as part of the paragraph (`src/mercadopago-docs/extract.ts:110-112`) and again as a standalone link block (`src/mercadopago-docs/extract.ts:129-132`). Current tests assert the link is present but do not assert it appears only once (`tests/mercadopago-docs/extract.test.ts:19-34`). This is not a PR blocker, but it adds avoidable duplicated extracted content. Requested follow-up: iterate only top-level/block elements or skip nested anchors already handled by `renderInline()`, and add a regression assertion for non-duplication.

### Severity Summary
- **Blocker:** none.
- **High:** none.
- **Medium:** none.
- **Low:** extraction duplicate nested links; cosmetic/fidelity follow-up recommended.

### Approval
Approved for PR2 with the low-severity extraction de-duplication follow-up. No requested blocker/high fixes before proceeding to PR3.

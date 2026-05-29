# Change Proposal: add-mercadopago-docs-mcp

## Problem
Developers integrating Mercado Pago need a safe MCP interface for discovering and reading official Mercado Pago documentation from their AI tooling. The first release must avoid unsupported advice, non-official sources, arbitrary URL crawling, and synthesized Q&A answers. It should provide only grounded document search and document reading over official Mercado Pago documentation.

## Intent
Build a TypeScript MCP server that exposes official Mercado Pago documentation as searchable/readable MCP tools and resources. The server will return source-backed search results and cleaned page content without generating conclusions or answering integration questions on behalf of the documentation.

## Goals
- Provide an MCP server implemented in TypeScript for consulting Mercado Pago documentation.
- Support search over official Mercado Pago documentation and API reference pages only.
- Support reading a specific official Mercado Pago documentation page as cleaned text/Markdown with source metadata.
- Enforce strict source allowlisting and URL safety rules before fetching or returning content.
- Keep tool output limited to document matches and extracted official content; do not synthesize Q&A answers.
- Follow strict TDD with Vitest and `pnpm test`.
- Use pnpm for dependency operations; every `pnpm install` or `pnpm add` command must include `--ignore-scripts`.

## Non-Goals
- No Q&A answer synthesis in the initial scope.
- No checkout/payment/business recommendation generation.
- No use of unofficial blogs, Stack Overflow, GitHub issues, community examples, or third-party documentation.
- No arbitrary web crawling or general URL fetching.
- No live-network-dependent unit tests.
- No production MCP implementation or package scaffolding as part of this proposal phase.

## Proposed Scope

### MCP Surface
Initial MCP capabilities should include:

#### Tool: `mercado_pago_search_docs`
Search indexed official documentation and return ranked document/page matches only.

Expected input shape:
- `query`: required string.
- `locale`: optional bounded locale selector such as `es`, `en`, or `pt`.
- `country`: optional allowlisted country/site selector if official host differences are confirmed.
- `limit`: optional bounded number.

Expected output shape:
- `title`
- `url`
- `locale` and/or `country`
- `snippet`
- `source_kind`: `docs` or `reference`

#### Tool: `mercado_pago_read_doc`
Read one allowlisted official documentation page and return cleaned page content.

Expected input shape:
- `url` or stable `doc_id`.

Expected output shape:
- `title`
- `canonical_url`
- `headings`
- `content` as cleaned text/Markdown
- metadata such as `fetched_at`, cache status, or source identifier

#### Candidate Resources
- `mp-docs://index/{locale}`
- `mp-docs://page/{doc_id}`

### Official Source Boundary
Only official Mercado Pago developer documentation should be eligible. Candidate official host/path matrix must be verified before implementation. Current exploration suggests:
- HTTPS only.
- Primary path families:
  - `/developers/{locale}/docs/**`
  - `/developers/{locale}/reference/**`
- Candidate official hosts to verify before apply:
  - `www.mercadopago.com`
  - `www.mercadopago.com.ar`
  - `www.mercadopago.com.br`
  - `www.mercadopago.com.mx`
  - Any additional country-specific Mercado Pago developer documentation hosts only after confirmation.

### Safety and Extraction Behavior
- Normalize URLs before validation.
- Reject non-HTTPS URLs, IP literals, localhost, userinfo URLs, non-standard ports, non-official hosts, and non-doc/reference paths.
- Follow redirects only when every hop remains on an allowlisted official host/path.
- Strip navigation, cookie banners, scripts, styles, footers, and unrelated layout.
- Preserve headings, code blocks, tables, official links, and API endpoint examples.
- Return source URLs and extracted official content only; do not produce synthesized conclusions.

### Caching and Fetching
- Prefer a deterministic cache abstraction with TTL and optional ETag/Last-Modified support.
- Cache search index/page reads to reduce repeated official-site requests.
- Any force refresh behavior must be safe, bounded, and test-covered.

### Error Model
Define stable MCP-facing errors for at least:
- `InvalidUrl`
- `UrlNotAllowed`
- `NotFound`
- `FetchFailed`
- `UnsupportedContentType`
- `ExtractionFailed`
- `RateLimited`

## Constraints
- Language/runtime target: TypeScript MCP server.
- Package manager: pnpm.
- Dependency install/add rule: every command must include `--ignore-scripts`.
- Test runner: Vitest.
- Test command: `pnpm test`.
- Strict TDD is active: write failing tests before implementation; follow RED -> GREEN -> TRIANGULATE -> REFACTOR.
- SDD execution mode: interactive.
- Artifact store: OpenSpec plus Engram when available.
- PR strategy: auto-forecast.
- Review budget: 800 changed lines.

## Affected Areas
- MCP server tool/resource schema design.
- Documentation source allowlist and URL validation.
- Fetch/cache abstraction for official documentation content.
- Search index representation and ranking for docs/reference pages.
- HTML-to-text/Markdown extraction pipeline.
- Vitest test suite and fixtures.
- Error mapping from validation/fetch/extraction failures to MCP-visible responses.

## Risks
- Exact Mercado Pago documentation host, locale, and path matrix needs verification before implementation.
- Official docs may be dynamic or heavily client-rendered, making extraction brittle.
- There may be no official search API; a local index built from official pages may be required.
- Country/localization differences can produce duplicate or conflicting pages.
- Read-by-URL behavior introduces SSRF/open-redirect risk unless validation is strict.
- Search ranking quality may be limited in the first version.
- The 800-line review budget may require splitting scaffold, tests, indexing, and MCP wiring into chained PRs.

## Rollback Plan
- Keep the change isolated to the MCP docs server capability and its tests.
- If source validation or extraction proves unsafe, disable read-by-URL and allow only internally indexed `doc_id` reads.
- If search indexing is unreliable, ship a smaller static/fixture-backed official-doc index first and expand after verification.
- Revert the MCP tools/resources added by this change without affecting unrelated project configuration.

## Acceptance Outline
- Proposal/design/tasks are captured under OpenSpec before implementation proceeds.
- Failing Vitest tests are written before production implementation for:
  - MCP tool schemas and resource shapes.
  - URL normalization and allowlisting.
  - Search input validation and limit bounding.
  - Search returning only official docs/reference URLs.
  - Read rejecting non-HTTPS, localhost, IP, non-Mercado Pago, and non-doc/reference URLs.
  - Read accepting known allowlisted docs/reference URL shapes.
  - Redirect chains rejecting any hop outside the allowlist.
  - Extraction preserving titles, headings, code blocks, tables, and links.
  - Extraction removing nav/footer/script/style content.
  - Fetch/content failures mapping to stable MCP errors.
  - Tool outputs containing no synthesized Q&A answers.
- Unit tests use mocked HTTP/fetch fixtures and do not depend on live Mercado Pago network availability.
- `pnpm test` is the required verification command.
- Any dependency install/add command used during later phases includes `--ignore-scripts`.
- First implementation work is forecast against the 800 changed-line review budget and split if needed.

## Success Criteria
- Users can search official Mercado Pago docs through MCP and receive source-linked matches only.
- Users can read an official Mercado Pago docs/reference page through MCP and receive cleaned extracted content with canonical source metadata.
- The server rejects unsafe or non-official URLs reliably.
- The first scope avoids answer synthesis and non-official content.
- Strict TDD evidence exists in the test history for the implemented behavior.

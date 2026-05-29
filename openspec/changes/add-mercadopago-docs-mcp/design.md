# Technical Design: add-mercadopago-docs-mcp

## Context

This change introduces a TypeScript MCP server capability for searching and reading official Mercado Pago developer documentation only. The first scope is deliberately narrow: return ranked document matches and extracted official page content; do not synthesize answers, recommendations, or integration advice.

Relevant constraints:

- TypeScript MCP server.
- Official Mercado Pago documentation only.
- First scope exposes search and read behavior only.
- No Q&A answer synthesis in first scope.
- Package manager is pnpm; every `pnpm install` or `pnpm add` command must include `--ignore-scripts`.
- Strict TDD is active with Vitest; verification command is `pnpm test`.
- Unit tests must use mocked HTTP/fetch fixtures and must not depend on live Mercado Pago network availability.
- Review budget is 800 changed lines with auto-forecast; implementation should be sliced if the forecast exceeds budget.

## Proposed Architecture

Keep the implementation centered in `packages/coding-agent` unless a later apply-phase forecast requires creating a smaller isolated package. The code should be organized as narrow modules with explicit contracts so URL safety, fetching, extraction, search, and MCP wiring can be tested independently.

Proposed modules:

```text
packages/coding-agent/src/mercadopago-docs/
  mcp.ts                 # MCP tool/resource registration and SDK adapters
  schemas.ts             # Zod/input/output schemas and exported TS types
  allowlist.ts           # URL normalization, host/path matrix, safety checks
  redirects.ts           # Redirect evaluation policy and hop validation helpers
  fetcher.ts             # Fetch abstraction, response normalization, content checks
  cache.ts               # Cache interface and in-memory implementation
  index.ts               # Search index model, indexing/search orchestration
  rank.ts                # Deterministic first-pass ranking/scoring helpers
  extract.ts             # HTML-to-clean-Markdown/text extraction pipeline
  errors.ts              # Stable domain errors and MCP error mapping
  fixtures/              # Test-only HTML/search fixtures if colocated under tests instead
```

Apply-phase tests should target module boundaries first, then MCP integration wiring.

## Data Flow

### Search flow

1. MCP receives `mercado_pago_search_docs` request.
2. `schemas.ts` validates `query`, optional `locale`, optional `country`, and bounded `limit`.
3. Search service queries a local/indexed representation of official docs only.
4. Every candidate URL is revalidated by `allowlist.ts` before it can be returned.
5. Ranking returns source-result metadata only: `title`, `url`, `snippet`, `source_kind`, and locale/country metadata.
6. MCP adapter serializes the result without adding answers or recommendations.

### Read flow

1. MCP receives `mercado_pago_read_doc` request with exactly one of `doc_id` or `url`.
2. If `doc_id`, resolve it through the official-doc index to a URL; if `url`, normalize and validate it directly.
3. `fetcher.ts` checks cache first, then fetches through the injected fetch implementation.
4. Redirect handling validates every hop before following it.
5. Response content type and status are mapped to stable domain errors.
6. `extract.ts` converts official HTML into cleaned Markdown/text and metadata.
7. Output includes `title`, `canonical_url`, `headings`, `content`, and fetch/cache metadata only.

## MCP SDK Wiring

Use the official MCP TypeScript SDK for server/tool/resource registration. The MCP adapter should be thin:

- Register tool `mercado_pago_search_docs` with the validated input schema from `schemas.ts`.
- Register tool `mercado_pago_read_doc` with a mutually exclusive `doc_id`/`url` input schema.
- Optionally register resources after the tools are stable:
  - `mp-docs://index/{locale}`
  - `mp-docs://page/{doc_id}`
- Map domain errors from `errors.ts` to MCP-visible errors with stable `code` values and safe diagnostics.

The adapter must not contain source validation logic, ranking logic, fetch details, or extraction heuristics. Those remain in testable pure/service modules.

## Schemas and Contracts

Use runtime validation for all tool inputs and for internally constructed search/read outputs.

Search input:

```ts
type SearchDocsInput = {
  query: string;              // trimmed, non-empty, max length such as 200 chars
  locale?: 'es' | 'en' | 'pt';
  country?: string;           // enum from verified host matrix, if retained
  limit?: number;             // integer, default 5, max 10 or 20
};
```

Search output:

```ts
type SearchDocsOutput = {
  matches: Array<{
    title: string;
    url: string;
    snippet: string;
    source_kind: 'docs' | 'reference';
    locale?: string;
    country?: string;
  }>;
};
```

Read input:

```ts
type ReadDocInput =
  | { doc_id: string; url?: never }
  | { url: string; doc_id?: never };
```

Read output:

```ts
type ReadDocOutput = {
  title: string;
  canonical_url: string;
  headings: Array<{ level: number; text: string }>;
  content: string;
  metadata: {
    source_kind: 'docs' | 'reference';
    locale?: string;
    country?: string;
    fetched_at?: string;
    cache: 'hit' | 'miss' | 'revalidated';
  };
};
```

## Official URL Allowlist Validation

Validation must be centralized and reused by indexing, search result filtering, read-by-URL, redirect evaluation, and canonical URL output.

Rules:

- Require `https:`.
- Reject userinfo (`https://user:pass@host/...`).
- Reject localhost, loopback, private hosts, and IP literals.
- Reject non-standard ports; allow no explicit port or `443` only.
- Normalize host to lowercase and normalize/parse path before path checks.
- Reject encoded or path traversal forms that escape the allowed path families.
- Accept only verified official Mercado Pago documentation hosts.
- Accept only verified documentation path families:
  - `/developers/{locale}/docs/**`
  - `/developers/{locale}/reference/**`
- `locale` should be a bounded enum after host/path verification, initially expected to include `es`, `en`, and `pt`.

Candidate host matrix to verify before apply:

- `www.mercadopago.com`
- `www.mercadopago.com.ar`
- `www.mercadopago.com.br`
- `www.mercadopago.com.mx`
- Any additional country-specific official Mercado Pago docs hosts only after confirmation.

Implementation should represent the matrix as data, for example:

```ts
type OfficialDocsHost = {
  host: string;
  country?: string;
  locales: readonly string[];
  pathFamilies: readonly ('docs' | 'reference')[];
};
```

## Redirect Policy

Redirects are allowed only when every hop is safe.

- Use manual redirect handling rather than automatic uninspected following.
- Validate the initial URL before fetch.
- For each `Location` header, resolve relative redirects against the current URL, normalize, and run the same allowlist validation.
- Enforce a small max redirect count, e.g. 5.
- Reject any hop to a non-official host, unsafe URL form, disallowed port, non-HTTPS scheme, or non-doc/reference path.
- Final `canonical_url` must be the normalized final allowlisted URL.
- Unit tests must include inside-allowlist redirect and outside-allowlist redirect fixtures with mocked fetch.

## Fetch and Cache Abstraction

Introduce a small injectable fetch/cache layer so tests never hit the live network.

Fetcher responsibilities:

- Accept only already validated URLs.
- Use injected `fetch` implementation for tests.
- Use manual redirect mode where available.
- Map status codes:
  - `404` -> `NotFound`
  - `429` -> `RateLimited`
  - other non-2xx -> `FetchFailed`
- Accept only supported content types, initially `text/html` and optionally `application/xhtml+xml`.
- Capture safe metadata: final URL, fetched timestamp, cache status, ETag/Last-Modified if present.

Cache responsibilities:

- Define an interface such as `get(key)`, `set(key, value, metadata)`, and optional `revalidate` hooks.
- Start with deterministic in-memory TTL cache to keep the first PR small.
- Preserve room for filesystem or persistent cache in later changes.
- Support ETag/Last-Modified metadata without requiring network revalidation in unit tests.
- Bound entry size/count to avoid unbounded memory growth.

## Search and Index Strategy

First scope should avoid arbitrary crawling. Prefer a curated/verified official index derived from official documentation paths verified before apply. The initial search index can be small and deterministic, then expanded later.

Recommended first-pass strategy:

1. Verify official host/path/locale matrix manually during apply planning or with a separate non-unit verification script.
2. Store a checked-in seed index of official documentation entries only if within review budget.
3. Search locally over indexed fields: title, headings, URL path segments, and short snippets.
4. Use deterministic token scoring with exact and partial matches; no LLM synthesis.
5. Revalidate every indexed URL at load/build time or before returning results.

If a first PR risks exceeding 800 changed lines, slice as:

- Slice 1: schemas, allowlist, errors, tests.
- Slice 2: fetch/cache/redirects/extraction, tests.
- Slice 3: search index/ranking and MCP wiring, tests.

Avoid using an unofficial search API. If Mercado Pago exposes an official search endpoint, treat it as out of first-scope unless verified as official and covered by the same allowlist/no-synthesis rules.

## HTML Extraction

Extraction should convert official documentation HTML into stable, readable Markdown or cleaned text.

Requirements:

- Remove scripts, styles, templates, tracking markup, nav-only regions, cookie banners, footers, and unrelated layout.
- Prefer semantic main content selectors after inspecting fixtures, e.g. `main`, `article`, or docs-specific content containers.
- Preserve:
  - title
  - heading hierarchy
  - paragraphs and lists
  - code blocks and inline code
  - tables
  - official links
  - API endpoint examples
- Resolve relative official links against the canonical page URL and validate returned links when included.
- Do not add explanations or conclusions beyond extracted content.

Use fixture-driven extraction tests. Keep selectors configurable or layered so dynamic Mercado Pago layout changes are easier to adapt.

## Error Model

Define domain errors with stable codes:

- `InvalidUrl`
- `UrlNotAllowed`
- `NotFound`
- `FetchFailed`
- `UnsupportedContentType`
- `ExtractionFailed`
- `RateLimited`

Each error should carry safe context only, such as normalized host/path, status code, or validation reason. It must not expose secrets, raw stack traces, or internal configuration. The MCP adapter maps these domain errors to MCP-visible error responses consistently.

## Dependency Choices

Do not install dependencies during design. Likely dependencies for apply phase:

- `@modelcontextprotocol/sdk` for MCP server wiring.
- `zod` for runtime schemas and type inference.
- `cheerio` for HTML parsing/extraction, or alternatively `jsdom` if DOM compatibility is more important than size.
- `turndown` for HTML-to-Markdown conversion if custom extraction is not enough.
- `vitest` for tests if not already present.

Example install commands for later apply phase, all preserving the project install rule:

```bash
pnpm add @modelcontextprotocol/sdk zod cheerio turndown --ignore-scripts
pnpm add -D vitest @types/node --ignore-scripts
pnpm install --ignore-scripts
```

Prefer the smallest dependency set that satisfies tests. If `cheerio` plus custom Markdown rendering is sufficient, defer `turndown`.

## Verifying Official Host/Path Matrix Before Apply

The exact Mercado Pago official docs host/path matrix must be verified before implementation, but unit tests must not rely on live network access.

Recommended approach:

1. Perform a one-time manual or scripted verification before apply starts, outside the unit test suite.
2. Record the verified matrix in OpenSpec or a checked-in data file used by allowlist tests.
3. Capture representative HTML fixtures from verified official docs pages and commit sanitized/static fixtures for tests.
4. Unit tests assert behavior against the recorded matrix and fixtures only.
5. If an optional verification script is added later, keep it separate from `pnpm test`, mark it as manual/integration, and require explicit opt-in. It must not be part of the default test command.

This keeps `pnpm test` deterministic while still requiring real-world verification before applying the design.

## Test Strategy

Strict TDD sequence for apply phase:

1. Write failing Vitest tests first.
2. Implement the smallest code to pass.
3. Add triangulating tests for edge cases.
4. Refactor with tests green.

Required test areas:

- MCP tool schema registration and input/output shapes.
- Search input validation: empty/overlong query, bad locale/country, bad limit.
- Search result filtering: only allowlisted docs/reference URLs are returned.
- Read input validation: exactly one of `doc_id` or `url`.
- URL validation rejects non-HTTPS, localhost, IP literals, userinfo, non-standard ports, non-Mercado Pago hosts, and non-doc/reference paths.
- URL validation accepts representative verified docs/reference URL shapes.
- Redirect policy accepts all-allowlisted chains and rejects any chain leaving the allowlist.
- Fetcher maps 404, 429, non-2xx, network failure, and unsupported content type to stable errors.
- Cache returns deterministic hit/miss/revalidated metadata.
- Extraction preserves headings, code blocks, tables, links, and endpoint examples.
- Extraction removes nav/footer/script/style/cookie/tracking noise.
- Outputs contain no synthesized Q&A answers.

All HTTP behavior should use mocked `fetch` or fixture-backed adapters. No unit test may call Mercado Pago live documentation.

Required command:

```bash
pnpm test
```

## Rollout and Slicing

Apply-phase work should be forecast against the 800-line review budget before editing. If the forecast exceeds budget, split into chained slices.

Suggested slices:

1. **Safety foundation**: schemas, domain errors, allowlist, redirect policy tests and implementation.
2. **Content foundation**: fetch abstraction, in-memory cache, HTML extraction tests and implementation.
3. **MCP/search integration**: seed index, search/ranking, MCP SDK wiring, end-to-end mocked MCP tests.

Rollback options:

- Disable read-by-URL and allow only `doc_id` reads if URL safety is uncertain.
- Ship a smaller seed index if extraction/search expansion exceeds review budget.
- Revert MCP tool registration without affecting lower-level tested modules.

## Open Decisions for Apply Phase

- Final verified official host/path/locale/country matrix.
- Whether initial search index is checked-in seed data or generated from verified fixtures.
- Whether extraction uses `cheerio` only or adds `turndown`.
- Whether resources are included in the first implementation PR or deferred after tools pass tests.

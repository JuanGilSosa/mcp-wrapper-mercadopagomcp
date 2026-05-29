status: blocked_partial

executive_summary: |
  Explored a safe first-scope SDD proposal for a TypeScript MCP server that searches and reads official Mercado Pago documentation only.
  The subagent could not write this file directly, so the parent persisted the findings.

artifacts:
  proposed_change_name: add-mercadopago-docs-mcp
  repo_context_read:
    - openspec/config.yaml

findings:
  official_sources:
    - Use only HTTPS Mercado Pago developer documentation pages.
    - Primary allowed path families:
      - /developers/{locale}/docs/**
      - /developers/{locale}/reference/**
    - Likely official hosts should be statically allowlisted, not pattern-guessed at runtime. Candidate list should be verified before apply:
      - www.mercadopago.com
      - www.mercadopago.com.ar
      - www.mercadopago.com.br
      - www.mercadopago.com.mx
      - country-specific Mercado Pago developer doc hosts if confirmed official.

  first_scope_mcp_surface:
    tools:
      - name: mercado_pago_search_docs
        purpose: Search indexed official docs and return ranked doc/page matches only.
        input:
          - query: string
          - locale: optional enum, e.g. es, en, pt
          - country: optional allowlisted country/site selector
          - limit: optional bounded number
        output:
          - title
          - url
          - locale/country
          - snippet
          - source_kind: docs | reference
      - name: mercado_pago_read_doc
        purpose: Fetch/read one allowlisted official documentation page and return cleaned page content.
        input:
          - url or doc_id
        output:
          - title
          - canonical_url
          - headings
          - markdown/text content
          - fetched_at/cache metadata
    resources:
      - mp-docs://index/{locale}
      - mp-docs://page/{doc_id}
    explicit_non_goals:
      - No Q&A answer synthesis.
      - No checkout/payment business advice generation.
      - No non-official sources.
      - No crawling arbitrary URLs.

  safety_constraints:
    url_allowlisting:
      - Require HTTPS.
      - Reject IP literals, localhost, userinfo URLs, non-standard ports, and encoded redirect tricks.
      - Normalize URL before validation.
      - Follow redirects only if every hop remains on an allowlisted official host and path.
      - Restrict paths to developer docs/reference paths.
    extraction:
      - Strip navigation, cookie banners, scripts, styles, footers, and unrelated layout.
      - Preserve headings, code blocks, tables, official links, and API endpoint examples.
      - Return source URL and no synthesized conclusions.
    caching:
      - Prefer deterministic cache abstraction with TTL and optional ETag/Last-Modified support.
      - Cache search index/page reads to avoid repeated official-site requests.
      - Provide force-refresh only if safe and bounded.
    errors:
      - InvalidUrl
      - UrlNotAllowed
      - NotFound
      - FetchFailed
      - UnsupportedContentType
      - ExtractionFailed
      - RateLimited

acceptance_criteria:
  strict_tdd:
    - Before implementation, add failing Vitest tests for MCP tool schemas, URL allowlisting, search behavior, read behavior, extraction, and error mapping.
    - Use mocked HTTP/fetch fixtures only; unit tests must not depend on live Mercado Pago network availability.
    - pnpm test is the required test command.
    - Any pnpm install/add command must include --ignore-scripts.
  test_cases:
    - search returns only official Mercado Pago docs/reference URLs.
    - search rejects empty/overlong queries and bounds limit.
    - read rejects non-HTTPS, localhost, IP, non-Mercado Pago, and non-doc paths.
    - read accepts a known allowlisted docs/reference URL shape.
    - extraction fixture preserves title, headings, code blocks, tables, and links.
    - extraction removes nav/footer/script/style content.
    - redirect outside allowlist is rejected.
    - fetch/content errors map to stable MCP errors.
    - no answer synthesis appears in tool output.

next_recommended:
  - Create an OpenSpec proposal/design/tasks for add-mercadopago-docs-mcp.
  - Verify exact official Mercado Pago documentation host/path matrix before implementation.
  - Scaffold TypeScript/Vitest package first, then write failing tests before production MCP code.
  - Keep first PR under the 800-line review budget; split scaffold/indexing/MCP wiring if forecast exceeds budget.

risks:
  - Exact Mercado Pago docs host and locale structure needs live verification.
  - Official docs may be dynamic, making extraction brittle.
  - No confirmed official search API; local indexing from official docs may be safer.
  - Country/localization differences can produce duplicate or conflicting pages.
  - Must avoid SSRF/open-redirect issues in read-by-URL tool.

skill_resolution: none

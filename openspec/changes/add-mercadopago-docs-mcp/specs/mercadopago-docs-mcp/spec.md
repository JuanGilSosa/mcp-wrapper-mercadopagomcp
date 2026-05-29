# Mercado Pago Docs MCP Specification

## Purpose

Provide a TypeScript MCP capability for searching and reading official Mercado Pago developer documentation only, returning source-backed document results and extracted documentation content without synthesized answers.

## Requirements

### Requirement: Search Tool Contract

The system MUST expose an MCP tool named `mercado_pago_search_docs` that accepts a validated search request and returns ranked official documentation matches only.

#### Scenario: Valid search returns document matches

- GIVEN a search request with a non-empty `query`, optional allowed `locale`, optional allowed `country`, and optional bounded `limit`
- WHEN the `mercado_pago_search_docs` tool is invoked
- THEN the tool MUST return a structured result containing an array of matches
- AND each match MUST include `title`, `url`, `snippet`, `source_kind`, and available locale or country metadata
- AND `source_kind` MUST be either `docs` or `reference`
- AND every returned `url` MUST pass the official source allowlist requirements.

#### Scenario: Search input validation rejects invalid requests

- GIVEN a search request with an empty query, unsupported locale or country, malformed field type, or limit outside the allowed bounds
- WHEN the `mercado_pago_search_docs` tool validates the input
- THEN the tool MUST reject the request with a stable validation error
- AND the tool MUST NOT fetch documentation content for the invalid request.

### Requirement: Read Tool Contract

The system MUST expose an MCP tool named `mercado_pago_read_doc` that accepts either a stable document identifier or an allowlisted official documentation URL and returns cleaned page content with source metadata.

#### Scenario: Valid read returns cleaned document content

- GIVEN a read request with a valid `doc_id` or an HTTPS Mercado Pago documentation URL that passes allowlist validation
- WHEN the `mercado_pago_read_doc` tool is invoked
- THEN the tool MUST return `title`, `canonical_url`, `headings`, cleaned text or Markdown `content`, and source metadata
- AND `canonical_url` MUST be an official allowlisted Mercado Pago documentation URL
- AND the output MUST identify cache or fetch metadata when available without changing the documentation meaning.

#### Scenario: Read input validation rejects invalid requests

- GIVEN a read request with neither `doc_id` nor `url`, both conflicting identifiers, malformed identifiers, or a URL that fails URL safety validation
- WHEN the `mercado_pago_read_doc` tool validates the input
- THEN the tool MUST reject the request with a stable validation error
- AND the tool MUST NOT fetch rejected URLs.

### Requirement: Official Source Allowlisting

The system MUST restrict all indexed, searched, fetched, redirected, and returned documentation sources to official Mercado Pago developer documentation.

#### Scenario: Allowlisted documentation path is accepted

- GIVEN an HTTPS URL on a verified official Mercado Pago host
- AND the normalized path is within `/developers/{locale}/docs/**` or `/developers/{locale}/reference/**`
- WHEN the system validates the URL as a documentation source
- THEN the URL MAY be accepted for search or read processing.

#### Scenario: Unsafe or unofficial source is rejected

- GIVEN a URL using non-HTTPS, localhost, an IP literal, userinfo, a non-standard port, an unofficial host, or a path outside the allowed developer docs/reference families
- WHEN the system validates the URL
- THEN the URL MUST be rejected as not allowed
- AND the system MUST NOT fetch or return content from that URL.

### Requirement: Redirect Safety

The system MUST follow redirects only when every redirect hop remains within the official source allowlist.

#### Scenario: Redirect chain remains allowlisted

- GIVEN an allowlisted official documentation URL that redirects to another allowlisted official documentation URL
- WHEN the system fetches the document
- THEN the system MAY follow the redirect
- AND the final `canonical_url` MUST be the normalized allowlisted final URL.

#### Scenario: Redirect chain leaves allowlist

- GIVEN an allowlisted initial URL that redirects to an unofficial host, unsafe URL form, or disallowed path
- WHEN the system evaluates the redirect response
- THEN the system MUST stop following the redirect
- AND it MUST return a stable not-allowed error
- AND it MUST NOT expose content from the disallowed target.

### Requirement: Documentation Extraction

The system MUST extract useful official documentation content while removing unrelated layout, executable, and tracking noise.

#### Scenario: Useful documentation elements are preserved

- GIVEN an official documentation HTML fixture containing a title, headings, paragraphs, code blocks, tables, official links, and API endpoint examples
- WHEN the extraction pipeline creates the read output
- THEN the output MUST preserve the title, heading structure, relevant prose, code blocks, tables, links, and endpoint examples in cleaned text or Markdown.

#### Scenario: Layout and script noise is removed

- GIVEN an official documentation HTML fixture containing navigation, cookie banners, scripts, styles, footers, tracking markup, and unrelated layout content
- WHEN the extraction pipeline creates the read output
- THEN the output MUST exclude scripts, styles, navigation-only content, cookie banners, footers, tracking markup, and unrelated layout noise.

### Requirement: Stable Error Mapping

The system MUST map validation, fetch, content, extraction, and rate-limit failures to stable MCP-facing errors.

#### Scenario: Known failures produce stable errors

- GIVEN a failure corresponding to malformed tool input, invalid URL input, disallowed URL, missing document, network or fetch failure, unsupported content type, extraction failure, or rate limiting
- WHEN the system returns an MCP-visible error
- THEN the error code MUST be one of `InvalidInput`, `InvalidUrl`, `UrlNotAllowed`, `NotFound`, `FetchFailed`, `UnsupportedContentType`, `ExtractionFailed`, or `RateLimited`
- AND the error response SHOULD include safe diagnostic context without leaking implementation secrets.

### Requirement: No Synthesized Answers

The system MUST NOT generate Q&A answers, recommendations, conclusions, or integration advice in the first scope.

#### Scenario: Search output remains source-result only

- GIVEN a user query that asks for an explanation, recommendation, or answer
- WHEN the `mercado_pago_search_docs` tool returns results
- THEN the output MUST contain document match metadata and snippets only
- AND it MUST NOT synthesize an answer to the user's question.

#### Scenario: Read output remains extracted documentation only

- GIVEN a user requests an official documentation page
- WHEN the `mercado_pago_read_doc` tool returns content
- THEN the output MUST contain extracted official documentation content and source metadata only
- AND it MUST NOT add conclusions, recommendations, or Q&A synthesis beyond the source content.

### Requirement: Strict TDD and Test Isolation

The system SHALL be developed under strict TDD using Vitest, with unit tests isolated from live Mercado Pago network availability.

#### Scenario: Failing tests precede implementation

- GIVEN implementation work begins for this capability
- WHEN behavior is added or changed
- THEN failing Vitest tests SHALL be written before production implementation
- AND development SHALL follow RED -> GREEN -> TRIANGULATE -> REFACTOR.

#### Scenario: Unit tests use mocked HTTP fixtures

- GIVEN unit tests cover search, read, allowlisting, redirects, extraction, and error mapping
- WHEN `pnpm test` is run
- THEN the tests MUST use mocked HTTP or fetch fixtures
- AND the tests MUST NOT require live network access to Mercado Pago documentation.

#### Scenario: Dependency commands preserve install safety

- GIVEN dependencies are installed or added during implementation
- WHEN a `pnpm install` or `pnpm add` command is used
- THEN the command MUST include `--ignore-scripts`.

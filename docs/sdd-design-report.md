status: completed

executive_summary: |
  Wrote the SDD technical design for `add-mercadopago-docs-mcp` under the OpenSpec change directory. The design keeps the first scope limited to a TypeScript MCP server that searches and reads official Mercado Pago documentation only, with no Q&A synthesis. It defines module boundaries, MCP SDK wiring, schemas, URL allowlisting, redirect safety, fetch/cache abstraction, search/index strategy, HTML extraction, stable errors, dependency choices, verification approach, and strict Vitest TDD strategy. Dependency commands are examples only and include `--ignore-scripts`.

artifacts:
  created:
    - openspec/changes/add-mercadopago-docs-mcp/design.md
  read:
    - openspec/config.yaml
    - sdd-explore-report.md
    - openspec/changes/add-mercadopago-docs-mcp/proposal.md
    - openspec/changes/add-mercadopago-docs-mcp/specs/mercadopago-docs-mcp/spec.md
  notes:
    - Engram memory tools were not available in this subagent tool namespace, so significant decisions were persisted in the OpenSpec design artifact only.

next_recommended:
  - Verify the exact official Mercado Pago host/path/locale/country matrix before apply.
  - Keep unit tests fixture/mocked-fetch only; do not include live network checks in `pnpm test`.
  - In apply phase, start with failing Vitest tests for schemas, allowlist, redirects, fetch/cache, extraction, search, and MCP wiring.
  - Forecast changed lines before implementation and slice if the 800-line review budget is likely to be exceeded.

risks:
  - Mercado Pago docs host/path structure still requires confirmation before implementation.
  - Official docs may be dynamic, which can make extraction selectors brittle.
  - Search quality may be modest if the first release uses a small curated seed index.
  - Read-by-URL behavior remains SSRF/open-redirect sensitive and must rely on centralized allowlist plus manual redirect validation.

skill_resolution: none

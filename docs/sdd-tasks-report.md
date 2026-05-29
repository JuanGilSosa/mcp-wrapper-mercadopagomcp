status: completed
executive_summary: |
  Created the SDD implementation tasks for `add-mercadopago-docs-mcp`. The task plan follows strict Vitest TDD ordering with RED tests before GREEN implementation, accounts for the missing package scaffold by selecting a simple root `package.json` plus `src/mercadopago-docs/` default, and forecasts the full scope above a comfortable single-review budget. It recommends chained PR slices so each implementation unit can stay under the 800-line review budget.
artifacts:
  created:
    - openspec/changes/add-mercadopago-docs-mcp/tasks.md
    - sdd-tasks-report.md
  read:
    - openspec/config.yaml
    - sdd-explore-report.md
    - openspec/changes/add-mercadopago-docs-mcp/proposal.md
    - openspec/changes/add-mercadopago-docs-mcp/specs/mercadopago-docs-mcp/spec.md
    - openspec/changes/add-mercadopago-docs-mcp/design.md
  decisions:
    - Default implementation root should be root package scaffold plus `src/mercadopago-docs/` and `tests/mercadopago-docs/` unless apply-phase discovery finds monorepo evidence.
    - Full implementation should be split into PR 1 safety/scaffold, PR 2 fetch/cache/extraction, and PR 3 search/MCP/docs.
    - Chain strategy remains pending; decision is needed before apply because the forecast recommends chained PRs.
  memory:
    - Engram memory tools were not available in this subagent tool namespace, so significant task-planning decisions were persisted in OpenSpec/report files only.
next_recommended:
  - Review and approve `openspec/changes/add-mercadopago-docs-mcp/tasks.md` before apply.
  - Before implementation, verify and record the exact official Mercado Pago host/path/locale matrix.
  - Decide the chained PR topology before apply because `tasks.md` marks chain strategy as pending.
  - In apply, write failing Vitest tests first and use mocked HTTP/fetch fixtures only; run `pnpm test`.
risks:
  - Full scope is likely 900-1,400 changed lines, so a single PR may exceed the 800-line review budget.
  - Official Mercado Pago docs host/path matrix remains unverified.
  - Extraction may be brittle if official docs are dynamic or layout-heavy.
  - Read-by-URL remains SSRF/open-redirect sensitive and must be implemented only behind centralized allowlist and redirect validation.
skill_resolution: none

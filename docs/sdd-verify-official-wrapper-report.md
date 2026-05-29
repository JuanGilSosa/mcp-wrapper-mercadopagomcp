# SDD Verify Report: official wrapper

Status: **FAIL** due to review-workload boundary mismatch. Functional verification passed.

## Commands

- `pnpm test` — PASS, 16 files / 99 tests.
- `pnpm build` — PASS.

## Summary

- Existing docs MCP remains default: `pnpm start` is still `node dist/server.js`.
- Official wrapper validates `AUTH_HEADER=Bearer <ACCESS_TOKEN>` before spawn.
- Effective command builds `npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:<AUTH_HEADER>`.
- Tests are mocked; no live official MCP calls found.
- Token redaction, startup timeout clearing on spawn/output, and idempotent signal cleanup are covered.
- Pi/OpenCode docs are present.
- Strict TDD evidence table exists and reported tests match the codebase.

## Blocker

Measured non-artifact changed lines in the latest change are **836**, above the approved **800-line** single-PR boundary, while `apply-progress.md` records approximately 671 and no `size:exception` is recorded.

Recommended fix: split/reduce below 800 or record an explicit size exception for 836 changed lines before archive/PR.

Detailed report: `openspec/changes/add-mercadopago-official-wrapper/verify-report.md`.

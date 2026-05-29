status: completed
executive_summary: >
  Wrote the OpenSpec design for `add-mercadopago-official-wrapper`. The design
  chooses an isolated `src/mercadopago-official-wrapper/` stdio bridge runner,
  keeps the existing docs MCP server unchanged, defines config/command/runner
  boundaries, documents Pi/OpenCode local client setup, and sets strict TDD seams
  for mocked child-process testing.
artifacts:
  created:
    - openspec/changes/add-mercadopago-official-wrapper/design.md
    - docs/sdd-design-official-wrapper-report.md
  read:
    - /home/juan/.config/opencode/skills/cognitive-doc-design/SKILL.md
    - openspec/config.yaml
    - openspec/changes/add-mercadopago-official-wrapper/proposal.md
    - package.json
    - src/server.ts
    - src/index.ts
    - src/mercadopago-docs/index.ts
    - src/mercadopago-docs/mcp.ts
    - tsconfig.json
    - README.md
next_recommended:
  - Review/approve the design, then write OpenSpec tasks before apply.
  - In apply, start with RED Vitest tests for config, command construction,
    token redaction, mocked stdio bridging, lifecycle cleanup, and docs preservation.
risks:
  - Node `spawn(args)` does not expand `Authorization:${AUTH_HEADER}`; the design
    calls this out and requires effective in-process header construction while still
    documenting the official evidence shape.
  - `npx -y mcp-remote` can be slow or environment-dependent for Pi/OpenCode users.
  - Review budget should fit a focused single PR, but split if hand-authored changes
    exceed roughly 800 lines.
skill_resolution: paths-injected
memory: unavailable; no Engram memory tools were present in this subagent namespace,
  so decisions and artifacts were persisted in OpenSpec/report files only.

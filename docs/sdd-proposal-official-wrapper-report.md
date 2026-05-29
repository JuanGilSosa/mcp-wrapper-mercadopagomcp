status: completed
executive_summary: >
  Created a lightweight OpenSpec proposal for `add-mercadopago-official-wrapper`.
  The proposal scopes a separate TypeScript wrapper module that uses `mcp-remote`
  as a child/stdio bridge to the official Mercado Pago MCP endpoint for Pi and
  OpenCode, while preserving the existing local docs MCP implementation.
artifacts:
  - openspec/changes/add-mercadopago-official-wrapper/proposal.md
next_recommended:
  - Write the SDD design for the isolated wrapper module, including runner shape,
    process lifecycle, auth handling, and Pi/OpenCode client config examples.
  - Write SDD tasks with strict RED -> GREEN -> TRIANGULATE -> REFACTOR ordering
    before implementation.
  - Decide in design whether the wrapper is a separate binary or opt-in server
    mode; default should minimize changes to current `src/server.ts` behavior.
risks:
  - `mcp-remote`/`npx` startup and package-cache behavior may vary by client environment.
  - Pi and OpenCode may differ in environment variable expansion for `AUTH_HEADER`.
  - Auth or upstream connection failures may be opaque through the bridge.
  - Child process lifecycle and token redaction require explicit tests.
skill_resolution: paths-injected
memory:
  - Engram memory tools were not available in this subagent toolset, so no memory save/session summary was written.

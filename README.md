# Mercado Pago Docs MCP

TypeScript MCP capability for consulting **official Mercado Pago documentation only**. The first scope exposes search and read tools that return source-linked results and extracted documentation content.

## Quick path

1. Install dependencies safely:

   ```bash
   pnpm install --ignore-scripts
   ```

2. Run the deterministic test suite:

   ```bash
   pnpm test
   ```

3. Build and start the stdio MCP server:

   ```bash
   pnpm build
   pnpm start
   ```

4. Use the MCP tools:
   - `mercado_pago_search_docs` returns ranked official docs/reference matches.
   - `mercado_pago_read_doc` returns extracted content from an allowlisted official docs URL or indexed `doc_id`.

## MCP client configuration

Build first, then point stdio-capable clients at the compiled runner:

```json
{
  "mcpServers": {
    "mercado-pago-docs": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-mercadopago-glosari/dist/server.js"]
    }
  }
}
```

For local development from this repository, run `pnpm build` after code changes and use `pnpm start` to launch `node dist/server.js` over stdio.

## Boundaries

| Topic | Decision |
|-------|----------|
| Sources | official Mercado Pago documentation only |
| Search | local curated seed index; no arbitrary crawling |
| Read | HTTPS allowlisted `/developers/{locale}/docs/**` and `/developers/{locale}/reference/**` pages |
| Safety | rejects non-official hosts, localhost/IP/userinfo/non-standard ports, and unsafe redirects |
| Output | source matches and extracted docs content only |
| No Q&A synthesis | No Q&A synthesis, recommendations, conclusions, or business advice are generated |
| Tests | mocked fetch and static fixtures only; no live Mercado Pago network dependency in `pnpm test` |

## Safe dependency commands

Every dependency command must include `--ignore-scripts`:

```bash
pnpm install --ignore-scripts
pnpm add @modelcontextprotocol/sdk zod cheerio --ignore-scripts
pnpm add -D typescript vitest @types/node --ignore-scripts
pnpm test
pnpm build
pnpm start
```

## Current source matrix

The first release keeps the official source matrix conservative:

- `https://mercadopago.com/developers/{es|en|pt}/docs/**`
- `https://mercadopago.com/developers/{es|en|pt}/reference/**`
- `https://www.mercadopago.com/developers/{es|en|pt}/docs/**`
- `https://www.mercadopago.com/developers/{es|en|pt}/reference/**`

Country-specific hosts must not be added without a recorded verification artifact.

## Review checklist

- [ ] Tool outputs contain only source results or extracted source content.
- [ ] URL validation runs before any fetch.
- [ ] Tests use mocked fetch/static fixtures only.
- [ ] Dependency install commands include `--ignore-scripts`.

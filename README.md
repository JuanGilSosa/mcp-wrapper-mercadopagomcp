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

This repository now exposes **two separate local MCP entrypoints**. Build first:

```bash
pnpm build
```

### 1. Curated docs MCP

Use this when you want the local, deterministic documentation tools implemented in this repo:

- `mercado_pago_search_docs`
- `mercado_pago_read_doc`

Generic stdio client config:

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

For local development, `pnpm start` launches this docs server:

```bash
pnpm start
# node dist/server.js
```

### 2. Official Mercado Pago MCP wrapper

Use this when Pi/OpenCode cannot connect directly to Mercado Pago's remote MCP. The wrapper is local stdio, but internally launches `mcp-remote` against:

```txt
https://mcp.mercadopago.com/mcp
```

Runtime requirement:

```bash
AUTH_HEADER="Bearer <ACCESS_TOKEN>"
```

Do **not** commit real tokens or client config files containing credentials.

#### Pi / Claude-style config

```json
{
  "mcpServers": {
    "mercado-pago-official": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-mercadopago-glosari/dist/mercadopago-official-wrapper/server.js"
      ],
      "env": {
        "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
      }
    }
  }
}
```

#### OpenCode config

OpenCode uses a different local MCP schema: `command` is an argv array and environment variables go under `environment`.

```json
{
  "mcp": {
    "mercado-pago-official": {
      "enabled": true,
      "type": "local",
      "command": [
        "node",
        "/absolute/path/to/mcp-mercadopago-glosari/dist/mercadopago-official-wrapper/server.js"
      ],
      "environment": {
        "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
      }
    }
  }
}
```

You can also smoke-test the wrapper manually:

```bash
AUTH_HEADER="Bearer <ACCESS_TOKEN>" pnpm start:official
```

Full wrapper guide: `docs/mercadopago-official-wrapper.md`.

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

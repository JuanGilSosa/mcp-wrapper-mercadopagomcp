# Mercado Pago official MCP wrapper

Use this local wrapper when Pi or OpenCode cannot connect directly to Mercado Pago's remote MCP server. The existing `mercado-pago-docs` MCP remains available separately; this runner only bridges stdio to the official server through `mcp-remote`.

## Quick path

1. Install and build safely:

   ```bash
   pnpm install --ignore-scripts
   pnpm build
   pnpm test
   ```

2. Configure Pi or OpenCode to launch the compiled local wrapper:

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

3. Keep the real access token outside source control. Replace only your local client configuration value for `AUTH_HEADER`.

## What it runs

The local wrapper validates `AUTH_HEADER`, then starts:

```bash
npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:<AUTH_HEADER>
```

Node `spawn` does not expand `Authorization:${AUTH_HEADER}`, so the wrapper builds the effective header in-process and redacts it from errors/stderr.

## Existing docs MCP

The curated docs server is unchanged:

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

`pnpm start` still launches `node dist/server.js`. Use `pnpm start:official` only for the official wrapper.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| missing `npx` | Install Node.js/npm in the environment used by Pi/OpenCode. |
| missing or invalid `AUTH_HEADER` | Set `AUTH_HEADER` exactly as `Bearer <ACCESS_TOKEN>`. |
| startup latency | `npx -y mcp-remote` may download or warm package cache before connecting. |
| upstream official MCP errors | Verify the Mercado Pago token, permissions, country/account setup, and network access to `https://mcp.mercadopago.com/mcp`. |

Do not commit real tokens, `.env` files, or client config files containing credentials.

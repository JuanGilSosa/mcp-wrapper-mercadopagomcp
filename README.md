# Mercado Pago official MCP wrapper

Local stdio wrapper for Mercado Pago's official remote MCP server. Use it when Pi, OpenCode, or another MCP client needs a local command but the real server lives at:

```txt
https://mcp.mercadopago.com/mcp
```

The wrapper validates `AUTH_HEADER`, starts `npx -y mcp-remote`, bridges stdio, and redacts the bearer token from stderr/errors.

## Quick path

1. Install dependencies safely:

   ```bash
   pnpm install --ignore-scripts
   ```

2. Run the test suite and build:

   ```bash
   pnpm test
   pnpm build
   ```

3. Start the local wrapper:

   ```bash
   AUTH_HEADER="Bearer <ACCESS_TOKEN>" pnpm start
   ```

## MCP client configuration

Build first:

```bash
pnpm build
```

### Pi Agent config

Pi Agent reads MCP servers from `mcp.json`. Add the server directly as an object named `mercado-pago-official`:

```json
{
  "mercado-pago-official": {
    "command": "node",
    "args": [
      "/absolute/path/to/mcp-mercadopago-glosari/dist/server.js"
    ],
    "env": {
      "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
    },
    "lifecycle": "lazy",
    "directTools": true
  }
}
```

For example, with a local wrapper build:

```json
{
  "mercado-pago-official": {
    "command": "node",
    "args": [
      "/home/juan/my-mcp/wrapper-mercadopago/dist/mercadopago-official-wrapper/server.js"
    ],
    "env": {
      "AUTH_HEADER": "Bearer APP_USR-****************************"
    },
    "lifecycle": "lazy",
    "directTools": true
  }
}
```

Use an absolute path to the built `server.js` file and replace the token with your Mercado Pago access token. Keep real tokens out of git.

The important part is that `args` points to the compiled file inside `dist`. Do not point Pi Agent at the TypeScript source file. If you change the wrapper source, run `pnpm build` again so `dist/server.js` stays up to date.

A future npm package can make this easier by replacing the local absolute path with a package command such as `npx` or a package binary. Until that package is published, the supported setup is the local compiled `dist` path.

### OpenCode config

OpenCode uses a local MCP schema where `command` is an argv array and environment variables go under `environment`.

```json
{
  "mcp": {
    "mercado-pago-official": {
      "enabled": true,
      "type": "local",
      "command": [
        "node",
        "/absolute/path/to/mcp-mercadopago-glosari/dist/server.js"
      ],
      "environment": {
        "AUTH_HEADER": "Bearer <ACCESS_TOKEN>"
      }
    }
  }
}
```

## What it runs

The effective bridge command is:

```bash
npx -y mcp-remote https://mcp.mercadopago.com/mcp --header Authorization:<AUTH_HEADER>
```

`AUTH_HEADER` must include the `Bearer ` prefix. The wrapper builds the authorization header in-process because shell-style variable expansion is not available inside Node `spawn` arguments.

## Token safety

- Do not commit real tokens.
- Do not commit `.env` files or client config files containing credentials.
- Error output and child stderr are redacted before being written by the wrapper.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| missing `npx` | Install Node.js/npm in the environment used by the MCP client. |
| missing or invalid `AUTH_HEADER` | Set `AUTH_HEADER` exactly as `Bearer <ACCESS_TOKEN>`. |
| startup latency | `npx -y mcp-remote` may download or warm package cache before connecting. |
| upstream official MCP errors | Verify the Mercado Pago token, permissions, country/account setup, and network access. |

Full wrapper guide: `docs/mercadopago-official-wrapper.md`.

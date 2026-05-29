import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMercadoPagoDocsMcpServer } from "./mercadopago-docs/index.js";

const server = createMercadoPagoDocsMcpServer({
	fetch: globalThis.fetch,
});

await server.connect(new StdioServerTransport());

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMemoryCache, type MemoryCache } from "./cache.js";
import { MercadoPagoDocsError, toMcpError } from "./errors.js";
import {
	extractDocumentation,
	type ExtractedDocumentation,
} from "./extract.js";
import { fetchOfficialDoc, type FetchLike } from "./fetcher.js";
import { validateOfficialDocsUrl } from "./allowlist.js";
import {
	parseSafeReadDocInput,
	readDocInputSchema,
	searchDocsInputSchema,
} from "./schemas.js";
import {
	resolveDocById,
	searchDocs,
	type IndexedDoc,
	type SearchDocsOutput,
} from "./search.js";

export const MERCADO_PAGO_SEARCH_DOCS_TOOL = "mercado_pago_search_docs";
export const MERCADO_PAGO_READ_DOC_TOOL = "mercado_pago_read_doc";

export type McpTextResult = {
	content: Array<{ type: "text"; text: string }>;
	structuredContent: Record<string, unknown>;
	isError?: boolean;
};

export type MercadoPagoDocsHandlers = {
	callTool(name: string, input: unknown): Promise<McpTextResult>;
};

export type MercadoPagoDocsHandlerOptions = {
	fetch: FetchLike;
	cache?: MemoryCache<string>;
	index?: readonly IndexedDoc[];
	now?: () => Date;
	extract?: typeof extractDocumentation;
};

export type OfficialMcpServer = McpServer;

export type MercadoPagoDocsMcpServerOptions =
	Partial<MercadoPagoDocsHandlerOptions> & {
		name?: string;
		version?: string;
	};

type ToolRegistrar = {
	registerTool(
		name: string,
		config: Record<string, unknown>,
		handler: (input: unknown) => Promise<McpTextResult>,
	): unknown;
};

function textResult(
	structuredContent: Record<string, unknown>,
	isError = false,
): McpTextResult {
	return {
		content: [
			{ type: "text", text: JSON.stringify(structuredContent, null, 2) },
		],
		structuredContent,
		...(isError ? { isError: true } : {}),
	};
}

function sourceMetadata(
	url: string,
	cache: "hit" | "miss",
	fetchedAt?: string,
): ExtractedDocumentation["links"] extends string[]
	? Record<string, unknown>
	: never {
	const validation = validateOfficialDocsUrl(url);
	if (!validation.ok) throw validation.error;
	return {
		source_kind: validation.sourceKind,
		locale: validation.locale,
		country: "global",
		cache,
		...(fetchedAt ? { fetched_at: fetchedAt } : {}),
	};
}

export function createMercadoPagoDocsHandlers(
	options: MercadoPagoDocsHandlerOptions,
): MercadoPagoDocsHandlers {
	const extract = options.extract ?? extractDocumentation;

	async function read(input: unknown): Promise<McpTextResult> {
		const parsed = parseSafeReadDocInput(input);
		const url =
			typeof parsed.doc_id === "string"
				? resolveDocById(parsed.doc_id, options.index)?.url
				: parsed.url;
		if (!url)
			return textResult(
				{
					error: toMcpError(
						new MercadoPagoDocsError(
							"NotFound",
							"Documentation document was not found",
						),
					),
				},
				true,
			);

		const fetched = await fetchOfficialDoc(url, {
			fetch: options.fetch,
			cache: options.cache,
			now: options.now,
		});
		const extracted = extract(fetched.body, { url: fetched.url });
		return textResult({
			title: extracted.title,
			canonical_url: extracted.canonical_url,
			headings: extracted.headings,
			content: extracted.content,
			metadata: sourceMetadata(
				extracted.canonical_url,
				fetched.metadata.cache,
				fetched.metadata.fetchedAt,
			),
		});
	}

	return {
		async callTool(name: string, input: unknown): Promise<McpTextResult> {
			try {
				if (name === MERCADO_PAGO_SEARCH_DOCS_TOOL)
					return textResult(
						searchDocs(input, {
							index: options.index,
						}) satisfies SearchDocsOutput,
					);
				if (name === MERCADO_PAGO_READ_DOC_TOOL) return await read(input);
				throw new Error(`Unknown Mercado Pago docs tool: ${name}`);
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.startsWith("Unknown Mercado Pago docs tool")
				)
					throw error;
				return textResult({ error: toMcpError(error) }, true);
			}
		},
	};
}

export function createMercadoPagoDocsMcpServer(
	options: MercadoPagoDocsMcpServerOptions = {},
): McpServer {
	const server = new McpServer({
		name: options.name ?? "mercado-pago-docs",
		version: options.version ?? "0.1.0",
	});
	const handlers = createMercadoPagoDocsHandlers({
		fetch: options.fetch ?? globalThis.fetch,
		cache:
			options.cache ?? createMemoryCache({ ttlMs: 300_000, maxEntries: 100 }),
		...(options.index ? { index: options.index } : {}),
		...(options.now ? { now: options.now } : {}),
		...(options.extract ? { extract: options.extract } : {}),
	});

	registerMercadoPagoDocsTools(server, handlers);
	return server;
}

export function registerMercadoPagoDocsTools(
	server: ToolRegistrar,
	handlers: MercadoPagoDocsHandlers,
): void {
	server.registerTool(
		MERCADO_PAGO_SEARCH_DOCS_TOOL,
		{
			title: "Search Mercado Pago documentation",
			description:
				"Search official Mercado Pago documentation only and return source result metadata without synthesized answers.",
			inputSchema: searchDocsInputSchema.shape,
		},
		(input: unknown) => handlers.callTool(MERCADO_PAGO_SEARCH_DOCS_TOOL, input),
	);

	server.registerTool(
		MERCADO_PAGO_READ_DOC_TOOL,
		{
			title: "Read Mercado Pago documentation",
			description:
				"Read one allowlisted official Mercado Pago documentation page and return extracted source content only.",
			inputSchema: readDocInputSchema,
		},
		(input: unknown) => handlers.callTool(MERCADO_PAGO_READ_DOC_TOOL, input),
	);
}

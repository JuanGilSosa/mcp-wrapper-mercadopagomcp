import * as cheerio from "cheerio";
import { validateOfficialDocsUrl } from "./allowlist.js";
import { MercadoPagoDocsError } from "./errors.js";

export type ExtractedHeading = { level: number; text: string };

export type ExtractedDocumentation = {
	title: string;
	canonical_url: string;
	headings: ExtractedHeading[];
	content: string;
	links: string[];
};

const noiseSelectors = [
	"script",
	"style",
	"template",
	"nav",
	"header",
	"footer",
	"aside",
	"[data-tracking-id]",
	'[class*="cookie" i]',
	'[id*="cookie" i]',
	'[class*="banner" i]',
];

function normalizeWhitespace(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function selectMain($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
	const candidates = [
		"main",
		"article",
		'[data-testid*="main" i]',
		'[class*="docs" i]',
		'[class*="content" i]',
	];
	for (const selector of candidates) {
		const selected = $(selector).first();
		if (selected.length && normalizeWhitespace(selected.text()).length > 0)
			return selected;
	}
	return cheerio.load("")("") as cheerio.Cheerio<any>;
}

function officialLink(baseUrl: string, href?: string): string | undefined {
	if (!href) return undefined;
	try {
		const resolved = new URL(href, baseUrl).toString();
		const validated = validateOfficialDocsUrl(resolved);
		return validated.ok ? validated.normalizedUrl : undefined;
	} catch {
		return undefined;
	}
}

function renderInline(
	$: cheerio.CheerioAPI,
	nodes: cheerio.Cheerio<any>,
	baseUrl: string,
	links: Set<string>,
): string {
	const parts: string[] = [];
	nodes.each((_, node) => {
		if (node.type === "text") {
			parts.push(node.data ?? "");
			return;
		}
		if (node.type !== "tag") return;

		const element = node as any;
		const tag = element.tagName.toLowerCase();
		const childText = renderInline($, $(element).contents(), baseUrl, links);
		if (tag === "code") {
			parts.push(`\`${normalizeWhitespace(childText)}\``);
			return;
		}
		if (tag === "a") {
			const href = officialLink(baseUrl, $(element).attr("href"));
			if (href) {
				links.add(href);
				parts.push(`[${normalizeWhitespace(childText)}](${href})`);
			} else {
				parts.push(normalizeWhitespace(childText));
			}
			return;
		}
		parts.push(childText);
	});
	return normalizeWhitespace(parts.join(""));
}

function renderTable($: cheerio.CheerioAPI, table: any): string {
	const rows: string[][] = [];
	$(table)
		.find("tr")
		.each((_, row) => {
			const cells = $(row)
				.find("th,td")
				.map((__, cell) => normalizeWhitespace($(cell).text()))
				.get();
			if (cells.length > 0) rows.push(cells);
		});
	if (rows.length === 0) return "";
	const [header, ...body] = rows;
	const separator = header.map(() => "---");
	return [header, separator, ...body]
		.map((row) => `| ${row.join(" | ")} |`)
		.join("\n");
}

function renderBlock(
	$: cheerio.CheerioAPI,
	element: any,
	baseUrl: string,
	links: Set<string>,
	headings: ExtractedHeading[],
): string[] {
	const tag = element.tagName.toLowerCase();
	if (/^h[1-6]$/.test(tag)) {
		const level = Number(tag.slice(1));
		const text = normalizeWhitespace($(element).text());
		if (!text) return [];
		headings.push({ level, text });
		return [`${"#".repeat(level)} ${text}`];
	}
	if (tag === "p") {
		const text = renderInline($, $(element).contents(), baseUrl, links);
		return text ? [text] : [];
	}
	if (tag === "pre") {
		const text = $(element).text().trim();
		return text ? [`\`\`\`\n${text}\n\`\`\``] : [];
	}
	if (tag === "ul" || tag === "ol") {
		return $(element)
			.children("li")
			.map(
				(_, item) => `- ${renderInline($, $(item).contents(), baseUrl, links)}`,
			)
			.get()
			.filter(Boolean);
	}
	if (tag === "table") {
		const table = renderTable($, element);
		return table ? [table] : [];
	}
	if (tag === "a") {
		const text = renderInline($, $(element), baseUrl, links);
		return text ? [text] : [];
	}
	return [];
}

export function extractDocumentation(
	html: string,
	options: { url: string },
): ExtractedDocumentation {
	const validated = validateOfficialDocsUrl(options.url);
	if (!validated.ok) throw validated.error;

	const $ = cheerio.load(html);
	$(noiseSelectors.join(",")).remove();
	const main = selectMain($);
	if (!main.length)
		throw new MercadoPagoDocsError(
			"ExtractionFailed",
			"Could not find main documentation content",
			{ url: validated.normalizedUrl },
		);

	const headings: ExtractedHeading[] = [];
	const links = new Set<string>();
	const blocks: string[] = [];
	main.find("h1,h2,h3,h4,h5,h6,p,pre,table,ul,ol,a").each((_, element) => {
		const hasRenderedAncestor =
			$(element).parents("p,li,table,pre,h1,h2,h3,h4,h5,h6").length > 0;
		if (hasRenderedAncestor) return;
		blocks.push(
			...renderBlock($, element, validated.normalizedUrl, links, headings),
		);
	});

	const content = blocks.join("\n\n").trim();
	if (!content)
		throw new MercadoPagoDocsError(
			"ExtractionFailed",
			"Extracted documentation content is empty",
			{ url: validated.normalizedUrl },
		);

	const title =
		headings[0]?.text ?? normalizeWhitespace($("title").first().text());
	return {
		title,
		canonical_url: validated.normalizedUrl,
		headings,
		content,
		links: [...links],
	};
}

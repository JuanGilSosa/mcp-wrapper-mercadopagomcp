import { z } from "zod";
import { validateOfficialDocsUrl } from "./allowlist.js";
import { SUPPORTED_LOCALES } from "./official-sources.js";

const localeSchema = z.enum(SUPPORTED_LOCALES);
const countrySchema = z.literal("global");

export const searchDocsInputSchema = z.object({
	query: z.string().trim().min(1).max(200),
	locale: localeSchema.optional(),
	country: countrySchema.optional(),
	limit: z.number().int().min(1).max(20).default(5),
});

const docIdSchema = z
	.string()
	.min(1)
	.max(160)
	.regex(/^[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)*$/);

const docIdReadSchema = z.object({
	doc_id: docIdSchema,
	url: z.never().optional(),
});

const urlReadSchema = z.object({
	url: z.url(),
	doc_id: z.never().optional(),
});

export const readDocInputSchema = z.union([docIdReadSchema, urlReadSchema]);

export type SearchDocsInput = z.infer<typeof searchDocsInputSchema>;
export type ReadDocInput = z.infer<typeof readDocInputSchema>;

export function parseSafeReadDocInput(input: unknown): ReadDocInput {
	const parsed = readDocInputSchema.parse(input);
	if (typeof parsed.url === "string") {
		const validation = validateOfficialDocsUrl(parsed.url);
		if (!validation.ok) throw validation.error;
		return { url: validation.normalizedUrl };
	}
	return { doc_id: parsed.doc_id };
}

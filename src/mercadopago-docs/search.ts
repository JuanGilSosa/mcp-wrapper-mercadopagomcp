import { validateOfficialDocsUrl } from './allowlist.js';
import { MercadoPagoDocsError } from './errors.js';
import { rankIndexedDocs } from './rank.js';
import { searchDocsInputSchema, type SearchDocsInput } from './schemas.js';
import { SEED_INDEX, type SeedDocEntry } from './seed-index.js';

export type IndexedDoc = SeedDocEntry;

export type SearchDocMatch = {
  doc_id: string;
  title: string;
  url: string;
  snippet: string;
  source_kind: 'docs' | 'reference';
  locale: 'es' | 'en' | 'pt';
  country: 'global';
};

export type SearchDocsOutput = {
  matches: SearchDocMatch[];
};

export type SearchDocsOptions = {
  index?: readonly IndexedDoc[];
};

function safeIndexedDocs(index: readonly IndexedDoc[]): IndexedDoc[] {
  const seen = new Set<string>();
  const docs: IndexedDoc[] = [];
  for (const doc of index) {
    const validation = validateOfficialDocsUrl(doc.url);
    if (!validation.ok) continue;
    const normalizedWithoutHash = new URL(validation.normalizedUrl);
    normalizedWithoutHash.hash = '';
    const key = normalizedWithoutHash.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    docs.push({ ...doc, url: key, source_kind: validation.sourceKind, locale: validation.locale });
  }
  return docs;
}

function filterDocs(input: SearchDocsInput, docs: readonly IndexedDoc[]): IndexedDoc[] {
  return docs.filter((doc) => {
    if (input.locale && doc.locale !== input.locale) return false;
    if (input.country && doc.country !== input.country) return false;
    return true;
  });
}

export function searchDocs(input: unknown, options: SearchDocsOptions = {}): SearchDocsOutput {
  const parsed = searchDocsInputSchema.parse(input);
  const index = safeIndexedDocs(options.index ?? SEED_INDEX);
  const ranked = rankIndexedDocs(parsed.query, filterDocs(parsed, index));
  return {
    matches: ranked.slice(0, parsed.limit).map(({ doc }) => ({
      doc_id: doc.doc_id,
      title: doc.title,
      url: doc.url,
      snippet: doc.snippet,
      source_kind: doc.source_kind,
      locale: doc.locale,
      country: doc.country,
    })),
  };
}

export function resolveDocById(docId: string, index: readonly IndexedDoc[] = SEED_INDEX): IndexedDoc | undefined {
  const doc = index.find((entry) => entry.doc_id === docId);
  if (!doc) return undefined;
  const validation = validateOfficialDocsUrl(doc.url);
  if (!validation.ok) throw new MercadoPagoDocsError('UrlNotAllowed', 'Indexed document URL is not allowlisted', { url: doc.url });
  return { ...doc, url: validation.normalizedUrl, source_kind: validation.sourceKind, locale: validation.locale };
}

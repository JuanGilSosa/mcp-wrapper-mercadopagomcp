import type { SeedDocEntry } from './seed-index.js';

export type RankedDoc = {
  doc: SeedDocEntry;
  score: number;
};

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function textIncludesToken(text: string, token: string): boolean {
  return tokens(text).some((candidate) => candidate === token || candidate.includes(token));
}

function fieldScore(queryTokens: string[], values: readonly string[] | undefined, weight: number): number {
  if (!values) return 0;
  return queryTokens.reduce((score, token) => score + (values.some((value) => textIncludesToken(value, token)) ? weight : 0), 0);
}

export function rankIndexedDocs(query: string, docs: readonly SeedDocEntry[]): RankedDoc[] {
  const queryTokens = [...new Set(tokens(query))];
  return docs
    .map((doc) => {
      const score =
        fieldScore(queryTokens, [doc.title], 10) +
        fieldScore(queryTokens, doc.headings, 5) +
        fieldScore(queryTokens, doc.keywords, 4) +
        fieldScore(queryTokens, [doc.snippet], 2) +
        fieldScore(queryTokens, [doc.url], 1);
      return { doc, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.doc.title.localeCompare(right.doc.title));
}

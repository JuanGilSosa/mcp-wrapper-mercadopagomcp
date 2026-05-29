import { normalizeOfficialDocsUrl } from './allowlist.js';

export type CacheStatus = 'hit' | 'miss' | 'revalidated';

export type CacheEntryMetadata = {
  etag?: string;
  lastModified?: string;
  storedAt: number;
};

export type CacheHit<T> = {
  cache: 'hit';
  value: T;
  metadata: CacheEntryMetadata;
};

export type CacheMiss = {
  cache: 'miss';
};

export type CacheGetResult<T> = CacheHit<T> | CacheMiss;

export type MemoryCache<T> = {
  get(key: string): CacheGetResult<T>;
  set(key: string, value: T, metadata?: Partial<Omit<CacheEntryMetadata, 'storedAt'>>): void;
};

export function normalizeCacheKey(key: string): string {
  const normalized = normalizeOfficialDocsUrl(key);
  const parsed = new URL(normalized);
  parsed.hash = '';
  return parsed.toString();
}

export function createMemoryCache<T>(options: { ttlMs: number; maxEntries: number; now?: () => number }): MemoryCache<T> {
  const now = options.now ?? Date.now;
  const entries = new Map<string, { value: T; metadata: CacheEntryMetadata }>();

  function evictOldestIfNeeded(): void {
    while (entries.size > options.maxEntries) {
      const oldest = entries.keys().next().value as string | undefined;
      if (!oldest) return;
      entries.delete(oldest);
    }
  }

  return {
    get(key: string): CacheGetResult<T> {
      const normalizedKey = normalizeCacheKey(key);
      const entry = entries.get(normalizedKey);
      if (!entry) return { cache: 'miss' };
      if (now() - entry.metadata.storedAt > options.ttlMs) {
        entries.delete(normalizedKey);
        return { cache: 'miss' };
      }
      return { cache: 'hit', value: entry.value, metadata: entry.metadata };
    },

    set(key: string, value: T, metadata: Partial<Omit<CacheEntryMetadata, 'storedAt'>> = {}): void {
      const normalizedKey = normalizeCacheKey(key);
      entries.delete(normalizedKey);
      entries.set(normalizedKey, {
        value,
        metadata: {
          etag: metadata.etag,
          lastModified: metadata.lastModified,
          storedAt: now(),
        },
      });
      evictOldestIfNeeded();
    },
  };
}

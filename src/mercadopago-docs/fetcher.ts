import type { MemoryCache } from './cache.js';
import { MercadoPagoDocsError } from './errors.js';
import { validateOfficialDocsUrl } from './allowlist.js';
import { validateRedirectHop } from './redirects.js';

export type FetchResponseLike = {
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

export type FetchLike = (url: string, init: { redirect: 'manual' }) => Promise<FetchResponseLike>;

export type FetchedOfficialDoc = {
  url: string;
  body: string;
  metadata: {
    cache: 'hit' | 'miss';
    contentType?: string;
    etag?: string;
    lastModified?: string;
    fetchedAt?: string;
  };
};

export type FetchOfficialDocOptions = {
  fetch: FetchLike;
  cache?: MemoryCache<string>;
  maxRedirects?: number;
  now?: () => Date;
};

type CacheMetadata = FetchedOfficialDoc['metadata'];

function errorForStatus(status: number, url: string): MercadoPagoDocsError {
  if (status === 404) return new MercadoPagoDocsError('NotFound', 'Mercado Pago documentation was not found', { status, url });
  if (status === 429) return new MercadoPagoDocsError('RateLimited', 'Mercado Pago documentation rate limit was reached', { status, url });
  return new MercadoPagoDocsError('FetchFailed', 'Mercado Pago documentation fetch failed', { status, url });
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

function assertSupportedContentType(contentType: string | undefined, url: string): void {
  if (!contentType) throw new MercadoPagoDocsError('UnsupportedContentType', 'Documentation response content type is missing', { url });
  const mediaType = contentType.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'text/html' && mediaType !== 'application/xhtml+xml') {
    throw new MercadoPagoDocsError('UnsupportedContentType', 'Documentation response content type is not supported', { url, reason: mediaType });
  }
}

export async function fetchOfficialDoc(inputUrl: string, options: FetchOfficialDocOptions): Promise<FetchedOfficialDoc> {
  const initial = validateOfficialDocsUrl(inputUrl);
  if (!initial.ok) throw initial.error;

  const cached = options.cache?.get(initial.normalizedUrl);
  if (cached?.cache === 'hit') {
    return {
      url: initial.normalizedUrl,
      body: cached.value,
      metadata: {
        cache: 'hit',
        etag: cached.metadata.etag,
        lastModified: cached.metadata.lastModified,
      },
    };
  }

  const maxRedirects = options.maxRedirects ?? 5;
  const fetchedAt = (options.now ?? (() => new Date()))().toISOString();
  let currentUrl = initial.normalizedUrl;

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    let response: FetchResponseLike;
    try {
      response = await options.fetch(currentUrl, { redirect: 'manual' });
    } catch {
      throw new MercadoPagoDocsError('FetchFailed', 'Mercado Pago documentation network fetch failed', { url: currentUrl });
    }

    if (isRedirect(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new MercadoPagoDocsError('FetchFailed', 'Redirect response is missing location', { status: response.status, url: currentUrl });
      const hop = validateRedirectHop(currentUrl, location);
      if (!hop.ok) throw hop.error;
      if (redirects === maxRedirects) throw new MercadoPagoDocsError('UrlNotAllowed', 'Redirect chain exceeds maximum hops', { url: currentUrl });
      currentUrl = hop.nextUrl;
      continue;
    }

    if (!response.ok) throw errorForStatus(response.status, currentUrl);

    const contentType = response.headers.get('content-type') ?? undefined;
    assertSupportedContentType(contentType, currentUrl);
    const body = await response.text();
    const metadata: CacheMetadata = {
      cache: 'miss',
      contentType,
      etag: response.headers.get('etag') ?? undefined,
      lastModified: response.headers.get('last-modified') ?? undefined,
      fetchedAt,
    };
    options.cache?.set(currentUrl, body, { etag: metadata.etag, lastModified: metadata.lastModified });
    return { url: currentUrl, body, metadata };
  }

  throw new MercadoPagoDocsError('UrlNotAllowed', 'Redirect chain exceeds maximum hops', { url: currentUrl });
}

import { MercadoPagoDocsError } from './errors.js';
import { validateOfficialDocsUrl } from './allowlist.js';

export type RedirectValidationResult =
  | { ok: true; nextUrl: string }
  | { ok: false; error: MercadoPagoDocsError };

export type RedirectChainValidationResult =
  | { ok: true; finalUrl: string }
  | { ok: false; error: MercadoPagoDocsError };

export function resolveRedirectLocation(currentUrl: string, location: string): string {
  return new URL(location, currentUrl).toString();
}

export function validateRedirectHop(currentUrl: string, location: string): RedirectValidationResult {
  const current = validateOfficialDocsUrl(currentUrl);
  if (!current.ok) return { ok: false, error: current.error };

  let nextUrl: string;
  try {
    nextUrl = resolveRedirectLocation(current.normalizedUrl, location);
  } catch {
    return { ok: false, error: new MercadoPagoDocsError('InvalidUrl', 'Redirect location is malformed') };
  }

  const next = validateOfficialDocsUrl(nextUrl);
  if (!next.ok) return { ok: false, error: next.error };

  return { ok: true, nextUrl: next.normalizedUrl };
}

export function validateRedirectChain(
  urls: readonly string[],
  options: { maxHops?: number } = {},
): RedirectChainValidationResult {
  const maxHops = options.maxHops ?? 5;
  if (urls.length === 0) {
    return { ok: false, error: new MercadoPagoDocsError('InvalidUrl', 'Redirect chain is empty') };
  }
  if (urls.length - 1 > maxHops) {
    return { ok: false, error: new MercadoPagoDocsError('UrlNotAllowed', 'Redirect chain exceeds maximum hops') };
  }

  const first = validateOfficialDocsUrl(urls[0]);
  if (!first.ok) return { ok: false, error: first.error };

  let currentUrl = first.normalizedUrl;
  for (const location of urls.slice(1)) {
    const hop = validateRedirectHop(currentUrl, location);
    if (!hop.ok) return hop;
    currentUrl = hop.nextUrl;
  }

  return { ok: true, finalUrl: currentUrl };
}

import { isIP } from 'node:net';
import { MercadoPagoDocsError } from './errors.js';
import { OFFICIAL_DOCS_SOURCES, type PathFamily, type SupportedLocale } from './official-sources.js';

export type ValidOfficialDocsUrl = {
  ok: true;
  normalizedUrl: string;
  host: string;
  locale: SupportedLocale;
  sourceKind: PathFamily;
};

export type InvalidOfficialDocsUrl = {
  ok: false;
  error: MercadoPagoDocsError;
};

export type OfficialDocsUrlValidation = ValidOfficialDocsUrl | InvalidOfficialDocsUrl;

const officialHosts = new Map(OFFICIAL_DOCS_SOURCES.map((source) => [source.host, source]));
const privateIpv4Blocks = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^192\.168\./, /^0\./];

function invalid(code: 'InvalidUrl' | 'UrlNotAllowed', message: string, context?: Record<string, string>): InvalidOfficialDocsUrl {
  return { ok: false, error: new MercadoPagoDocsError(code, message, context) };
}

function hasEncodedTraversal(rawPath: string): boolean {
  try {
    return decodeURIComponent(rawPath).split('/').includes('..') || /%2e/i.test(rawPath);
  } catch {
    return true;
  }
}

function isLocalOrIpHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (isIP(host) !== 0) return true;
  if (privateIpv4Blocks.some((pattern) => pattern.test(host))) return true;
  return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80');
}

export function normalizeOfficialDocsUrl(input: string): string {
  const parsed = new URL(input);
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.port === '443') parsed.port = '';
  return parsed.toString();
}

export function validateOfficialDocsUrl(input: string): OfficialDocsUrlValidation {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return invalid('InvalidUrl', 'URL is malformed');
  }

  const host = parsed.hostname.toLowerCase();

  if (parsed.protocol !== 'https:') return invalid('InvalidUrl', 'URL must use HTTPS', { host });
  if (parsed.username || parsed.password) return invalid('InvalidUrl', 'URL userinfo is not allowed', { host });
  if (parsed.port && parsed.port !== '443') return invalid('InvalidUrl', 'URL port is not allowed', { host });
  if (isLocalOrIpHost(host)) return invalid('UrlNotAllowed', 'Localhost and IP hosts are not allowed', { host });
  if (hasEncodedTraversal(parsed.pathname)) return invalid('UrlNotAllowed', 'URL path traversal is not allowed', { host });

  const source = officialHosts.get(host);
  if (!source) return invalid('UrlNotAllowed', 'URL host is outside official Mercado Pago docs', { host });

  const segments = parsed.pathname.split('/').filter(Boolean);
  const [root, locale, family] = segments;

  if (root !== 'developers') return invalid('UrlNotAllowed', 'URL path is outside developer docs', { host, path: parsed.pathname });
  if (!source.locales.includes(locale as SupportedLocale)) {
    return invalid('UrlNotAllowed', 'URL locale is not allowlisted', { host, path: parsed.pathname, locale });
  }
  if (!source.pathFamilies.includes(family as PathFamily)) {
    return invalid('UrlNotAllowed', 'URL path family is not allowlisted', { host, path: parsed.pathname });
  }

  const normalized = normalizeOfficialDocsUrl(parsed.toString());
  return { ok: true, normalizedUrl: normalized, host, locale: locale as SupportedLocale, sourceKind: family as PathFamily };
}

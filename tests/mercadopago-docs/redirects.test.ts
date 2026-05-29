import { describe, expect, it } from 'vitest';
import { resolveRedirectLocation, validateRedirectChain, validateRedirectHop } from '../../src/mercadopago-docs/redirects';

describe('redirect safety helpers', () => {
  it('resolves relative redirect locations against the current official URL', () => {
    expect(
      resolveRedirectLocation(
        'https://www.mercadopago.com/developers/en/docs/checkout-pro',
        '../reference/online-payments',
      ),
    ).toBe('https://www.mercadopago.com/developers/en/reference/online-payments');
  });

  it('accepts redirect hops that remain allowlisted', () => {
    expect(
      validateRedirectHop(
        'https://mercadopago.com/developers/pt/docs',
        'https://www.mercadopago.com/developers/pt/docs/checkout-pro/landing',
      ),
    ).toMatchObject({ ok: true, nextUrl: 'https://www.mercadopago.com/developers/pt/docs/checkout-pro/landing' });
  });

  it.each([
    'https://example.com/developers/es/docs',
    'http://www.mercadopago.com/developers/es/docs',
    'https://www.mercadopago.com/developers/es/sdk',
    'https://www.mercadopago.com/developers/fr/docs',
  ])('rejects redirect hop leaving allowlist: %s', (location) => {
    expect(validateRedirectHop('https://www.mercadopago.com/developers/es/docs', location)).toMatchObject({ ok: false });
  });

  it('validates complete redirect chains and enforces max hops', () => {
    expect(
      validateRedirectChain([
        'https://mercadopago.com/developers/en/docs',
        'https://www.mercadopago.com/developers/en/docs/',
        'https://www.mercadopago.com/developers/en/reference/',
      ]),
    ).toMatchObject({ ok: true, finalUrl: 'https://www.mercadopago.com/developers/en/reference/' });

    expect(
      validateRedirectChain([
        'https://mercadopago.com/developers/en/docs',
        'https://www.mercadopago.com/developers/en/docs/1',
        'https://www.mercadopago.com/developers/en/docs/2',
        'https://www.mercadopago.com/developers/en/docs/3',
      ], { maxHops: 2 }),
    ).toMatchObject({ ok: false });
  });
});

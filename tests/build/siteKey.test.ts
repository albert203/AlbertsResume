import { describe, it, expect } from 'vitest';
import { resolveSiteKey } from '../../src/build/siteKey';
import { TURNSTILE_TEST_SITE_KEY } from '../../src/contact/turnstile';

describe('resolveSiteKey', () => {
  it('uses the configured key when set', () => {
    expect(resolveSiteKey('real-key', true)).toBe('real-key');
    expect(resolveSiteKey('real-key', false)).toBe('real-key');
  });

  it('falls back to the test key for local builds', () => {
    expect(resolveSiteKey(undefined, false)).toBe(TURNSTILE_TEST_SITE_KEY);
  });

  it('refuses a production build without a real key', () => {
    expect(() => resolveSiteKey(undefined, true)).toThrow('TURNSTILE_SITE_KEY');
    expect(() => resolveSiteKey('', true)).toThrow('TURNSTILE_SITE_KEY');
  });
});

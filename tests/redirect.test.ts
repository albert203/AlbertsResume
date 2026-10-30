import { describe, it, expect } from 'vitest';
import { redirectTarget } from '../src/redirect';

describe('redirectTarget', () => {
  it('does nothing when no redirect is configured', () => {
    expect(redirectTarget(undefined, '/contact')).toBeNull();
    expect(redirectTarget('', '/contact')).toBeNull();
  });

  it('keeps the path and query on the new site', () => {
    expect(redirectTarget('https://portfolio.albertjordaan.workers.dev', '/resume?ref=cv')).toBe('https://portfolio.albertjordaan.workers.dev/resume?ref=cv');
  });

  it('copes with a trailing slash on the configured address', () => {
    expect(redirectTarget('https://portfolio.albertjordaan.workers.dev/', '/')).toBe('https://portfolio.albertjordaan.workers.dev/');
  });
});

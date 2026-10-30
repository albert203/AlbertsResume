import { TURNSTILE_TEST_SITE_KEY } from '../contact/turnstile';

// A production build with the test key would deploy a contact form the real secret always rejects.
export function resolveSiteKey(envKey: string | undefined, production: boolean): string {
  if (envKey) return envKey;
  if (production) {
    throw new Error('TURNSTILE_SITE_KEY must be set for a production build (npm run deploy).');
  }
  return TURNSTILE_TEST_SITE_KEY;
}

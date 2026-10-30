import path from 'path';
import { renderSite } from './renderSite';
import { resolveSiteKey } from './siteKey';

const root = path.resolve(__dirname, '../..');
const production = process.argv.includes('--production');

let siteKey: string;
try {
  siteKey = resolveSiteKey(process.env.TURNSTILE_SITE_KEY, production);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
if (!process.env.TURNSTILE_SITE_KEY) {
  console.warn('TURNSTILE_SITE_KEY not set: using the always-pass test key. Do not deploy this build.');
}

renderSite({
  viewsDir: path.join(root, 'public/views'),
  publicDir: path.join(root, 'public'),
  outDir: path.join(root, 'dist/site'),
  locals: { turnstileSiteKey: siteKey },
})
  .then((pages) => console.log(`Built ${pages.length} pages into dist/site`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

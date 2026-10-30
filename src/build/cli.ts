import path from 'path';
import { renderSite } from './renderSite';
import { TURNSTILE_TEST_SITE_KEY } from '../contact/turnstile';

const root = path.resolve(__dirname, '../..');
const siteKey = process.env.TURNSTILE_SITE_KEY;
if (!siteKey) {
  console.warn('TURNSTILE_SITE_KEY not set: using the always-pass test key. Do not deploy this build.');
}

renderSite({
  viewsDir: path.join(root, 'public/views'),
  publicDir: path.join(root, 'public'),
  outDir: path.join(root, 'dist/site'),
  locals: { turnstileSiteKey: siteKey || TURNSTILE_TEST_SITE_KEY },
})
  .then((pages) => console.log(`Built ${pages.length} pages into dist/site`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

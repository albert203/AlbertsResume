import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { renderSite, PAGES } from '../../src/build/renderSite';

const root = path.resolve(__dirname, '../..');
let outDir: string;
let written: string[];

beforeAll(async () => {
  outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'site-'));
  written = await renderSite({
    viewsDir: path.join(root, 'public/views'),
    publicDir: path.join(root, 'public'),
    outDir,
    locals: { turnstileSiteKey: 'site-key-xyz' },
  });
});

afterAll(async () => {
  await fs.rm(outDir, { recursive: true, force: true });
});

const read = (rel: string) => fs.readFile(path.join(outDir, rel), 'utf8');

describe('renderSite', () => {
  it('writes every page', () => {
    expect(written).toEqual(PAGES.map((p) => p.out));
  });

  it('leaves no EJS tags in the output', async () => {
    for (const page of PAGES) {
      expect(await read(page.out)).not.toContain('<%');
    }
  });

  it('inlines the header partial with a direct CV download link', async () => {
    const html = await read('index.html');
    expect(html).toContain('href="/assets/files/Albert_Jordaan_CV.pdf" download');
    expect(html).not.toContain('/resume/download');
  });

  it('uses absolute asset paths so nested pages resolve them', async () => {
    for (const page of PAGES) {
      const html = await read(page.out);
      expect(html).toContain('href="/css/styles.css"');
      expect(html).not.toContain('../');
    }
  });

  it('renders the Turnstile widget with the given site key on the contact page', async () => {
    const html = await read('contact/index.html');
    expect(html).toContain('data-sitekey="site-key-xyz"');
    expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain('id="form_error"');
  });

  it('copies static assets', async () => {
    await expect(fs.stat(path.join(outDir, 'css/styles.css'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(outDir, 'js/script.js'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(outDir, 'assets/files/Albert_Jordaan_CV.pdf'))).resolves.toBeTruthy();
  });
});

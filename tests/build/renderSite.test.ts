import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { renderSite, PAGES } from '../../src/build/renderSite';

const root = path.resolve(__dirname, '../..');
let outDir: string;
let written: string[];

const build = (dir: string, locals: Record<string, unknown>) =>
  renderSite({
    viewsDir: path.join(root, 'public/views'),
    publicDir: path.join(root, 'public'),
    outDir: dir,
    locals,
  });

beforeAll(async () => {
  outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'site-'));
  written = await build(outDir, { turnstileSiteKey: 'site-key-xyz' });
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

  it('links the CV as a direct download', async () => {
    const html = await read('index.html');
    expect(html).toContain('href="/assets/files/Albert_Jordaan_CV.pdf" download');
    expect(html).not.toContain('/resume/download');
  });

  it('uses absolute paths so nested pages resolve them', async () => {
    for (const page of PAGES) {
      expect(await read(page.out)).not.toContain('../');
    }
    const home = await read('index.html');
    expect(home).toContain('href="/css/styles.css"');
    expect(home).toContain('src="/js/script.js"');
  });

  it('puts the contact form, with the Turnstile widget and error box, on the home page', async () => {
    const html = await read('index.html');
    expect(html).toContain('id="contact_form"');
    expect(html).toContain('data-sitekey="site-key-xyz"');
    expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain('id="form_error"');
  });

  it('sends the old /contact and /resume pages to their sections on the home page', async () => {
    expect(await read('contact/index.html')).toContain('url=/#contact');
    expect(await read('resume/index.html')).toContain('url=/#experience');
  });

  it('copies static assets, including the project videos', async () => {
    for (const rel of [
      'css/styles.css',
      'js/script.js',
      'assets/files/Albert_Jordaan_CV.pdf',
      'assets/videos/signal-ride.mp4',
      'assets/videos/nfe-ride.mp4',
      'assets/videos/Dashboard_video_optimised.mp4',
    ]) {
      await expect(fs.stat(path.join(outDir, rel))).resolves.toBeTruthy();
    }
  });

  it('shows the NFE recording', async () => {
    expect(await read('index.html')).toContain('/assets/videos/nfe-ride.mp4');
  });
});

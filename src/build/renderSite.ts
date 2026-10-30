import ejs from 'ejs';
import { promises as fs } from 'fs';
import path from 'path';

export interface SitePage {
  view: string;
  out: string;
}

export const PAGES: SitePage[] = [
  { view: 'index', out: 'index.html' },
  { view: 'contact', out: 'contact/index.html' },
  { view: 'resume', out: 'resume/index.html' },
];

export const STATIC_DIRS = ['css', 'js', 'assets'];

export interface RenderOptions {
  viewsDir: string;
  publicDir: string;
  outDir: string;
  locals: Record<string, unknown>;
}

export async function renderSite(opts: RenderOptions): Promise<string[]> {
  await fs.rm(opts.outDir, { recursive: true, force: true });

  const written: string[] = [];
  for (const page of PAGES) {
    const html = await ejs.renderFile(path.join(opts.viewsDir, `${page.view}.ejs`), opts.locals);
    const target = path.join(opts.outDir, page.out);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, html, 'utf8');
    written.push(page.out);
  }

  for (const dir of STATIC_DIRS) {
    await fs.cp(path.join(opts.publicDir, dir), path.join(opts.outDir, dir), { recursive: true });
  }
  return written;
}

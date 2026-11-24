// Builds the website for publishing: copies it into dist/ with the HTML, CSS and JavaScript minified,
// local names scrambled, comments removed and a copyright notice at the top of each code file.
// The files in this folder stay readable for editing. Publish dist/, never this folder.
//
// Run: npm run build

import { transform } from 'esbuild';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');

// Everything the live site needs. Anything not listed here (README, LICENSE, build files) is never published.
const PUBLISH = [
  'index.html', 'privacy.html', 'terms.html',
  'favicon.ico', 'favicon-32.png', 'site.webmanifest',
  'robots.txt', 'llms.txt', 'sitemap.xml',
  'assets'
];

const YEAR = new Date().getFullYear();
const NOTICE = `© ${YEAR} Zitica Trading Inc., doing business as Thumos HQ. All rights reserved. ` +
  'This code and design are proprietary. Copying, reproducing or reusing them, in whole or in part, ' +
  'without written permission is prohibited.';

async function minifyJS(code) {
  const out = await transform(code, { loader: 'js', minify: true, legalComments: 'none', target: 'es2020' });
  return out.code.trim();
}

async function minifyCSS(code) {
  const out = await transform(code, { loader: 'css', minify: true, legalComments: 'none' });
  return out.code.trim();
}

// Clean addresses: each page is published as a folder with an index.html inside, so /privacy works on any host.
const PAGES = { 'index.html': '/', 'privacy.html': '/privacy', 'terms.html': '/terms' };
const outPath = (rel) => (rel in PAGES && rel !== 'index.html') ? path.join(rel.replace(/\.html$/, ''), 'index.html') : rel;

// Page links become clean addresses, and every other local path starts from the site root so it still
// works one folder down. Full web addresses, mailto: links and #anchors are left alone.
function cleanLinks(html) {
  return html.replace(/\b(href|src|data-src)="([^"]*)"/g, (whole, attr, url) => {
    if (/^([a-z]+:|#|\/)/i.test(url)) return whole;
    const [file, hash = ''] = url.split(/(?=#)/);
    if (file in PAGES) return `${attr}="${PAGES[file]}${hash}"`;
    return `${attr}="/${url}"`;
  });
}

async function minifyHTML(html) {
  // Take scripts and styles out first so their contents are handled by esbuild, not by the HTML rules below.
  const blocks = [];
  let body = html.replace(/<(script|style)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (whole, tag, attrs, inner) => {
    blocks.push({ tag: tag.toLowerCase(), attrs, inner });
    return `\u0000${blocks.length - 1}\u0000`;
  });

  body = body
    .replace(/<!--[\s\S]*?-->/g, '')   // comments
    .replace(/\s*\n\s*/g, ' ')         // line breaks and indentation; renders the same as before
    .replace(/ {2,}/g, ' ')
    .trim();

  const done = [];
  for (const { tag, attrs, inner } of blocks) {
    let code = inner;
    if (tag === 'style') code = await minifyCSS(inner);
    else if (/application\/ld\+json/i.test(attrs)) code = JSON.stringify(JSON.parse(inner));
    else if (inner.trim() && !/\bsrc=/i.test(attrs)) code = await minifyJS(inner);
    done.push(`<${tag}${attrs}>${code}</${tag}>`);
  }
  body = body.replace(/\u0000(\d+)\u0000/g, (_, i) => done[Number(i)]);

  // Put the notice straight after the doctype, where anyone viewing the source sees it first.
  return body.replace(/^(<!doctype html>)/i, `$1<!-- ${NOTICE} -->`);
}

async function build(rel) {
  const from = path.join(ROOT, rel);
  const to = path.join(OUT, outPath(rel));
  const stat = await fs.stat(from);
  if (stat.isDirectory()) {
    for (const name of await fs.readdir(from)) {
      if (!name.startsWith('.')) await build(path.join(rel, name));
    }
    return;
  }
  await fs.mkdir(path.dirname(to), { recursive: true });
  const ext = path.extname(rel).toLowerCase();
  if (ext === '.html') {
    let html = await fs.readFile(from, 'utf8');
    if (rel in PAGES) html = cleanLinks(html);
    await fs.writeFile(to, await minifyHTML(html));
  } else if (ext === '.js') {
    await fs.writeFile(to, `/* ${NOTICE} */\n` + await minifyJS(await fs.readFile(from, 'utf8')));
  } else if (ext === '.css') {
    await fs.writeFile(to, `/* ${NOTICE} */\n` + await minifyCSS(await fs.readFile(from, 'utf8')));
  } else {
    await fs.copyFile(from, to);
  }
}

await fs.rm(OUT, { recursive: true, force: true });
for (const rel of PUBLISH) await build(rel);

let before = 0, after = 0;
for (const rel of PUBLISH) {
  const walk = async (p) => {
    const s = await fs.stat(path.join(ROOT, p));
    if (s.isDirectory()) { for (const n of await fs.readdir(path.join(ROOT, p))) if (!n.startsWith('.')) await walk(path.join(p, n)); return; }
    if (/\.(html|css|js)$/i.test(p)) { before += s.size; after += (await fs.stat(path.join(OUT, outPath(p)))).size; }
  };
  await walk(rel);
}
console.log(`Built dist/. HTML, CSS and JavaScript: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB.`);

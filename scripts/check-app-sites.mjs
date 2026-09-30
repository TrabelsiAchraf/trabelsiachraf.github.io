#!/usr/bin/env node
// Checks the app sites. `--phase before` (sites still on github.io): every
// page answers 200 on github.io. `--phase after` (my-website renamed to the
// user site): every page answers 200 on trabelsiachraf.com, every github.io
// address redirects to its trabelsiachraf.com twin, and no page links to
// github.io. Links found in pages and in `--readme` files must resolve.
import { readFile } from 'node:fs/promises';
import { DOMAIN, GITHUB_IO, pageUrls, toDomain, extractLinks } from './lib/app-sites.mjs';

const args = process.argv.slice(2);
const phase = args[args.indexOf('--phase') + 1];
const readmes = args.includes('--readme') ? args.slice(args.indexOf('--readme') + 1) : [];
if (!['before', 'after'].includes(phase)) {
  console.error('usage: check-app-sites.mjs --phase before|after [--readme file…]');
  process.exit(2);
}

const failures = [];
const seen = new Map();

async function status(url, redirect = 'follow') {
  const key = `${redirect} ${url}`;
  if (!seen.has(key)) {
    seen.set(key, fetch(url, { redirect, headers: { 'user-agent': 'check-app-sites' } })
      .then((r) => ({ code: r.status, location: r.headers.get('location'), body: redirect === 'follow' ? r.text() : null }))
      .catch((e) => ({ code: 0, error: e.message })));
  }
  return seen.get(key);
}

async function checkLinks(from, html, base) {
  for (const link of extractLinks(html, base)) {
    if (phase === 'after' && link.startsWith(GITHUB_IO)) failures.push(`${from}: links to github.io → ${link}`);
    const r = await status(link);
    if (r.code < 200 || r.code >= 400) failures.push(`${from}: broken link ${link} (${r.code || r.error})`);
  }
}

const host = phase === 'before' ? GITHUB_IO : DOMAIN;
for (const url of pageUrls(host)) {
  const r = await status(url);
  if (r.code !== 200) { failures.push(`${url}: ${r.code || r.error}`); continue; }
  await checkLinks(url, await r.body, url);
}

if (phase === 'after') {
  for (const url of pageUrls(GITHUB_IO)) {
    const r = await status(url, 'manual');
    const target = r.location && new URL(r.location, url).href;
    if (![301, 302].includes(r.code) || target !== toDomain(url)) {
      failures.push(`${url}: expected redirect to ${toDomain(url)}, got ${r.code} ${target ?? ''}`);
    }
  }
  const home = await status(`${DOMAIN}/`);
  if (home.code !== 200) failures.push(`${DOMAIN}/: ${home.code}`);
}

for (const file of readmes) {
  const text = await readFile(file, 'utf8');
  const markdownLinks = [...text.matchAll(/\((https?:\/\/[^)\s]+)\)|<(https?:\/\/[^>\s]+)>/g)].map((m) => m[1] || m[2]);
  await checkLinks(file, markdownLinks.map((u) => `<a href="${u}">`).join(''), DOMAIN + '/');
}

for (const f of failures) console.log('FAIL', f);
console.log(failures.length ? `${failures.length} failure(s)` : 'all app-site checks passed');
process.exit(failures.length ? 1 : 0);

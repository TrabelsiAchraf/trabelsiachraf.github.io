#!/usr/bin/env node
// Checks the app sites. `--phase before` (sites still on github.io): every
// page answers 200 on github.io. `--phase after` (my-website renamed to the
// user site): every page answers 200 on trabelsiachraf.com, every github.io
// address redirects to its trabelsiachraf.com twin, and no page links to
// github.io. Links found in pages and in `--readme` files must resolve.
import { readFile } from 'node:fs/promises';
import { DOMAIN, GITHUB_IO, pageUrls, toDomain, extractLinks, parseArgs } from './lib/app-sites.mjs';

const args = parseArgs(process.argv.slice(2));
const phase = args.phase;
const readmes = args.readmes;
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
    if (link.startsWith('invalid:')) {
      failures.push(`${from}: invalid link ${link.slice(8)}`);
      continue;
    }
    if (phase === 'after' && link.startsWith(GITHUB_IO)) failures.push(`${from}: links to github.io → ${link}`);
    const r = await status(link);
    if (r.code < 200 || r.code >= 400) failures.push(`${from}: broken link ${link} (${r.code || r.error})`);
  }
}

const host = phase === 'before' ? GITHUB_IO : DOMAIN;
for (const url of pageUrls(host)) {
  const redirect = phase === 'after' ? 'manual' : 'follow';
  const r = await status(url, redirect);
  if (r.code !== 200) {
    if (phase === 'after' && [301, 302, 307, 308].includes(r.code)) {
      failures.push(`${url}: redirects to ${r.location}`);
    } else {
      failures.push(`${url}: ${r.code || r.error}`);
    }
    continue;
  }
  const body = await status(url, 'follow');
  await checkLinks(url, await body.body, url);
}

if (phase === 'after') {
  for (const url of pageUrls(GITHUB_IO)) {
    const r = await status(url, 'manual');
    const target = r.location && new URL(r.location, url).href;
    if (![301, 302, 307, 308].includes(r.code) || target !== toDomain(url)) {
      failures.push(`${url}: expected redirect to ${toDomain(url)}, got ${r.code} ${target ?? ''}`);
    }
  }
  const home = await status(`${DOMAIN}/`, 'manual');
  if (home.code !== 200) {
    if ([301, 302, 307, 308].includes(home.code)) {
      failures.push(`${DOMAIN}/: redirects to ${home.location}`);
    } else {
      failures.push(`${DOMAIN}/: ${home.code}`);
    }
  }
}

for (const file of readmes) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (e) {
    failures.push(`${file}: cannot read (${e.message})`);
    continue;
  }
  const markdownLinks = [...text.matchAll(/https?:\/\/[^\s)<>\]]+/g)].map((m) => m[0].replace(/[.,]$/, ''));
  await checkLinks(file, markdownLinks.map((u) => `<a href="${u}">`).join(''), DOMAIN + '/');
}

for (const f of failures) console.log('FAIL', f);
console.log(failures.length ? `${failures.length} failure(s)` : 'all app-site checks passed');
process.exit(failures.length ? 1 : 0);

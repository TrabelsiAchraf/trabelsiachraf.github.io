import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN, GITHUB_IO, SITES, pageUrls, toDomain, extractLinks, parseArgs } from './lib/app-sites.mjs';

test('every site lists home, support, privacy and accessibility', () => {
  for (const site of SITES) {
    for (const page of ['', 'support.html', 'privacy.html', 'accessibility.html']) {
      assert.ok(site.paths.includes(page), `${site.repo} misses ${page || 'home'}`);
    }
  }
});

test('Salt Scan has the four pages in en, fr and ar', () => {
  const salt = SITES.find((s) => s.repo === 'saltscan-site');
  for (const lang of ['', 'fr/', 'ar/']) {
    for (const page of ['', 'support.html', 'privacy.html', 'accessibility.html']) {
      assert.ok(salt.paths.includes(lang + page), `missing ${lang}${page}`);
    }
  }
});

test('pageUrls builds absolute URLs for a host', () => {
  const urls = pageUrls(DOMAIN);
  assert.ok(urls.includes('https://trabelsiachraf.com/munajat-site/privacy.html'));
  assert.ok(urls.includes('https://trabelsiachraf.com/saltscan-site/ar/support.html'));
  assert.ok(urls.includes('https://trabelsiachraf.com/clipdori-site/fr/'));
});

test('toDomain maps github.io addresses to trabelsiachraf.com', () => {
  assert.equal(toDomain(`${GITHUB_IO}/mirrorkit-site/support.html`), `${DOMAIN}/mirrorkit-site/support.html`);
  assert.equal(toDomain(`${DOMAIN}/x`), `${DOMAIN}/x`);
});

test('extractLinks resolves relative links and skips mailto and anchors', () => {
  const html = `<a href="privacy.html">p</a><a href="../support.html">s</a><a href="mailto:a@b.c">m</a><a href="#top">t</a><a href="https://apps.apple.com/app/id1">a</a><a href='https://example.com'>sq</a><a HREF="https://caps.com">cap</a><a href="https://example.com/path?q=foo&amp;bar=baz">amp</a><a href="tel:+1234567890">tel</a><a href="javascript:void(0)">js</a><a href="http://">inv</a>`;
  assert.deepEqual(extractLinks(html, `${DOMAIN}/saltscan-site/fr/`), [
    `${DOMAIN}/saltscan-site/fr/privacy.html`,
    `${DOMAIN}/saltscan-site/support.html`,
    'https://apps.apple.com/app/id1',
    'https://example.com/',
    'https://caps.com/',
    'https://example.com/path?q=foo&bar=baz',
    'invalid:http://',
  ]);
});

test('parseArgs extracts phase and readme arguments', () => {
  assert.deepEqual(parseArgs(['--readme', 'a.md', '--phase', 'after']), { phase: 'after', readmes: ['a.md'] });
  assert.deepEqual(parseArgs(['--phase', 'before', '--readme', 'a', 'b']), { phase: 'before', readmes: ['a', 'b'] });
  assert.deepEqual(parseArgs([]), { readmes: [] });
});

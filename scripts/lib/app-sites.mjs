// Inventory of the app sites published under trabelsiachraf.com, and the
// helpers the checker uses. GitHub serves each project site at
// DOMAIN/<repo>/ because this repository is the account's user site.
export const DOMAIN = 'https://trabelsiachraf.com';
export const GITHUB_IO = 'https://trabelsiachraf.github.io';

const PAGES = ['', 'support.html', 'privacy.html', 'accessibility.html'];

export const SITES = [
  { repo: 'munajat-site', paths: PAGES },
  { repo: 'mirrorkit-site', paths: PAGES },
  { repo: 'clipdori-site', paths: [...PAGES, 'fr/'] },
  { repo: 'saltscan-site', paths: ['', 'fr/', 'ar/'].flatMap((lang) => PAGES.map((p) => lang + p)) },
];

export function pageUrls(host) {
  return SITES.flatMap((site) => site.paths.map((path) => `${host}/${site.repo}/${path}`));
}

export function toDomain(url) {
  return url.startsWith(GITHUB_IO) ? DOMAIN + url.slice(GITHUB_IO.length) : url;
}

export function extractLinks(html, baseUrl) {
  const links = [];
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href.startsWith('mailto:') || href.startsWith('#')) continue;
    links.push(new URL(href, baseUrl).href.split('#')[0]);
  }
  return [...new Set(links)];
}

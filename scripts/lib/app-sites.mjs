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

export function parseArgs(argv) {
  const result = { readmes: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--phase' && i + 1 < argv.length) {
      result.phase = argv[i + 1];
      i++;
    } else if (argv[i] === '--readme') {
      i++;
      while (i < argv.length && !argv[i].startsWith('--')) {
        result.readmes.push(argv[i]);
        i++;
      }
      i--;
    }
  }
  return result;
}

export function extractLinks(html, baseUrl) {
  const links = [];
  const invalid = [];
  for (const [, href] of html.matchAll(/(?<![\w-])(?:href|src)=["']([^"']+)["']/gi)) {
    const decoded = href.replace(/&amp;/g, '&');
    if (decoded.startsWith('mailto:') || decoded.startsWith('tel:') || decoded.startsWith('javascript:') || decoded.startsWith('#')) continue;
    try {
      const resolved = new URL(decoded, baseUrl).href.split('#')[0];
      links.push(resolved);
    } catch {
      links.push(`invalid:${decoded}`);
    }
  }
  return [...new Set(links)];
}

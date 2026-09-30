# App Sites Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every published app (Munajat, MirrorKit, Clipdori, Salt Scan) has Home, Support, Privacy and Accessibility pages served under `https://trabelsiachraf.com/<site>/`, with every link, README and editable App Store Connect field pointing to `trabelsiachraf.com`, while the old `trabelsiachraf.github.io` addresses keep working.

**Architecture:** Static HTML sites, one GitHub repo per app site, published by GitHub Pages. Renaming `my-website` to `trabelsiachraf.github.io` makes it the account's user site; its `CNAME` (`trabelsiachraf.com`) then applies to every project site, which GitHub serves at `trabelsiachraf.com/<repo>/` and redirects from `trabelsiachraf.github.io/<repo>/`. A Node checker in `my-website/scripts/` verifies every URL and link.

**Tech Stack:** Plain HTML/CSS (no framework, no tracker), GitHub Pages, `gh` CLI, `asc` CLI (App Store Connect), Node 20+ (`node --test`), `sips` for image resizing, the iOS simulator for RTL rendering checks.

**Spec:** `/Users/a.trabelsi/Workspace/Perso/my-website/docs/superpowers/specs/2026-09-30-app-sites-alignment-design.md`

## Global Constraints

- Final addresses: `https://trabelsiachraf.com/munajat-site/`, `/mirrorkit-site/`, `/clipdori-site/`, `/saltscan-site/`; personal site stays `https://trabelsiachraf.com/`.
- Every link written by this plan uses absolute `https://trabelsiachraf.com/…` URLs (never `trabelsiachraf.github.io`), except relative links between pages of the same site language folder, which are allowed only in navigation that also exists as absolute links in the footer.
- Contact address everywhere: `trabelsiachraf.devapps@gmail.com`.
- App Store links: Munajat `https://apps.apple.com/app/id6768824373`, MirrorKit `https://apps.apple.com/app/id6761739430` (Mac App Store), Clipdori `https://apps.apple.com/app/id6816525366` (not on sale yet → "Coming soon to the App Store" / "Bientôt sur l'App Store", no link), Salt Scan `https://apps.apple.com/app/id6740041173`.
- Plain static HTML: no framework, no analytics, no tracking script, no external resource except fonts a site already uses.
- No claim about an app that is not verified in its code or its published texts; unverifiable items are omitted.
- Multilingual sites: one folder per language, English at the root; Salt Scan `fr/` and `ar/` (`<html lang="ar" dir="rtl">`), Clipdori home `fr/`. Each page links to its other languages and declares `<link rel="alternate" hreflang="…">` for each language plus `x-default` → English.
- Clipdori's existing `support.html`, `privacy.html`, `accessibility.html` keep their address and bilingual content (footer change only). Clipdori is in App Review: no App Store Connect change for it.
- Nothing is deleted (repos, pages, App Store Connect fields). Nothing is submitted to Apple.
- Local clones live in `/Users/a.trabelsi/Workspace/Perso/<repo>`. The Salt Scan app repo is `/Users/a.trabelsi/Workspace/Perso/SaltScan/SaltScan` (branch `master`); Munajat is `Adhkar/`, MirrorKit is `MirrorApp/`, Clipdori is `SmartClipboard/` (repo `clipdori`).
- Commits: conventional subject (`feat:`, `fix:`, `docs:`, `chore:`), blank line, `Co-Authored-By: Claude <model> <noreply@anthropic.com>` on its own line.
- Pushing to each repo's default branch is authorised by the user for this work.

## Review Focus

1. **Old App Store URLs after the rename** (`trabelsiachraf.github.io/<site>/privacy.html` etc., which Apple and users already have): must redirect to the `.com` equivalent, not 404. Pinned by `check-app-sites.mjs --phase after` in Task 7.
2. **Arabic pages** rendered right-to-left with no clipped or mirrored-wrong content (lists, footer, language switcher, images). Checked with simulator screenshots in Task 3.
3. **A relative link that breaks when the site moves** from `/munajat-site/` on github.io to the same path on `.com`, or inside `fr/`/`ar/` folders (e.g. `../privacy.html` vs `privacy.html`). Pinned by the checker crawling every page's links in Tasks 2, 3, 7.
4. **Claims in Privacy/Accessibility that the app doesn't back** (e.g. "no data leaves the device" while barcodes go to Open Food Facts). Each such page's task lists the code checks to run and the reviewer checks them.
5. **The personal site after the rename** (`trabelsiachraf.com/`, `stats.html`, the daily stats workflow): must behave exactly as before. Pinned in Task 7 (HTTP checks + `gh run` of the workflow).

---

### Task 1: Link checker and local clones

**Files:**
- Create: `my-website/scripts/lib/app-sites.mjs`
- Create: `my-website/scripts/app-sites.test.mjs`
- Create: `my-website/scripts/check-app-sites.mjs`
- Clone: `munajat-site`, `mirrorkit-site`, `clipdori-site` into `/Users/a.trabelsi/Workspace/Perso/`

**Interfaces:**
- Produces: `node scripts/check-app-sites.mjs --phase before|after [--readme <file>…]` (exit 0 = all good; prints one line per failure). Library exports `DOMAIN`, `GITHUB_IO`, `SITES`, `pageUrls(host)`, `toDomain(url)`, `extractLinks(html, baseUrl)`.

- [ ] **Step 1: Clone the site repos**

```bash
cd /Users/a.trabelsi/Workspace/Perso
for r in munajat-site mirrorkit-site clipdori-site; do [ -d "$r" ] || git clone git@github.com:TrabelsiAchraf/$r.git; done
git -C munajat-site log --oneline -1; git -C mirrorkit-site log --oneline -1; git -C clipdori-site log --oneline -1
```

- [ ] **Step 2: Write the failing tests** — `my-website/scripts/app-sites.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMAIN, GITHUB_IO, SITES, pageUrls, toDomain, extractLinks } from './lib/app-sites.mjs';

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
  const html = '<a href="privacy.html">p</a><a href="../support.html">s</a><a href="mailto:a@b.c">m</a><a href="#top">t</a><a href="https://apps.apple.com/app/id1">a</a>';
  assert.deepEqual(extractLinks(html, `${DOMAIN}/saltscan-site/fr/`), [
    `${DOMAIN}/saltscan-site/fr/privacy.html`,
    `${DOMAIN}/saltscan-site/support.html`,
    'https://apps.apple.com/app/id1',
  ]);
});
```

- [ ] **Step 3: Run to see them fail**

Run: `cd /Users/a.trabelsi/Workspace/Perso/my-website && node --test scripts/app-sites.test.mjs`
Expected: FAIL, "Cannot find module … app-sites.mjs".

- [ ] **Step 4: Implement** — `my-website/scripts/lib/app-sites.mjs`

```js
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
```

- [ ] **Step 5: Run the tests**

Run: `node --test scripts/app-sites.test.mjs`
Expected: PASS (5 tests). Also run `node --test` (whole repo) to confirm the existing stats tests still pass.

- [ ] **Step 6: Write the CLI** — `my-website/scripts/check-app-sites.mjs`

```js
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
```

- [ ] **Step 7: Baseline run** (expected to fail only on the pages that don't exist yet)

Run: `node scripts/check-app-sites.mjs --phase before`
Expected: failures limited to `saltscan-site/*`, `mirrorkit-site/accessibility.html`, `clipdori-site/fr/`. Paste the output in the report.

- [ ] **Step 8: Commit** (my-website, local only; pushed in Task 7)

```bash
cd /Users/a.trabelsi/Workspace/Perso/my-website
git add scripts/lib/app-sites.mjs scripts/app-sites.test.mjs scripts/check-app-sites.mjs
git commit -F- <<'EOF'
feat: checker for the app sites served under trabelsiachraf.com

Co-Authored-By: Claude <model> <noreply@anthropic.com>
EOF
```

---

### Task 2: Salt Scan site in English

**Files:**
- Create repo `/Users/a.trabelsi/Workspace/Perso/saltscan-site/` with `index.html`, `support.html`, `privacy.html`, `accessibility.html`, `hero.png`, `shot-1.png` … `shot-4.png`, `icon.png`, `README.md`
- Template: `/Users/a.trabelsi/Workspace/Perso/munajat-site/*.html` (copy structure and CSS, change content and accent colour)

**Interfaces:**
- Consumes: `check-app-sites.mjs` (Task 1).
- Produces: the English pages at `https://trabelsiachraf.github.io/saltscan-site/…`; the page skeleton, CSS and footer that Task 3 translates.

- [ ] **Step 1: Create the repo and images**

```bash
cd /Users/a.trabelsi/Workspace/Perso && mkdir saltscan-site && cd saltscan-site && git init -b main
SRC=/Users/a.trabelsi/Workspace/Perso/SaltScan/SaltScan/marketing/screenshots
sips --resampleWidth 660 "$SRC/en-US/6.9/slide_1.png" --out hero.png
for i in 2 3 4 5; do sips --resampleWidth 480 "$SRC/en-US/6.9/slide_$i.png" --out "shot-$((i-1)).png"; done
sips --resampleWidth 256 /Users/a.trabelsi/Workspace/Perso/SaltScan/SaltScan/SaltScan/Configuration/Assets.xcassets/AppIcon.appiconset/AppIcon_any.png --out icon.png
```

- [ ] **Step 2: `index.html`** — copy `munajat-site/index.html`, keep its layout/CSS (sections hero, `#features`, `#screenshots`, `#price`, footer), change:
  - `<title>Salt Scan — Check the salt in your food</title>`, meta description, `<html lang="en">`, accent colour to Salt Scan green `#2EB885` (from `Theme.swift` `ssPrimary` = rgb(0.18, 0.72, 0.52)).
  - Hero: headline and sub-headline from `marketing/metadata/en-US/description.txt` (first paragraph), `hero.png`, App Store button → `https://apps.apple.com/app/id6740041173`.
  - Features (one card each, text drawn from `description.txt` bullets): barcode scan with low / medium / high rating (UK traffic-light thresholds 0.3 g / 1.5 g salt per 100 g); sodium in mg or salt in g depending on your country; daily journal you can edit day by day; servings or exact grams; compare products side by side; optional Apple Health export (off by default); search by name when there's no barcode.
  - Screenshots: `shot-1.png` … `shot-4.png` with alt texts describing each slide.
  - Price: "Free. No ads, no account, no tracking."
  - Language links at the top: `English · Français (fr/) · العربية (ar/)` and the `hreflang` tags (`en` → `https://trabelsiachraf.com/saltscan-site/`, `fr` → `…/fr/`, `ar` → `…/ar/`, `x-default` → English).
  - Footer (replace Munajat's footer block with exactly this, keep Munajat's footer CSS):

```html
<footer>
  <div class="container">
    <div class="links">
      <a href="https://trabelsiachraf.com/saltscan-site/">Home</a>
      <a href="https://trabelsiachraf.com/saltscan-site/support.html">Support</a>
      <a href="https://trabelsiachraf.com/saltscan-site/privacy.html">Privacy Policy</a>
      <a href="https://trabelsiachraf.com/saltscan-site/accessibility.html">Accessibility</a>
      <a href="https://apps.apple.com/app/id6740041173">App Store</a>
      <a href="mailto:trabelsiachraf.devapps@gmail.com">Contact</a>
    </div>
    <p>© 2026 <a href="https://trabelsiachraf.com/">Achraf Trabelsi</a> · Salt Scan</p>
  </div>
</footer>
```

- [ ] **Step 3: `support.html`** — structure of `munajat-site/support.html` (title, Quick Start, FAQ, Contact) plus the same footer as Step 2 (add Munajat's footer CSS to this page's `<style>`):
  - Quick Start: scan a barcode from the Scan tab; read the rating; tap "Add to journal" and pick servings or grams; tap the ring on Home to open the journal, go back to earlier days with ‹ ›, swipe a portion to delete, tap it to edit; set your goal and unit in Settings.
  - FAQ: the English values of `FAQ.description.item01…item12` (title → `<h3>`, description → `<p>`) from `SaltScan/Configuration/Localizable.xcstrings` (read with `python3 -c "import json;d=json.load(open('…/Localizable.xcstrings'))['strings'];print(d['FAQ.description.item01.title']['localizations']['en']['stringUnit']['value'])"`), replacing any "[Contact Us]" placeholder with a `mailto:` link.
  - Contact: `trabelsiachraf.devapps@gmail.com`, and "from the app: Settings › Contact us".

- [ ] **Step 4: `privacy.html`** — based on the English `termsAndPrivacy.privacy.description` of the app (same catalog), rewritten as sections, and **verified against the code** before writing each sentence:

```bash
cd /Users/a.trabelsi/Workspace/Perso/SaltScan/SaltScan/SaltScan/App
grep -rn "openfoodfacts" Services/ Screens/Search/          # barcode lookup + name search go to Open Food Facts
grep -n "Firebase\|Firestore" Services/APIService.swift     # barcode sent to Firestore only as a fallback
grep -rln "Analytics\|AdMob" . || echo "no analytics / ads"  # must print "no analytics / ads"
grep -rn "HKHealthStore\|requestAuthorization" Services/HealthSyncService.swift  # write-only, opt-in
grep -rn "requestReview" .                                   # rating prompt via StoreKit
```

  Sections: Last updated September 30, 2026 · What Salt Scan does not do (no account, no analytics, no ads, no selling of data) · What stays on your device (scan history, favorites, journal, goal, settings — SwiftData / UserDefaults) · What is sent and to whom (the scanned barcode or the typed search text to Open Food Facts, `world.openfoodfacts.org`; the barcode to Google Firebase Firestore only when the Open Food Facts lookup fails; nothing else) · Camera (used only to read barcodes, no image stored or sent) · Apple Health (optional, off by default, write-only: dietary sodium per journal portion; never reads Health data; data stays in the Health app on your device) · Contact form (opens your Mail app; the message goes from your mail account) · Rating prompt (system dialog, Apple handles it) · Children · Changes · Contact. Footer as in Step 2.

- [ ] **Step 5: `accessibility.html`** — structure of `munajat-site/accessibility.html`; only verified statements:

```bash
cd /Users/a.trabelsi/Workspace/Perso/SaltScan/SaltScan/SaltScan/App
grep -n "static func" DesignSystem/Theme.swift | head   # SSFont uses system text styles → Dynamic Type
grep -rn "accessibilityLabel\|accessibilityHint" . | wc -l
grep -rn "Appearance\|preferredColorScheme" Utils/Appearance.swift Main/SaltScanApp.swift | head -3
```

  Content: text follows the system text size (Dynamic Type) where the app uses its type scale; VoiceOver labels on the journal day navigation, portion stepper, tappable daily ring and Add buttons; light, dark or system appearance; full Arabic interface right-to-left; colour is not the only signal of the salt rating (the badge also shows the words Low / Medium / High — verify in `SSBadge.swift`, omit if not true); known limits if any are found; how to report a problem (e-mail). Footer as in Step 2.

- [ ] **Step 6: `README.md`**

```markdown
# saltscan-site

Website for [Salt Scan](https://github.com/TrabelsiAchraf/SaltScan), the iOS app that checks the salt and sodium in food.

Published by GitHub Pages from `main`, served at <https://trabelsiachraf.com/saltscan-site/>.

## Links

| | English | Français | العربية |
|---|---|---|---|
| Website | <https://trabelsiachraf.com/saltscan-site/> | <https://trabelsiachraf.com/saltscan-site/fr/> | <https://trabelsiachraf.com/saltscan-site/ar/> |
| Support | <https://trabelsiachraf.com/saltscan-site/support.html> | <https://trabelsiachraf.com/saltscan-site/fr/support.html> | <https://trabelsiachraf.com/saltscan-site/ar/support.html> |
| Privacy | <https://trabelsiachraf.com/saltscan-site/privacy.html> | <https://trabelsiachraf.com/saltscan-site/fr/privacy.html> | <https://trabelsiachraf.com/saltscan-site/ar/privacy.html> |
| Accessibility | <https://trabelsiachraf.com/saltscan-site/accessibility.html> | <https://trabelsiachraf.com/saltscan-site/fr/accessibility.html> | <https://trabelsiachraf.com/saltscan-site/ar/accessibility.html> |

- App Store: <https://apps.apple.com/app/id6740041173>
- App source: <https://github.com/TrabelsiAchraf/SaltScan>
- Contact: trabelsiachraf.devapps@gmail.com

## Local preview

`python3 -m http.server 8000`, then open <http://localhost:8000>.

## Updating screenshots

Images come from `marketing/screenshots/<locale>/6.9/` in the SaltScan repo, resized with `sips --resampleWidth 660` (hero) and `480` (shots).
```

- [ ] **Step 7: Publish on GitHub**

```bash
cd /Users/a.trabelsi/Workspace/Perso/saltscan-site
git add -A && git commit -F- <<'EOF'
feat: Salt Scan website in English (home, support, privacy, accessibility)

Co-Authored-By: Claude <model> <noreply@anthropic.com>
EOF
gh repo create TrabelsiAchraf/saltscan-site --public --description "Salt Scan website: support, privacy and accessibility" --source . --push
gh api -X POST repos/TrabelsiAchraf/saltscan-site/pages -f 'source[branch]=main' -f 'source[path]=/'
```

- [ ] **Step 8: Check**

Wait until `gh api repos/TrabelsiAchraf/saltscan-site/pages --jq .status` prints `built` (poll every 15 s, up to 5 min), then `curl -s -o /dev/null -w '%{http_code}\n' https://trabelsiachraf.github.io/saltscan-site/privacy.html` → `200`. Local link sanity: open each page with `python3 -m http.server` and `curl` it. (Absolute `trabelsiachraf.com/saltscan-site/…` footer links only resolve after Task 7; that is expected.)

---

### Task 3: Salt Scan site in French and Arabic

**Files:**
- Create: `saltscan-site/fr/{index,support,privacy,accessibility}.html`, `saltscan-site/ar/{index,support,privacy,accessibility}.html`, `saltscan-site/fr/hero.png`, `fr/shot-1…4.png`, `ar/hero.png`, `ar/shot-1…4.png`

**Interfaces:**
- Consumes: the English pages and CSS from Task 2.
- Produces: the full 12-page site.

- [ ] **Step 1: Images** — same `sips` commands as Task 2 Step 1, from `fr-FR/6.9/` into `fr/` and `ar-SA/6.9/` into `ar/`.

- [ ] **Step 2: French pages** — translate each English page (same structure, same CSS, `<html lang="fr">`), using the app's own French strings where they exist (FAQ items, privacy text, `marketing/metadata/fr-FR/description.txt`); images from `fr/`; language links and `hreflang` tags identical to English; footer:

```html
<footer>
  <div class="container">
    <div class="links">
      <a href="https://trabelsiachraf.com/saltscan-site/fr/">Accueil</a>
      <a href="https://trabelsiachraf.com/saltscan-site/fr/support.html">Assistance</a>
      <a href="https://trabelsiachraf.com/saltscan-site/fr/privacy.html">Confidentialité</a>
      <a href="https://trabelsiachraf.com/saltscan-site/fr/accessibility.html">Accessibilité</a>
      <a href="https://apps.apple.com/app/id6740041173">App Store</a>
      <a href="mailto:trabelsiachraf.devapps@gmail.com">Contact</a>
    </div>
    <p>© 2026 <a href="https://trabelsiachraf.com/">Achraf Trabelsi</a> · Salt Scan</p>
  </div>
</footer>
```

- [ ] **Step 3: Arabic pages** — same, `<html lang="ar" dir="rtl">`, app's Arabic strings (FAQ, privacy, `marketing/metadata/ar-SA/description.txt`), images from `ar/`; in the CSS use logical properties (`margin-inline-start`, `padding-inline`, `text-align: start`) instead of left/right so the layout mirrors; footer labels: `الرئيسية`, `الدعم`, `الخصوصية`, `إمكانية الوصول`, `App Store`, `تواصل معنا`, links to `…/saltscan-site/ar/…`.

- [ ] **Step 4: README** — no change (Task 2 already lists the fr/ar URLs).

- [ ] **Step 5: Commit, push, check**

```bash
cd /Users/a.trabelsi/Workspace/Perso/saltscan-site
git add -A && git commit -F- <<'EOF'
feat: Salt Scan website in French and Arabic (right-to-left)

Co-Authored-By: Claude <model> <noreply@anthropic.com>
EOF
git push origin main
```

After Pages rebuilds: `for p in fr/ fr/support.html fr/privacy.html fr/accessibility.html ar/ ar/support.html ar/privacy.html ar/accessibility.html; do curl -s -o /dev/null -w "%{http_code} $p\n" https://trabelsiachraf.github.io/saltscan-site/$p; done` → all `200`.

- [ ] **Step 6: RTL rendering check** on the dedicated simulator `12869154-F77A-4A88-91FF-A88F9DEFEB26`:

```bash
SIM=12869154-F77A-4A88-91FF-A88F9DEFEB26
OUT=/Users/a.trabelsi/Workspace/Perso/saltscan-site-shots; mkdir -p $OUT
for p in ar/ ar/privacy.html fr/ ""; do
  xcrun simctl openurl $SIM "https://trabelsiachraf.github.io/saltscan-site/$p"; sleep 4
  xcrun simctl io $SIM screenshot "$OUT/$(echo ${p:-en} | tr '/.' '__').png"
done
```

Open the screenshots (Read tool) and confirm: Arabic text right-aligned, footer and lists mirrored, no clipped text, images visible. Fix and re-push if not. Keep the screenshots out of the repo.

---

### Task 4: MirrorKit accessibility page and footers

**Files:**
- Create: `mirrorkit-site/accessibility.html`
- Modify: `mirrorkit-site/index.html` (footer), `support.html`, `privacy.html` (add footer)

- [ ] **Step 1: Verify in the MirrorApp code** what to claim:

```bash
cd /Users/a.trabelsi/Workspace/Perso/MirrorApp
grep -rn "accessibilityLabel\|accessibilityHint\|accessibilityElement" --include=*.swift . | wc -l
grep -rn "keyboardShortcut" --include=*.swift . | head -20
grep -rn "reduceMotion\|accessibilityReduceMotion\|increaseContrast\|dynamicTypeSize" --include=*.swift . | head
```

- [ ] **Step 2: `accessibility.html`** — same look as `mirrorkit-site/support.html` (copy its `<style>`), sections: Our commitment · What MirrorKit supports (only verified items: keyboard shortcuts found in Step 1 listed by name, VoiceOver labels if Step 1 found any, system appearance / macOS text settings if verified) · Known limitations (e.g. the mirrored iPhone screen is a live video image, so its content is not readable by VoiceOver on the Mac — state only if true of the implementation) · Report a problem (e-mail) · Last updated September 30, 2026.

- [ ] **Step 3: Footers** — replace the footer in `index.html` and append to `support.html`, `privacy.html`, `accessibility.html` (add the footer CSS from `index.html` into each page's `<style>`):

```html
<footer>
  <div class="container">
    <div class="links">
      <a href="https://trabelsiachraf.com/mirrorkit-site/">Home</a>
      <a href="https://trabelsiachraf.com/mirrorkit-site/support.html">Support</a>
      <a href="https://trabelsiachraf.com/mirrorkit-site/privacy.html">Privacy Policy</a>
      <a href="https://trabelsiachraf.com/mirrorkit-site/accessibility.html">Accessibility</a>
      <a href="https://apps.apple.com/app/id6761739430">Mac App Store</a>
      <a href="https://github.com/TrabelsiAchraf/MirrorApp">GitHub</a>
      <a href="mailto:trabelsiachraf.devapps@gmail.com">Contact</a>
    </div>
    <p>© 2026 <a href="https://trabelsiachraf.com/">Achraf Trabelsi</a> · MirrorKit is built with ❤️</p>
  </div>
</footer>
```

  Keep existing in-page links (e.g. "Back to home") but make them absolute `https://trabelsiachraf.com/mirrorkit-site/…`.

- [ ] **Step 4: Commit, push, check** — `git commit` (`feat: accessibility page and shared footer`), `git push origin main`; after rebuild `curl` `https://trabelsiachraf.github.io/mirrorkit-site/accessibility.html` → `200`.

---

### Task 5: Clipdori modern home page (en + fr) and footers

**Files:**
- Modify: `clipdori-site/index.html` (rewritten: English modern home)
- Create: `clipdori-site/fr/index.html`, `clipdori-site/assets/` (icon, screenshots)
- Modify: `clipdori-site/style.css` (extend; keep the rules the existing sub-pages use), `support.html`, `privacy.html`, `accessibility.html` (footer only)

- [ ] **Step 1: Sources** — read `SmartClipboard/marketing/launch-copy.md`, `marketing/app-store/metadata/` (description, promotional text per language), `marketing/app-store/pricing.md`, `marketing/branding/brand-proposal.md` (colours: ivory, turquoise, gold — take the exact hex values from it), and the current `clipdori-site/index.html` texts.

- [ ] **Step 2: Images**

```bash
cd /Users/a.trabelsi/Workspace/Perso/clipdori-site && mkdir -p assets/en assets/fr
M=/Users/a.trabelsi/Workspace/Perso/SmartClipboard/marketing
sips --resampleWidth 256 $M/branding/icon-master-1024.png --out assets/icon.png
for lang in en fr; do for f in 01-keep 02-organize 03-favorites 06-keyboard 07-icloud; do
  sips --resampleWidth 480 $M/app-store/exports/$lang/iphone/$f.png --out assets/$lang/$f.png; done; done
```

- [ ] **Step 3: `index.html` (English) and `fr/index.html` (French)** — modern single-page layout mirroring the Munajat/MirrorKit home structure (sticky header with icon + name + language link, hero with headline "Copy. Keep. Find it again." / "Copiez. Gardez. Retrouvez.", sub-headline, CTA "Coming soon to the App Store" / "Bientôt sur l'App Store" as a non-link badge; feature grid from the existing four themes — Save on your terms, Find what matters, Your data your choice, keyboard/snippets — with texts from the metadata files; screenshot strip from `assets/<lang>/`; pricing "Free and Clipdori Pro" with the free limits and Pro description from `pricing.md` (no price amount unless `pricing.md` marks it confirmed); platforms iPhone · iPad · Mac). `hreflang` tags (`en` → `https://trabelsiachraf.com/clipdori-site/`, `fr` → `…/fr/`, `x-default` → English). Footer (French labels in `fr/`, English in root):

```html
<footer class="site-footer">
  <a href="https://trabelsiachraf.com/clipdori-site/">Home</a> ·
  <a href="https://trabelsiachraf.com/clipdori-site/support.html">Support</a> ·
  <a href="https://trabelsiachraf.com/clipdori-site/privacy.html">Privacy</a> ·
  <a href="https://trabelsiachraf.com/clipdori-site/accessibility.html">Accessibility</a> ·
  <a href="mailto:trabelsiachraf.devapps@gmail.com">Contact</a>
  <p>© 2026 <a href="https://trabelsiachraf.com/">Achraf Trabelsi</a> · Clipdori</p>
</footer>
```

  French variant: `Accueil`, `Assistance`, `Confidentialité`, `Accessibilité`, `Contact`, same URLs except Home → `…/clipdori-site/fr/`.

- [ ] **Step 4: Existing sub-pages** — in `support.html`, `privacy.html`, `accessibility.html` replace only the `<footer>…</footer>` with a bilingual version of the footer above (`Accueil / Home` → root, `Assistance / Support`, `Confidentialité / Privacy`, `Accessibilité / Accessibility`, contact). No other change.

- [ ] **Step 5: README** — rewrite `clipdori-site/README.md`'s links section as in Task 2 Step 6 (English + Français columns: Website root and `fr/`; Support, Privacy, Accessibility are single bilingual pages), App Store id6816525366 marked "in review", source repo `https://github.com/TrabelsiAchraf/clipdori` (private).

- [ ] **Step 6: Commit, push, check** — `feat: modern bilingual home page and shared footer`; `git push origin main`; after rebuild `curl` `https://trabelsiachraf.github.io/clipdori-site/` and `/fr/` → `200`, and the three sub-pages still `200`.

---

### Task 6: Munajat footers and README

**Files:**
- Modify: `munajat-site/index.html` (footer links absolute), `support.html`, `privacy.html`, `accessibility.html` (add footer), `README.md`

- [ ] **Step 1: Footer** — replace `index.html`'s footer and append to the three sub-pages (with the footer CSS copied into their `<style>`):

```html
<footer>
  <div class="container">
    <div class="links">
      <a href="https://trabelsiachraf.com/munajat-site/">Home</a>
      <a href="https://trabelsiachraf.com/munajat-site/support.html">Support</a>
      <a href="https://trabelsiachraf.com/munajat-site/privacy.html">Privacy Policy</a>
      <a href="https://trabelsiachraf.com/munajat-site/accessibility.html">Accessibility</a>
      <a href="https://apps.apple.com/app/id6768824373">App Store</a>
      <a href="https://github.com/TrabelsiAchraf/Munajat">GitHub</a>
      <a href="mailto:trabelsiachraf.devapps@gmail.com">Contact</a>
    </div>
    <p>© 2026 <a href="https://trabelsiachraf.com/">Achraf Trabelsi</a> · Munajat is built with ❤️ for the community</p>
  </div>
</footer>
```

  Make existing in-page links ("Back to home", "Privacy Policy") absolute. If `index.html` still has "Coming soon on the App Store" CTAs with `href="#"`, point them to `https://apps.apple.com/app/id6768824373` (Munajat is on sale).

- [ ] **Step 2: README** — replace the "Live URLs" section with a "Links" section (Website, Support, Privacy, Accessibility at `https://trabelsiachraf.com/munajat-site/…`, App Store, source repo, contact); remove the obsolete "Updating the App Store link" section only if Step 1 wired the CTA.

- [ ] **Step 3: Commit, push, check** — `docs: absolute trabelsiachraf.com links, shared footer`; push; all four pages `200` on github.io.

---

### Task 7: Rename my-website to the user site and verify

**Files:** GitHub repo settings; `my-website` local remote.

- [ ] **Step 1: Pre-check** — `node scripts/check-app-sites.mjs --phase before` must print `all app-site checks passed` except footer links to `trabelsiachraf.com/<site>/…` (those resolve only after the rename): run it and list the remaining failures; any failure that is not such a footer link blocks this task.

- [ ] **Step 2: Push the checker and spec/plan**, then rename:

```bash
cd /Users/a.trabelsi/Workspace/Perso/my-website
git push origin master
gh api -X PATCH repos/TrabelsiAchraf/my-website -f name=trabelsiachraf.github.io --jq .full_name
git remote set-url origin git@github.com:TrabelsiAchraf/trabelsiachraf.github.io.git
gh api repos/TrabelsiAchraf/trabelsiachraf.github.io/pages --jq '{cname,status,source}'
```

Expected: `TrabelsiAchraf/trabelsiachraf.github.io`, Pages `cname` still `trabelsiachraf.com`, source `master` `/`. If the cname is empty, set it back: `gh api -X PUT repos/TrabelsiAchraf/trabelsiachraf.github.io/pages -f cname=trabelsiachraf.com`.

- [ ] **Step 3: Wait and verify** — poll `curl -s -o /dev/null -w '%{http_code}' https://trabelsiachraf.com/munajat-site/` every 30 s up to 10 min until `200`, then:

```bash
node scripts/check-app-sites.mjs --phase after
curl -s -o /dev/null -w '%{http_code}\n' https://trabelsiachraf.com/ https://trabelsiachraf.com/stats.html
gh workflow run appstore-stats.yml -R TrabelsiAchraf/trabelsiachraf.github.io && sleep 60 && gh run list -R TrabelsiAchraf/trabelsiachraf.github.io --limit 1
```

Expected: `all app-site checks passed`, `200 200`, the workflow run `completed success` (poll `gh run watch` if still running).

- [ ] **Step 4: Rollback rule** — if `https://trabelsiachraf.com/` fails for more than 15 minutes after the rename, or any App-Store-declared URL (`munajat-site`, `mirrorkit-site`, `clipdori-site` home/support/privacy on github.io) returns 404, rename back immediately (`gh api -X PATCH repos/TrabelsiAchraf/trabelsiachraf.github.io -f name=my-website`, restore the remote) and report BLOCKED with the outputs.

---

### Task 8: READMEs and the personal site

**Files:**
- Modify: `mirrorkit-site/README.md`, `Adhkar/README.md` (Munajat app), `MirrorApp/README.md`, `SmartClipboard/README.md` (clipdori app), `SaltScan/SaltScan/README.md`, `my-website/index.html` (app cards)

- [ ] **Step 1: Site README (MirrorKit)** — "Links" section like Task 6 Step 2 with `https://trabelsiachraf.com/mirrorkit-site/…` and the Mac App Store link.

- [ ] **Step 2: App READMEs** — add (or replace an existing links/website section with) this block, adapted per app:

```markdown
## Links

- Website: <https://trabelsiachraf.com/saltscan-site/>
- Support: <https://trabelsiachraf.com/saltscan-site/support.html>
- Privacy: <https://trabelsiachraf.com/saltscan-site/privacy.html>
- Accessibility: <https://trabelsiachraf.com/saltscan-site/accessibility.html>
- App Store: <https://apps.apple.com/app/id6740041173>
- Website source: <https://github.com/TrabelsiAchraf/saltscan-site>
```

  Munajat → `munajat-site`, id6768824373; MirrorKit → `mirrorkit-site`, id6761739430 (Mac App Store); Clipdori → `clipdori-site`, "App Store: in review (id6816525366)". Place it after the README's first paragraph. SaltScan's README lives on branch `master`; the others on `main`.

- [ ] **Step 3: Personal site cards** — in `my-website/index.html`, for the Munajat, MirrorKit and Salt Scan project cards, add next to the existing `store-link`: `<a class="store-link" href="https://trabelsiachraf.com/<site>/" target="_blank" rel="noopener">Website ↗</a>`; if there is no Clipdori card, don't add one (out of scope). Bump the `css/style.css?v=` query only if you touched the CSS.

- [ ] **Step 4: Check** — `node scripts/check-app-sites.mjs --phase after --readme <all 8 README paths>` → `all app-site checks passed`.

- [ ] **Step 5: Commit and push each repo** — `docs: links to the website, support, privacy and accessibility pages`; push each to its default branch.

---

### Task 9: App Store Connect URLs

**Files:** none (App Store Connect via `asc`).

- [ ] **Step 1: Salt Scan 0.5.0** (version `35ed4efb-18d5-4a10-a0d7-11a373a6c0c3`, app `6740041173`):

```bash
V=35ed4efb-18d5-4a10-a0d7-11a373a6c0c3; B=https://trabelsiachraf.com/saltscan-site
for L in en-US:"" en-GB:"" fr-FR:fr/ fr-CA:fr/ ar-SA:ar/; do loc=${L%%:*}; dir=${L#*:}
  asc localizations update --version $V --locale $loc --support-url "$B/${dir}support.html" --marketing-url "$B/${dir}" >/dev/null
  asc localizations update --app 6740041173 --type app-info --locale $loc --privacy-policy-url "$B/${dir}privacy.html" >/dev/null || echo "privacy $loc not editable"
done
asc localizations list --version $V | python3 -c "import json,sys;[print(l['attributes']['locale'],l['attributes']['supportUrl'],l['attributes']['marketingUrl']) for l in json.load(sys.stdin)['data']]"
asc localizations list --app 6740041173 --type app-info | python3 -c "import json,sys;[print(l['attributes']['locale'],l['attributes']['privacyPolicyUrl']) for l in json.load(sys.stdin)['data']]"
```

  If a locale doesn't exist in the app-info list (e.g. en-GB/fr-CA), skip it and note it. Expected: every existing locale shows the new URLs.

- [ ] **Step 2: Munajat (6768824373) and MirrorKit (6761739430)** — try the privacy URL update only (`--type app-info`, `…/munajat-site/privacy.html`, `…/mirrorkit-site/privacy.html`); if `asc` reports no editable app info, change nothing and record "locked until next version". Do not create versions. Clipdori: no action.

- [ ] **Step 3: Validate Salt Scan** — `asc validate --app 6740041173 --version-id $V` → 0 errors.

- [ ] **Step 4: Report** — a table per app and locale: field, old value, new value or "locked until next version".

// Controlled Phase 7 content/search/font checks. Run only after the matching
// isolated production build is ready; this script owns ports 3101 and 4101.
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { spawn } from 'node:child_process';
import { frontendSource } from './source.mjs';
import { startFixtureApi, fixtureSecret, signedMarket } from './fixture-api.mjs';
import { loadPlaywright } from './browser.mjs';

const base = 'http://127.0.0.1:3101';
const apiOrigin = 'http://127.0.0.1:4101';
const output = 'artifacts/performance/phase-seven-checks';
const secret = 'performance-fixture-only';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sourceFingerprint = frontendSource(path.resolve('aranya-next')).sourceFingerprint;
const build = JSON.parse(fs.readFileSync('aranya-next/.performance-build/baseline-source.json', 'utf8'));
const fixtureSha256 = hash(fs.readFileSync('scripts/performance/fixtures/catalog.json'));
if (build.sourceFingerprint !== sourceFingerprint || build.fixtureSha256 !== fixtureSha256 || build.port !== 3101 || build.apiPort !== 4101) {
  throw new Error('Rebuild the isolated frontend from current source/fixture for ports 3101/4101 before Phase 7 checks.');
}
for (const port of [3101, 4101]) await new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', () => reject(new Error(`Isolated port ${port} is occupied; finish the other runner first.`)));
  probe.listen(port, '127.0.0.1', () => probe.close(resolve));
});

fs.mkdirSync(output, { recursive: true });
const api = await startFixtureApi();
const original = {
  products: structuredClone(api.data.products),
  blogs: structuredClone(api.data.blogs),
};
const seed = original.products.find(product => product.market === 'BOTH') || original.products[0];
const blogSeed = original.blogs[0];
if (!seed || !blogSeed) throw new Error('The public fixture needs a product and a blog seed.');

// Isolated in-memory growth data. Product 129 and journal 62 are deliberately
// outside the first 100-product and 50-post pages.
api.data.products = [
  ...original.products,
  ...Array.from({ length: 130 }, (_, index) => ({
    ...structuredClone(seed),
    id: `phase7-harvest-${String(index).padStart(3, '0')}`,
    slug: `phase-seven-harvest-${index}`,
    name: `Phase Seven Harvest ${String(index).padStart(3, '0')}`,
    status: 'ACTIVE', market: 'BOTH', images: [], featured: false,
    description: `Controlled harvest product ${index}`,
    variants: seed.variants.map(variant => ({ ...variant, id: `phase7-v-${index}-${variant.currency}`, sku: `P7-${index}-${variant.currency}` })),
  })),
];
api.data.blogs = [
  ...original.blogs,
  ...Array.from({ length: 63 }, (_, index) => ({
    ...structuredClone(blogSeed),
    id: `phase7-chronicle-${String(index).padStart(3, '0')}`,
    slug: `phase-seven-chronicle-${index}`,
    title: `Phase Seven Chronicle ${String(index).padStart(3, '0')}`,
    seoDesc: `Controlled chronicle article ${index}`,
    content: `# Chronicle ${index}\n\nA controlled article for complete search coverage.`,
    status: 'PUBLISHED',
  })),
];
const malicious = 'Safe <strong>bold</strong> and <em>emphasis</em> with <a href="https://example.invalid/story">a link</a>. <img src=x onerror="window.__phase7Xss=1"><script>window.__phase7Xss=1</script><a href="javascript:window.__phase7Xss=1">unsafe link</a>';
api.data.blogs[0].content = `# The Two Cinnamons\n\n${malicious}`;

const serverLogs = [], pageErrors = [], checks = [];
const selectedCase = process.argv.find(arg => arg.startsWith('--case='))?.slice('--case='.length).toLowerCase();
const server = spawn(process.execPath, [
  'aranya-next/node_modules/next/dist/bin/next', 'start',
  'aranya-next/.performance-build', '--hostname', '127.0.0.1', '--port', '3101',
], {
  env: { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_API_URL: apiOrigin,
    NEXT_PUBLIC_SITE_URL: base, NEXT_PUBLIC_ENABLE_DEMO: 'false',
    MARKET_COOKIE_SECRET: fixtureSecret, REVALIDATION_SECRET: secret },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', bytes => serverLogs.push(bytes.toString()));
server.stderr.on('data', bytes => serverLogs.push(bytes.toString()));
let browser, activePage, currentCase;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const save = () => fs.writeFileSync(path.join(output, 'checks.json'), JSON.stringify(checks, null, 2));
async function check(name, run) {
  if (selectedCase && !name.toLowerCase().includes(selectedCase)) return;
  currentCase = name;
  const detail = await run();
  checks.push({ name, passed: true, ...detail }); save();
  console.log(`Passed: ${name}`);
}
async function invalidate(paths = ['/', '/products', '/search', '/journal', '/recipes']) {
  const response = await fetch(base + '/api/revalidate', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
    body: JSON.stringify({ paths }), signal: AbortSignal.timeout(10000),
  });
  assert(response.ok, `Fixture cache invalidation failed: ${response.status}`);
  await response.arrayBuffer();
}
async function context(market = 'international') {
  const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await c.addCookies([{ name: 'x-market', value: signedMarket(market), url: base }]);
  await c.addInitScript(() => { localStorage.setItem('aranya-market-ack', '1'); window.__phase7Xss = 0; });
  await c.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base && url.origin !== apiOrigin) return route.abort();
    if (url.pathname === '/_next/image' && /^https?:/i.test(url.searchParams.get('url') || '')) return route.abort();
    return route.continue();
  });
  const p = await c.newPage();
  p.on('pageerror', error => pageErrors.push({ case: currentCase, message: error.message }));
  activePage = p;
  return { c, p };
}
async function until(predicate, message, attempts = 100) {
  for (let i = 0; i < attempts; i++) { if (predicate()) return; await sleep(30); }
  throw new Error(message);
}
const searchInput = page => page.locator('[data-screen-label="Search"] input[placeholder^="Search spices"]');
const queryCalls = (search, market) => api.calls.filter(call => {
  if (call.path !== '/products') return false;
  const query = new URLSearchParams(call.query);
  return query.get('search') === search && (!market || call.market === market);
});

try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base + '/about', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* wait */ }
    await sleep(500);
  }
  assert(ready, 'Isolated Next server did not become ready.');
  assert((await fetch(apiOrigin + '/health').then(response => response.json())).database === 'none', 'API is not the in-memory fixture.');
  const { chromium } = await loadPlaywright();
  browser = await chromium.launch({ headless: true, ...(process.env.PERF_BROWSER_CHANNEL ? { channel: process.env.PERF_BROWSER_CHANNEL } : {}) });
  await invalidate();
  fs.writeFileSync(path.join(output, 'environment.json'), JSON.stringify({
    sourceFingerprint, fixtureSha256, fixtureServerSha256: hash(fs.readFileSync('scripts/performance/fixture-api.mjs')),
    node: process.version, browser: browser.version(), syntheticProducts: 130, syntheticBlogs: 63,
    limits: ['Isolated local production build and in-memory public fixture only', 'No live database, provider, authentication, mail, payment, analytics or scheduled jobs', 'Search growth and fault checks are functional, not representative p95 timing or hosted scaling evidence', 'External browser requests are blocked'],
  }, null, 2));

  await check('Article paragraph keeps allowed markup and removes executable HTML', async () => {
    const { c, p } = await context();
    try {
      await p.goto(base + `/journal/${blogSeed.slug}`, { waitUntil: 'domcontentloaded' });
      const paragraph = p.locator('article p.prose').filter({ hasText: 'Safe bold' }).first();
      await paragraph.waitFor();
      const html = await paragraph.innerHTML();
      assert(await paragraph.locator('strong').textContent() === 'bold', 'Strong markup was lost.');
      assert(await paragraph.locator('em').textContent() === 'emphasis', 'Emphasis markup was lost.');
      assert(await paragraph.locator('a[href="https://example.invalid/story"]').count() === 1, 'Safe link was lost.');
      assert(!/<script|<img|onerror|javascript:/i.test(html), 'Unsafe article markup survived sanitation.');
      assert(await p.evaluate(() => window.__phase7Xss) === 0, 'Injected article code ran.');
      await p.screenshot({ path: path.join(output, 'article-sanitized.png') });
      return { strong: true, em: true, safeLink: true, executableMarkup: false };
    } finally { await c.close(); }
  });

  await check('Server-clean product story survives USD to LKR to USD rerenders', async () => {
    const { c, p } = await context();
    try {
      await p.goto(base + '/products/ceylon-cinnamon-quills', { waitUntil: 'domcontentloaded' });
      const story = p.locator('section').filter({ hasText: 'From the forest' }).first();
      await story.locator('em').filter({ hasText: 'Cinnamomum verum' }).waitFor();
      await p.evaluate(async () => { await document.fonts.ready; });
      const paragraphs = async () => story.locator('.pd-two p').evaluateAll(nodes => nodes.map(node => {
        const style = getComputedStyle(node);
        const emphasis = node.querySelector('em');
        return {
          html: node.innerHTML, text: node.textContent,
          fontFamily: style.fontFamily, fontWeight: style.fontWeight,
          fontStyle: style.fontStyle, lineHeight: style.lineHeight, color: style.color,
          emphasis: emphasis ? { text: emphasis.textContent, fontStyle: getComputedStyle(emphasis).fontStyle } : null,
        };
      }));
      const initial = await paragraphs();
      assert(initial.length === 2 && initial[0].html.includes('<em>Cinnamomum verum</em>'), 'Expected clean story emphasis is missing.');
      const sameStory = async market => {
        await p.evaluate(async () => { await document.fonts.ready; });
        const current = await paragraphs();
        assert(current.length === initial.length, `Story paragraph count changed after ${market} rerender.`);
        for (let i = 0; i < initial.length; i++) {
          assert(current[i].html === initial[i].html && current[i].text === initial[i].text,
            `Story paragraph ${i + 1} content/markup changed after ${market} rerender.`);
          for (const key of ['fontFamily', 'fontWeight', 'fontStyle', 'lineHeight', 'color']) {
            assert(current[i][key] === initial[i][key], `Story paragraph ${i + 1} ${key} changed after ${market} rerender.`);
          }
          assert(JSON.stringify(current[i].emphasis) === JSON.stringify(initial[i].emphasis),
            `Story emphasis changed after ${market} rerender.`);
        }
      };
      await p.locator('footer').getByRole('button', { name: 'LKR', exact: true }).click();
      await p.waitForFunction(() => document.querySelector('[data-screen-label="Product detail"]')?.textContent.includes('Rs '));
      await sameStory('LKR');
      await p.locator('footer').getByRole('button', { name: 'USD', exact: true }).click();
      await p.waitForFunction(() => document.querySelector('[data-screen-label="Product detail"]')?.textContent.includes('$'));
      await sameStory('USD');
      return { marketSwitches: 2, cleanStoryPreserved: true, paragraphs: initial };
    } finally { await c.close(); }
  });

  await check('Search covers all 130 products across compact and remote pages', async () => {
    const { c, p } = await context();
    try {
      await invalidate(['/products', '/search', '/journal']);
      api.calls.length = 0;
      await p.goto(base + '/search?q=Harvest', { waitUntil: 'domcontentloaded' });
      await p.getByRole('button', { name: /Spices 130/ }).waitFor();
      await p.getByText('Phase Seven Harvest 129', { exact: true }).waitFor();
      await until(() => queryCalls('Harvest').some(call => new URLSearchParams(call.query).has('cursor')), 'Remote search never requested its second 100-product page.', 160);
      const cards = api.calls.filter(call => call.path === '/products' && new URLSearchParams(call.query).get('view') === 'cards');
      assert(cards.some(call => new URLSearchParams(call.query).has('cursor')), 'SSR compact index stopped after first page.');
      return { products: 130, lastProduct: 129, compactPages: cards.length, remotePages: queryCalls('Harvest').length };
    } finally { await c.close(); }
  });

  await check('Journal search covers all 63 articles beyond the first 50', async () => {
    const { c, p } = await context();
    try {
      await invalidate(['/products', '/search', '/journal']);
      api.calls.length = 0;
      await p.goto(base + '/search?q=Chronicle', { waitUntil: 'domcontentloaded' });
      await p.getByRole('button', { name: /Journal 63/ }).waitFor();
      await p.getByText('Phase Seven Chronicle 062', { exact: true }).waitFor();
      const pages = api.calls.filter(call => call.path === '/blog' && new URLSearchParams(call.query).has('cursor'));
      assert(pages.length > 0, 'Journal index stopped after first 50 posts.');
      return { journals: 63, lastArticle: 62, journalCursorPages: pages.length };
    } finally { await c.close(); }
  });

  await check('Changing search text discards a delayed former remote result', async () => {
    const { c, p } = await context();
    let release;
    const held = new Promise(resolve => { release = resolve; });
    let intercepted = 0;
    try {
      await p.route('**/api/products?**', async route => {
        if (new URL(route.request().url()).searchParams.get('search') === 'Harvest') {
          intercepted++; await held; return route.continue().catch(() => {});
        }
        return route.continue();
      });
      await p.goto(base + '/search', { waitUntil: 'domcontentloaded' });
      await searchInput(p).fill('Harvest');
      await until(() => intercepted > 0, 'Debounced remote Harvest request did not start.');
      await searchInput(p).fill('Chronicle');
      await p.getByRole('button', { name: /Journal 63/ }).waitFor();
      release(); await sleep(300);
      assert(await p.getByText('Phase Seven Harvest 129', { exact: true }).count() === 0, 'Late Harvest result replaced Chronicle.');
      assert(await p.getByText('Phase Seven Chronicle 062', { exact: true }).count() === 1, 'New query result disappeared.');
      return { delayedOldRequest: true, newQueryRetained: true };
    } finally { release(); await c.close(); }
  });

  await check('Remote failure keeps local results and retry returns complete backend matches', async () => {
    const { c, p } = await context();
    let attempts = 0;
    const diagnostics = [], responses = [];
    p.on('response', response => {
      const url = new URL(response.url());
      if (url.pathname === '/api/products' && url.searchParams.get('search') === 'Harvest') {
        responses.push({ status: response.status(), query: url.search });
      }
    });
    const snapshot = async label => {
      const page = await p.evaluate(() => ({
        inputValue: document.querySelector('[data-screen-label="Search"] input[placeholder^="Search spices"]')?.value,
        buttons: [...document.querySelectorAll('[data-screen-label="Search"] button')].map(button => button.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean),
        resultSummary: [...document.querySelectorAll('[data-screen-label="Search"] section p')].map(node => node.textContent.trim()).find(text => /results? for/.test(text)) || null,
        productNames: [...document.querySelectorAll('[data-screen-label="Search"] .sr-grid h3')].map(node => node.textContent.trim()),
        url: location.pathname + location.search,
      }));
      diagnostics.push({ label, attempts, responses: [...responses], ...page,
        apiSearchCalls: queryCalls('Harvest').map(call => ({ query: call.query, market: call.market, cursor: new URLSearchParams(call.query).get('cursor') })) });
      fs.writeFileSync(path.join(output, 'case-six-diagnostics.json'), JSON.stringify(diagnostics, null, 2));
    };
    try {
      api.calls.length = 0;
      await p.route('**/api/products?**', route => {
        if (new URL(route.request().url()).searchParams.get('search') === 'Harvest' && ++attempts === 1) {
          return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Controlled unavailable"}' });
        }
        return route.continue();
      });
      await p.goto(base + '/search', { waitUntil: 'load' });
      // A suggestion click verifies that SearchClient's React handlers are
      // mounted before we drive the controlled input for the retry scenario.
      await p.getByRole('button', { name: 'Cinnamon', exact: true }).click();
      await p.waitForFunction(() => document.querySelector('[data-screen-label="Search"] input[placeholder^="Search spices"]')?.value === 'Cinnamon');
      await searchInput(p).fill('');
      await p.getByText('Bestsellers to start with', { exact: true }).waitFor();
      await searchInput(p).fill('Harvest');
      await until(() => attempts === 1, 'First remote search did not fail.');
      await p.getByRole('button', { name: /Spices 130/ }).waitFor();
      await snapshot('after-failed-remote-local-fallback');
      await searchInput(p).fill('');
      await p.getByText('Bestsellers to start with', { exact: true }).waitFor();
      await snapshot('after-clearing-query');
      await searchInput(p).fill('Harvest');
      await until(() => attempts >= 2, 'Changed query did not retry remote search.', 160);
      await snapshot('after-second-request-started');
      // The backend searches descriptions as well as names. The fixture's
      // Malabar Black Pepper description says "harvested", so the complete
      // remote result has 131 matches while the compact local fallback has 130.
      await p.getByRole('button', { name: /Spices 131/ }).waitFor();
      await p.getByText('Malabar Black Pepper', { exact: true }).waitFor();
      assert(await p.locator('[data-screen-label="Search"] .sr-grid h3').filter({ hasText: /^Phase Seven Harvest \d{3}$/ }).count() === 130,
        'Retry omitted a generated product.');
      assert(responses.some(row => row.status === 200 && new URLSearchParams(row.query).has('cursor')),
        'Retry did not complete its remote cursor page.');
      await snapshot('after-second-request-completed');
      return { forcedFailures: 1, attempts, localFallbackProducts: 130, completeRemoteProducts: 131, descriptionOnlyMatch: 'Malabar Black Pepper' };
    } catch (error) {
      await snapshot('failure').catch(() => {});
      throw error;
    } finally { await c.close(); }
  });

  await check('Market switch reruns remote search with the new signed market', async () => {
    const { c, p } = await context();
    try {
      api.calls.length = 0;
      await p.goto(base + '/search?q=Harvest', { waitUntil: 'domcontentloaded' });
      await until(() => queryCalls('Harvest', 'INTERNATIONAL').length > 0, 'Initial remote search missing.', 160);
      await p.locator('footer').getByRole('button', { name: 'LKR', exact: true }).click();
      await until(() => queryCalls('Harvest', 'LOCAL').length > 0, 'Market change did not rerun remote search.', 160);
      await p.getByRole('button', { name: /Spices 131/ }).waitFor();
      await until(() => queryCalls('Harvest', 'LOCAL').some(call => new URLSearchParams(call.query).has('cursor')), 'Local search did not complete its cursor page.', 160);
      return { marketSearches: ['INTERNATIONAL', 'LOCAL'], localRequests: queryCalls('Harvest', 'LOCAL').length };
    } finally { await c.close(); }
  });

  await check('Recipe spice mapping uses a bounded name lookup, not a catalog scan', async () => {
    const { c, p } = await context();
    try {
      await invalidate(['/recipes', '/products']); api.calls.length = 0;
      await p.goto(base + '/recipes/black-pork-curry', { waitUntil: 'domcontentloaded' });
      await p.getByText('Spices in this recipe', { exact: true }).waitFor();
      const productCalls = api.calls.filter(call => call.path === '/products');
      const lookup = productCalls.filter(call => new URLSearchParams(call.query).get('view') === 'lookup');
      assert(lookup.length === 1 && productCalls.length === 1, 'Recipe requested full catalog or repeated lookup.');
      const names = JSON.parse(new URLSearchParams(lookup[0].query).get('names'));
      assert(names.length > 0 && names.length <= 40, 'Lookup name count is outside the contract.');
      const response = await fetch(apiOrigin + '/products?view=lookup&names=' + encodeURIComponent(JSON.stringify(names)), { headers: { cookie: 'x-market=' + signedMarket('international') } });
      assert(response.ok, 'Fixture lookup failed.');
      const payload = await response.json();
      assert(payload.products.length <= names.length && payload.products.every(product => product.description === undefined), 'Lookup returned unbounded detail products.');
      return { lookupRequests: 1, names: names.length, matchedCards: payload.products.length, fullCatalogRequests: 0 };
    } finally { await c.close(); }
  });

  await check('Brand fonts remain distinct and admin CSS stays on admin', async () => {
    const { c, p } = await context();
    try {
      await p.goto(base + '/search', { waitUntil: 'domcontentloaded' });
      await p.evaluate(async () => { await document.fonts.ready; });
      const roles = await p.evaluate(() => ({
        display: { family: getComputedStyle(document.querySelector('h1.disp')).fontFamily, weight: getComputedStyle(document.querySelector('h1.disp')).fontWeight, style: getComputedStyle(document.querySelector('h1.disp')).fontStyle },
        ui: { family: getComputedStyle(document.querySelector('[data-screen-label="Search"] button.btn')).fontFamily, weight: getComputedStyle(document.querySelector('[data-screen-label="Search"] button.btn')).fontWeight, style: getComputedStyle(document.querySelector('[data-screen-label="Search"] button.btn')).fontStyle },
        reading: { family: getComputedStyle(document.querySelector('.prose')).fontFamily, weight: getComputedStyle(document.querySelector('.prose')).fontWeight, style: getComputedStyle(document.querySelector('.prose')).fontStyle },
        fontSetStatus: document.fonts.status,
      }));
      fs.writeFileSync(path.join(output, 'font-role-diagnostics.json'), JSON.stringify(roles, null, 2));
      assert(/Cormorant/i.test(roles.display.family) && /Jakarta/i.test(roles.ui.family) && /Spectral/i.test(roles.reading.family), 'Locked brand font roles changed.');
      await p.setViewportSize({ width: 390, height: 844 });
      const mobileRoles = await p.evaluate(() => {
        const sample = selector => { const style = getComputedStyle(document.querySelector(selector)); return { family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle }; };
        return { display: sample('h1.disp'), ui: sample('[data-screen-label="Search"] button.btn'), reading: sample('.prose') };
      });
      assert(JSON.stringify(mobileRoles) === JSON.stringify({ display: roles.display, ui: roles.ui, reading: roles.reading }), 'Responsive search font roles changed.');
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.goto(base + '/products/ceylon-cinnamon-quills', { waitUntil: 'domcontentloaded' });
      await p.locator('.pd-two p em').first().waitFor();
      await p.evaluate(async () => { await document.fonts.ready; });
      const product = await p.evaluate(() => {
        const sample = selector => { const style = getComputedStyle(document.querySelector(selector)); return { family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle }; };
        return { title: sample('[data-screen-label="Product detail"] h1'), story: sample('.pd-two p'), emphasis: sample('.pd-two p em'), fontSetStatus: document.fonts.status };
      });
      assert(/Cormorant/i.test(product.title.family) && /Spectral/i.test(product.story.family) && product.emphasis.style === 'italic', 'Product/story typography changed.');
      await p.screenshot({ path: path.join(output, 'product-typography-desktop.png') });
      await p.setViewportSize({ width: 390, height: 844 });
      await p.evaluate(async () => { await document.fonts.ready; });
      const mobileProduct = await p.evaluate(() => {
        const sample = selector => { const style = getComputedStyle(document.querySelector(selector)); return { family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle }; };
        return { title: sample('[data-screen-label="Product detail"] h1'), story: sample('.pd-two p'), emphasis: sample('.pd-two p em'), fontSetStatus: document.fonts.status };
      });
      fs.writeFileSync(path.join(output, 'product-font-diagnostics.json'), JSON.stringify({ desktop: product, mobile: mobileProduct }, null, 2));
      assert(JSON.stringify(mobileProduct) === JSON.stringify(product), 'Responsive product font roles changed.');
      await p.screenshot({ path: path.join(output, 'product-typography-mobile.png') });
      await p.setViewportSize({ width: 1440, height: 900 });
      const css = async () => Promise.all((await p.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => link.href))).map(async url => {
        assert(new URL(url).origin === base, 'Unexpected external stylesheet.');
        const response = await fetch(url);
        assert(response.ok, `Stylesheet failed: ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        return { path: new URL(url).pathname, bytes: bytes.length, gzipEstimateBytes: gzipSync(bytes).length, content: bytes.toString('utf8') };
      }));
      const storefrontStyles = await css();
      const storefrontCss = storefrontStyles.map(style => style.content).join('\n');
      assert(!/\.admin\s*\{|\.ad-rail\s*\{/.test(storefrontCss), 'Admin CSS leaked into direct storefront load.');
      await p.goto(base + '/admin', { waitUntil: 'domcontentloaded' });
      await p.getByRole('heading', { name: 'Sign in to the console', exact: true }).waitFor();
      await p.evaluate(async () => { await document.fonts.ready; });
      const adminStyles = await css();
      const adminCss = adminStyles.map(style => style.content).join('\n');
      assert(/\.admin\s*\{|\.ad-rail\s*\{/.test(adminCss), 'Admin route did not load its own CSS.');
      await p.screenshot({ path: path.join(output, 'admin-typography-desktop.png') });
      await p.setViewportSize({ width: 390, height: 844 });
      await p.screenshot({ path: path.join(output, 'admin-typography-mobile.png') });
      const chunks = [];
      const walk = dir => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (entry.name.endsWith('.js')) chunks.push(file); } };
      walk('aranya-next/.performance-build/.next/static/chunks');
      assert(!chunks.some(file => /DOMPurify|dompurify|ALLOWED_URI_REGEXP/.test(fs.readFileSync(file, 'utf8'))), 'DOMPurify policy symbol found in a client chunk.');
      const size = styles => styles.map(({ path, bytes, gzipEstimateBytes }) => ({ path, bytes, gzipEstimateBytes }));
      return { searchTypography: roles, mobileSearchTypography: mobileRoles, productTypography: product, mobileProductTypography: mobileProduct, storefrontStylesheets: size(storefrontStyles), adminStylesheets: size(adminStyles), storefrontAdminSelectors: false, adminCssLoaded: true, scannedClientChunks: chunks.length, domPurifySymbols: 0 };
    } finally { await c.close(); }
  });

  assert(pageErrors.length === 0, 'Browser page errors: ' + JSON.stringify(pageErrors));
} catch (error) {
  checks.push({ name: currentCase || 'setup', passed: false, error: error.message }); save();
  if (activePage) await activePage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  api.data.products = original.products; api.data.blogs = original.blogs;
  await invalidate().catch(() => {});
  server.kill();
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(5000)]);
  api.server.closeAllConnections(); await api.close();
  fs.writeFileSync(path.join(output, 'server.log'), serverLogs.join(''));
  fs.writeFileSync(path.join(output, 'page-errors.json'), JSON.stringify(pageErrors, null, 2));
}

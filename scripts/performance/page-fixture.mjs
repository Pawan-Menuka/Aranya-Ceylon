// Controlled, independent in-memory oracle. No database, providers or application mutations.
import crypto from 'node:crypto';
import { cardProduct } from './catalog-fixture.mjs';
const warnings = ['ORDER_REFUND', 'PRODUCT_ARCHIVE', 'BLOG_DELETE', 'GIFT_DELETE', 'RECIPE_DELETE'];
const date = '2026-10-02T00:00:00.000Z';
const identifier = (prefix, i) => prefix + String(i).padStart(4, '0');
const clone = value => structuredClone(value);
export function phaseNineData(base, size = 625) {
  if (!Number.isInteger(size) || size < 1 || size > 2000) throw new Error('Invalid controlled fixture size');
  const template = base.products[0];
  const rows = Array.from({ length: size }, (_, index) => index + 1);
  const active = size - 25;
  const products = rows.map(i => ({ ...clone(template), id: identifier('p', i), slug: `phase-nine-cinnamon-${i}`,
    name: `Phase Nine Cinnamon ${String(i).padStart(4, '0')}`, description: 'Velvet warming spice', latin: 'Cinnamomum verum',
    originLabel: 'Sri Lanka', flavour: ['Warm'], featured: i % 2 === 0,
    status: i <= active ? 'ACTIVE' : 'DRAFT',
    market: i > active - 20 && i <= active - 10 ? 'LOCAL' : i > active - 10 && i <= active ? 'INTERNATIONAL' : 'BOTH',
    category: { id: i > size - 5 ? 'rare' : 'whole', name: i > size - 5 ? 'Rare' : 'Whole Spices', slug: i > size - 5 ? 'rare' : 'whole-spices' },
    createdAt: date, updatedAt: date, ratingAvg: i % 5 + 1, _count: { reviews: 2, orderItems: i % 7 },
    variants: i === size ? [] : [
      { id: identifier('vl', i), weight: 100, price: String(i % 7 + 2.25), sku: `SKU-${String(i).padStart(4, '0')}`, stock: i % 25 === 0 ? 0 : 50, market: 'LOCAL', currency: 'LKR' },
      { id: identifier('vu', i), weight: 100, price: String(i % 7 + 0.25), sku: `USD-${String(i).padStart(4, '0')}`, stock: 50, market: 'INTERNATIONAL', currency: 'USD' },
      { id: identifier('ve', i), weight: 50, price: '0.01', sku: `EUR-${String(i).padStart(4, '0')}`, stock: 50, market: 'INTERNATIONAL', currency: 'EUR' },
    ].sort((a, b) => a.weight - b.weight || a.id.localeCompare(b.id)),
  }));
  const blogs = rows.map(i => ({ ...clone(base.blogs[0] ?? {}), id: identifier('b', i), title: `Phase Nine Cinnamon Journal ${String(i).padStart(4, '0')}`,
    slug: `phase-nine-journal-${i}`, content: 'SYNTHETIC BODY '.repeat(100), tags: ['Warm'], seoDesc: 'Warm spice journal',
    status: i <= active ? 'PUBLISHED' : 'DRAFT', publishedAt: date, scheduledAt: null, viewCount: i, authorId: 'fixture-admin', createdAt: date, updatedAt: date }));
  const recipes = rows.map(i => ({ ...clone(base.recipes[0] ?? {}), id: identifier('r', i), slug: `phase-nine-recipe-${i}`, title: `Phase Nine Cinnamon Recipe ${String(i).padStart(4, '0')}`,
    course: 'Curries & Mains', difficulty: 'Easy', featured: i % 2 === 0, status: i <= active ? 'PUBLISHED' : 'DRAFT', createdAt: date }));
  const gifts = rows.map(i => ({ ...clone(base.gifts[0] ?? {}), id: identifier('g', i), slug: `phase-nine-gift-${i}`, name: `Phase Nine Cinnamon Gift ${String(i).padStart(4, '0')}`,
    featured: i % 2 === 0, status: i <= active ? 'PUBLISHED' : 'DRAFT', usd: '10.25', lkr: '2500', contents: ['Cinnamon'], jar: '50g', createdAt: date }));
  const audit = rows.map(i => ({ id: identifier('a', i), actorId: i % 25 === 0 ? null : 'fixture-admin',
    actor: i % 25 === 0 ? null : { name: 'Admin Fixture', email: 'admin@example.invalid', role: 'ADMIN' },
    event: i % 50 === 0 ? 'ORDER_REFUND' : 'ORDER_STATUS_UPDATE', targetType: 'Order', targetId: `fixture-order-${String(i).padStart(6, '0')}`,
    diff: { fixture: 'synthetic note' }, ip: '127.0.0.1', userAgent: 'owned synthetic fixture', createdAt: date }));
  return { ...base, products, blogs, recipes, gifts, audit, phase9: { size, active, publicProductsPerMarket: active - 10, publishedJournal: active } };
}
function boundQuery(query) {
  const q = (query.get('q') ?? '').trim();
  const limit = Number(query.get('limit') ?? 20);
  if (q.length > 200 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid query bounds');
  return { q, limit };
}
function scope(identity) { return crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex'); }
function page(rows, limit, value, identity) {
  let start = 0;
  const signature = scope(identity);
  if (value) {
    if (value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid cursor');
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (cursor.v !== 1 || cursor.scope !== signature || typeof cursor.id !== 'string') throw new Error('Foreign cursor');
    start = rows.findIndex(row => row.id === cursor.id) + 1;
    if (!start) throw new Error('Stale cursor');
  }
  const items = rows.slice(start, start + limit);
  const hasNextPage = start + limit < rows.length;
  return { items, total: rows.length, hasNextPage,
    nextCursor: hasNextPage ? Buffer.from(JSON.stringify({ v: 1, scope: signature, id: items.at(-1).id })).toString('base64url') : null };
}
const lower = value => String(value ?? '').toLowerCase();
const contains = (value, q) => lower(value).includes(lower(q));
function action(event) { return ({ ORDER_STATUS_UPDATE: 'order.status', ADMIN_LOGIN: 'auth.login' })[event] ?? lower(event).replaceAll('_', '.'); }
function auditTarget(row) { return !row.targetType ? '—' : !row.targetId ? row.targetType : row.targetType === 'Order' ? `Order AC-${row.targetId.slice(-6).toUpperCase()}` : `${row.targetType} #${row.targetId.slice(-6)}`; }
const metadata = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key]]));
export function adminPageFixture(data, resource, query) {
  const { q, limit } = boundQuery(query);
  const status = query.get('status');
  const filter = query.get('filter') ?? 'all';
  const lowToken = query.get('lowStock');
  const category = query.get('category');
  if (lowToken !== null && !['true', 'false'].includes(lowToken)) throw new Error('Invalid stock filter');
  if (status && !(resource === 'products' ? ['ACTIVE', 'DRAFT', 'ARCHIVED'] : ['DRAFT', 'PUBLISHED', 'SCHEDULED']).includes(status)) throw new Error('Invalid status');
  if (!['all', 'admin', 'warn', 'job'].includes(filter)) throw new Error('Invalid audit filter');
  const low = p => !p.variants.length || p.variants.some(v => v.stock <= 10);
  const base = (data[resource] ?? []).filter(row => {
    if (resource === 'products') return contains(`${row.name} ${[...row.variants].sort((a,b)=>a.weight-b.weight||a.id.localeCompare(b.id))[0]?.sku ?? ''}`, q) && (!status || row.status === status);
    if (resource === 'audit') return contains(`${row.actor?.name ?? row.actorId ?? 'System'} ${action(row.event)} ${auditTarget(row)} ${JSON.stringify(row.diff ?? {})}`, q)
      && ['event', 'targetType', 'actorId'].every(key => !query.get(key) || row[key] === query.get(key));
    return contains(resource === 'gifts' ? row.name : row.title, q);
  });
  const counts = resource === 'products' ? { all: base.length, low: base.filter(low).length }
    : resource === 'audit' ? { all: base.length, admin: base.filter(row=>row.actor).length, job: base.filter(row=>!row.actor).length, warn: base.filter(row=>warnings.includes(row.event)).length }
    : { all: base.length, DRAFT: 0, PUBLISHED: 0, SCHEDULED: 0 };
  if (resource === 'products') for (const row of base) counts[row.category.name] = (counts[row.category.name] ?? 0) + 1;
  else if (resource !== 'audit') for (const row of base) counts[row.status]++;
  const filtered = base.filter(row => resource === 'products' ? (!category || row.category.name === category) && (lowToken === null || low(row) === (lowToken === 'true'))
    : resource === 'audit' ? filter === 'all' || filter === 'warn' && warnings.includes(row.event) || filter === 'job' && !row.actor || filter === 'admin' && !!row.actor
    : !status || row.status === status).sort((a,b) => (resource === 'gifts' ? Number(b.featured)-Number(a.featured) || a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)) || a.id.localeCompare(b.id));
  const identity = { resource, q, status, category, lowStock: lowToken, filter, event: query.get('event'), targetType: query.get('targetType'), actorId: query.get('actorId') };
  const result = page(filtered, limit, query.get('cursor'), identity);
  const keys = resource === 'blogs' ? ['id','title','slug','status','publishedAt','scheduledAt','viewCount','tags','authorId']
    : resource === 'recipes' ? ['id','slug','title','course','difficulty','featured','status','prepMins','cookMins','serves','createdAt']
    : resource === 'gifts' ? ['id','slug','name','featured','badge','usd','lkr','status','contents','jar','createdAt'] : null;
  return { [resource === 'audit' ? 'items' : resource]: keys ? result.items.map(row => metadata(row, keys)) : result.items,
    total: result.total, counts, nextCursor: result.nextCursor, hasNextPage: result.hasNextPage };
}
export function searchFixture(data, query, market) {
  const { q, limit } = boundQuery(query), sort = query.get('sort') ?? 'relevance', resource = query.get('resource') ?? 'all';
  if (!['relevance','price-asc','price-desc','rating'].includes(sort) || !['all','products','journal'].includes(resource)) throw new Error('Invalid search enum');
  const tokens = [...new Set(lower(q).split(/\s+/).filter(Boolean))];
  const form = p => /ground|powder|masala|blend/i.test(`${p.name} ${p.category?.name ?? ''}`) ? 'Ground' : 'Whole';
  const hay = p => `${p.name} ${p.latin ?? ''} ${p.originLabel || p.category?.name || 'Sri Lanka'} ${p.category?.name ?? ''} ${form(p)} ${(p.flavour ?? []).join(' ')}`;
  const score = p => tokens.reduce((sum, token) => sum + (contains(p.name ?? p.title, token) ? 3 : 1), 0);
  const fts = p => tokens.every(token => contains(`${p.name} ${p.description}`, token));
  const price = p => { const variants = p.variants.filter(v => (v.market === market || v.market === 'BOTH') && v.currency === (market === 'LOCAL' ? 'LKR' : 'USD'));
    const amount = Number(variants.find(v=>v.weight===100)?.price ?? [...variants].sort((a,b)=>Number(a.price)-Number(b.price)||a.id.localeCompare(b.id))[0]?.price ?? 0); return market === 'LOCAL' ? Math.round(amount) : amount; };
  const products = !tokens.length ? [] : data.products.filter(p => p.status === 'ACTIVE' && (p.market === market || p.market === 'BOTH') && (tokens.every(t=>contains(hay(p),t)) || fts(p)))
    .sort((a,b) => (sort === 'price-asc' ? price(a)-price(b) : sort === 'price-desc' ? price(b)-price(a) : sort === 'rating' ? (b.ratingAvg??0)-(a.ratingAvg??0) : 0)
      || Number(fts(b))-Number(fts(a)) || score(b)-score(a) || (b._count?.orderItems??0)-(a._count?.orderItems??0) || a.id.localeCompare(b.id));
  const journal = !tokens.length ? [] : data.blogs.filter(p => (!p.status || p.status === 'PUBLISHED') && tokens.every(t=>contains(`${p.title} ${p.seoDesc??''} ${(p.tags??[]).join(' ')} Aranya Ceylon`,t)))
    .sort((a,b)=>score(b)-score(a)||String(b.publishedAt??'').localeCompare(String(a.publishedAt??''))||a.id.localeCompare(b.id));
  // Validate both cursors even when only one set of visible items is requested.
  const productPage = page(products,limit,query.get('productCursor'),{resource:'products',q,sort,market});
  const journalPage = page(journal,limit,query.get('journalCursor'),{resource:'journal',q,sort,market});
  return { q, sort, market,
    products: resource === 'journal' ? { items: [], total: products.length, nextCursor: null, hasNextPage: false } : { ...productPage, items: productPage.items.map(p=>cardProduct({...p,variants:p.variants.filter(v=>v.market===market||v.market==='BOTH')})) },
    journal: resource === 'products' ? { items: [], total: journal.length, nextCursor: null, hasNextPage: false } : { ...journalPage, items: journalPage.items.map(p=>metadata(p,['id','title','slug','tags','publishedAt','seoDesc','viewCount'])) } };
}

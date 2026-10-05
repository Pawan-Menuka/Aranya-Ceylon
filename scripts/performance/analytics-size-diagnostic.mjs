// Deterministic transfer/serialization diagnostic for PERF-26. No DB, API,
// backend startup, network call, or application import is used.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outputPath = resolve(root, 'artifacts/performance/phase-seven-analytics-cost.json');
const orderCount = 90_000;
const selectedItemCount = 120_000;
const excludedCandidateCount = 12_000;
const productCount = 250;
const lkrUsdRate = 300;
const seriesStartMs = Date.UTC(2026, 6, 5);
const currentStartMs = Date.UTC(2026, 8, 3);
const tomorrowStartMs = Date.UTC(2026, 9, 3);
const dayMs = 24 * 60 * 60 * 1000;
const statuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const revenueStatuses = new Set(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']);

const orders = Array.from({ length: orderCount }, (_, index) => {
  const local = Math.floor(index / 90) % 3 === 0;
  return {
    market: local ? 'LOCAL' : 'INTERNATIONAL',
    currency: local ? 'LKR' : 'USD',
    status: statuses[Math.floor(index / 3) % statuses.length],
    total: String((index % 100 + 1) * 100),
    createdAt: new Date(seriesStartMs + index % 90 * dayMs).toISOString(),
  };
});

const inTopWindow = (order) => {
  const time = Date.parse(order.createdAt);
  return time >= currentStartMs && time < tomorrowStartMs;
};
const eligibleOrderIndexes = [];
const excludedOrderIndexes = [];
for (let index = 0; index < orders.length; index += 1) {
  const order = orders[index];
  if (inTopWindow(order) && revenueStatuses.has(order.status)) eligibleOrderIndexes.push(index);
  else excludedOrderIndexes.push(index);
}
if (!eligibleOrderIndexes.length || !excludedOrderIndexes.length) throw new Error('Fixture status windows are empty');

const makeCandidate = (index, orderIndex) => ({
  orderIndex,
  productId: `product-${index % productCount}`,
  quantity: index % 4 + 1,
  unitPrice: String((index % 50 + 1) * 100),
});
const candidates = [
  ...Array.from({ length: selectedItemCount }, (_, index) => makeCandidate(index, eligibleOrderIndexes[index % eligibleOrderIndexes.length])),
  ...Array.from({ length: excludedCandidateCount }, (_, index) => makeCandidate(selectedItemCount + index, excludedOrderIndexes[index % excludedOrderIndexes.length])),
];
const selectedCandidates = candidates.filter((item) => {
  const order = orders[item.orderIndex];
  return inTopWindow(order) && revenueStatuses.has(order.status);
});
if (selectedCandidates.length !== selectedItemCount) throw new Error('Selected line-item count changed');

// Shapes match the old Prisma selections: 90-day Order rows and qualifying
// 30-day OrderItem rows with the order's currency relation.
const selectedItems = selectedCandidates.map((item) => ({
  productId: item.productId,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  order: { currency: orders[item.orderIndex].currency },
}));

// Model the exact SQL grouping keys and top-product eligibility. Decimal
// columns are serialized as strings, as Prisma Decimal values would be.
const byDay = new Map();
for (const order of orders) {
  const date = order.createdAt.slice(0, 10);
  const key = `${date}|${order.market}|${order.currency}|${order.status}`;
  const group = byDay.get(key) ?? {
    date, market: order.market, currency: order.currency, status: order.status,
    orders: 0, total: 0,
  };
  group.orders += 1;
  group.total += Number(order.total);
  byDay.set(key, group);
}
const dailyOrders = [...byDay.values()].map((group) => ({ ...group, total: String(group.total) }));

const byProduct = new Map();
for (const item of candidates) {
  const order = orders[item.orderIndex];
  if (!inTopWindow(order) || !revenueStatuses.has(order.status)) continue;
  const group = byProduct.get(item.productId) ?? { productId: item.productId, units: 0, revenueUsd: 0 };
  group.units += item.quantity;
  group.revenueUsd += item.quantity * Number(item.unitPrice) / (order.currency === 'LKR' ? lkrUsdRate : 1);
  byProduct.set(item.productId, group);
}
const topProducts = [...byProduct.values()]
  .sort((a, b) => b.units - a.units || (a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0))
  .slice(0, 5)
  .map((group) => ({ ...group, units: String(group.units), revenueUsd: String(group.revenueUsd) }));

const sourceBytes = Buffer.byteLength(JSON.stringify(orders)) + Buffer.byteLength(JSON.stringify(selectedItems));
const aggregateBytes = Buffer.byteLength(JSON.stringify(dailyOrders)) + Buffer.byteLength(JSON.stringify(topProducts));
const medianSerializationMs = (first, second) => {
  const samples = [];
  for (let run = 0; run < 5; run += 1) {
    const start = performance.now();
    JSON.stringify(first);
    JSON.stringify(second);
    samples.push(performance.now() - start);
  }
  return { samples: samples.map((sample) => Number(sample.toFixed(3))), median: Number([...samples].sort((a, b) => a - b)[2].toFixed(3)) };
};

const result = {
  method: {
    kind: 'deterministic synthetic Node object selection and grouping; no database or network',
    node: process.version,
    fixedWindow: { seriesStart: '2026-07-05', currentStart: '2026-09-03', tomorrowExclusive: '2026-10-03' },
    statuses,
    revenueStatuses: [...revenueStatuses],
    lkrUsdRate,
    runs: 5,
    note: 'Byte counts and serialization time estimate transfer shape and Node work; they do not measure PostgreSQL execution or dashboard latency.',
  },
  counts: {
    orders: orders.length,
    candidateItems: candidates.length,
    excludedCandidateItems: candidates.length - selectedCandidates.length,
    selectedItems: selectedItems.length,
    dailyGroups: dailyOrders.length,
    topProducts: topProducts.length,
    previousSelectedRows: orders.length + selectedItems.length,
    aggregateRows: dailyOrders.length + topProducts.length,
  },
  bytes: {
    previousSelected: sourceBytes,
    aggregated: aggregateBytes,
    reductionPercent: Number((100 * (1 - aggregateBytes / sourceBytes)).toFixed(2)),
  },
  serializationMs: {
    previousSelected: medianSerializationMs(orders, selectedItems),
    aggregated: medianSerializationMs(dailyOrders, topProducts),
  },
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, counts: result.counts, bytes: result.bytes, serializationMs: result.serializationMs }));

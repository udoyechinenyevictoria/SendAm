const { test } = require('node:test');
const assert = require('node:assert/strict');

const hasDatabase = Boolean(process.env.DATABASE_URL);
const rateLimit = hasDatabase ? require('../src/services/rateLimit.service') : null;
const prisma = hasDatabase ? require('../src/common/prisma') : null;

const key = `rate-limit-test-${Date.now()}-${Math.random()}`;

test('consume atomically counts parallel new-key requests', { skip: !hasDatabase }, async () => {
  await prisma.rateLimitHit.deleteMany({ where: { key } });
  const results = await Promise.all(Array.from({ length: 50 }, () => rateLimit.consume(key, 60_000)));
  assert.deepEqual(results.map((result) => result.totalHits).sort((a, b) => a - b), Array.from({ length: 50 }, (_, index) => index + 1));
  const row = await prisma.rateLimitHit.findUnique({ where: { key } });
  assert.equal(row.count, 50);
});

test('consume resets an expired key once and preserves active increments', { skip: !hasDatabase }, async () => {
  await prisma.rateLimitHit.upsert({
    where: { key },
    update: { count: 7, resetAt: new Date(Date.now() - 1_000) },
    create: { key, count: 7, resetAt: new Date(Date.now() - 1_000) },
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit.consume(key, 60_000)));
  assert.equal(Math.min(...results.map((result) => result.totalHits)), 1);
  assert.equal(Math.max(...results.map((result) => result.totalHits)), 20);
  const row = await prisma.rateLimitHit.findUnique({ where: { key } });
  assert.equal(row.count, 20);
});

test('decrement is atomic and never makes a counter negative', { skip: !hasDatabase }, async () => {
  await prisma.rateLimitHit.upsert({
    where: { key },
    update: { count: 1, resetAt: new Date(Date.now() + 60_000) },
    create: { key, count: 1, resetAt: new Date(Date.now() + 60_000) },
  });
  await Promise.all(Array.from({ length: 10 }, () => rateLimit.decrement(key)));
  const row = await prisma.rateLimitHit.findUnique({ where: { key } });
  assert.equal(row.count, 0);
});

test('resetKey removes the current fixed-window row', { skip: !hasDatabase }, async () => {
  await prisma.rateLimitHit.upsert({
    where: { key },
    update: { count: 3, resetAt: new Date(Date.now() + 60_000) },
    create: { key, count: 3, resetAt: new Date(Date.now() + 60_000) },
  });
  await rateLimit.resetKey(key);
  assert.equal(await prisma.rateLimitHit.findUnique({ where: { key } }), null);
});

test.after(async () => {
  if (prisma) {
    await prisma.rateLimitHit.deleteMany({ where: { key } });
    await prisma.$disconnect();
  }
});
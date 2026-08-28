const { test } = require('node:test');
const assert = require('node:assert/strict');
const { claimConfirmation, cancelConfirmation, summaryHash } = require('../src/whatsapp/confirmationRequest');

const request = (overrides = {}) => ({
  id: 'request-1', userId: 'user-1', nonce: 'ABC123', state: 'pending',
  amount: '10', asset: 'XLM', destination: 'GDEST', alias: 'Ada', routeType: 'domestic',
  summaryHash: summaryHash({ amount: '10', asset: 'XLM', destination: 'GDEST', alias: 'Ada', routeType: 'domestic' }),
  expiresAt: new Date('2026-08-28T12:10:00Z'), ...overrides,
});

const stubPrisma = (stored, count = 1) => ({
  confirmationRequest: {
    findUnique: async () => stored,
    updateMany: async (args) => { stubPrisma.last = args; return { count }; },
  },
});

test('claim consumes only the matching pending, unexpired request', async () => {
  const prisma = stubPrisma(request());
  const claimed = await claimConfirmation({ prisma, userId: 'user-1', reference: 'ABC123', now: new Date('2026-08-28T12:01:00Z') });
  assert.equal(claimed.nonce, 'ABC123');
  assert.equal(stubPrisma.last.where.nonce, 'ABC123');
  assert.equal(stubPrisma.last.data.state, 'consumed');
});

test('superseded, expired, wrong-user, and concurrent-lost requests cannot claim', async () => {
  for (const stored of [request({ state: 'superseded' }), request({ expiresAt: new Date('2026-08-28T11:00:00Z') }), request({ userId: 'other' })]) {
    assert.equal(await claimConfirmation({ prisma: stubPrisma(stored), userId: 'user-1', reference: 'ABC123', now: new Date('2026-08-28T12:01:00Z') }), null);
  }
  assert.equal(await claimConfirmation({ prisma: stubPrisma(request(), 0), userId: 'user-1', reference: 'ABC123' }), null);
});

test('cancellation is an atomic state transition', async () => {
  const prisma = stubPrisma(null, 1);
  assert.equal(await cancelConfirmation({ prisma, userId: 'user-1', reference: 'ABC123' }), true);
  assert.equal(stubPrisma.last.data.state, 'canceled');
});
const { test } = require('node:test');
const assert = require('node:assert/strict');
const hasDatabase = Boolean(process.env.DATABASE_URL);
const idempotency = hasDatabase ? require('../src/services/idempotency.service') : null;
const prisma = hasDatabase ? require('../src/common/prisma') : null;

test('payment fingerprints include amount, asset, and destination', { skip: !hasDatabase }, () => {
  const { fingerprintRequest } = idempotency;
  const base = { amount: '10', asset: 'XLM', destination: 'GDEST', routeType: 'domestic' };
  assert.equal(fingerprintRequest(base), fingerprintRequest({ ...base }));
  assert.notEqual(fingerprintRequest(base), fingerprintRequest({ ...base, amount: '11' }));
  assert.notEqual(fingerprintRequest(base), fingerprintRequest({ ...base, asset: 'USDC' }));
  assert.notEqual(fingerprintRequest(base), fingerprintRequest({ ...base, destination: 'GOTHER' }));
});

const testKey = `idempotency-test-${Date.now()}-${Math.random()}`;
const request = { amount: '10', asset: 'XLM', destination: 'GDEST', routeType: 'domestic' };

test('concurrent claims allow one owner and replay the completed response', { skip: !hasDatabase }, async () => {
  const fingerprint = idempotency.fingerprintRequest(request);
  const user = await prisma.user.create({ data: { phoneNumber: `+234${Date.now()}` } });
  try {
    const claims = await Promise.all(Array.from({ length: 20 }, () => idempotency.claim({
      userId: user.id, operation: 'wallet.send', key: testKey, fingerprint,
    })));
    assert.equal(claims.filter((result) => result.state === 'claimed').length, 1);
    assert.equal(claims.filter((result) => result.state === 'processing').length, 19);

    const owner = claims.find((result) => result.state === 'claimed');
    const response = { success: true, data: { transactionId: 'tx-1' } };
    await idempotency.complete(owner.record.id, response);
    assert.deepEqual(
      (await idempotency.claim({ userId: user.id, operation: 'wallet.send', key: testKey, fingerprint })).record.response,
      response
    );
    assert.equal((await idempotency.claim({
      userId: user.id,
      operation: 'wallet.send',
      key: testKey,
      fingerprint: idempotency.fingerprintRequest({ ...request, amount: '11' }),
    })).state, 'conflict');
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test.after(async () => {
  if (prisma) await prisma.$disconnect();
});
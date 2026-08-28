const crypto = require('node:crypto');
const prisma = require('../common/prisma');

const PROCESSING_TTL_MS = 10 * 60 * 1000;
const RETENTION_MS = 24 * 60 * 60 * 1000;

const fingerprintRequest = ({ amount, asset, destination, routeType, sourceCountry, destinationCountry }) =>
  crypto.createHash('sha256').update(JSON.stringify({
    amount: String(amount),
    asset: asset || 'XLM',
    destination: String(destination).trim(),
    routeType: routeType || null,
    sourceCountry: sourceCountry || 'NG',
    destinationCountry: destinationCountry || 'NG',
  })).digest('hex');

const claim = async ({ userId, operation, key, fingerprint }) => {
  const now = new Date();
  try {
    const record = await prisma.idempotencyKey.create({
      data: {
        userId, operation, key, fingerprint, status: 'processing',
        expiresAt: new Date(now.getTime() + PROCESSING_TTL_MS),
        retentionUntil: new Date(now.getTime() + RETENTION_MS),
      },
    });
    return { state: 'claimed', record };
  } catch (error) {
    if (error.code !== 'P2002') throw error;
  }

  const record = await prisma.idempotencyKey.findUnique({
    where: { userId_operation_key: { userId, operation, key } },
  });
  if (!record) return claim({ userId, operation, key, fingerprint });
  if (record.fingerprint !== fingerprint) return { state: 'conflict', record };
  if (record.status === 'completed') return { state: 'replay', record };
  if (record.expiresAt <= now) return { state: 'stuck', record };
  return { state: 'processing', record };
};

const complete = (id, response) => prisma.idempotencyKey.update({
  where: { id },
  data: { status: 'completed', response, expiresAt: new Date() },
});

module.exports = { claim, complete, fingerprintRequest, PROCESSING_TTL_MS, RETENTION_MS };
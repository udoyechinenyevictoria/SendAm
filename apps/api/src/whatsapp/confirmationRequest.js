const crypto = require('node:crypto');

const CONFIRMATION_TTL_MS = 10 * 60 * 1000;
const CONFIRMATION_REFERENCE_LENGTH = 6;

const createReference = () => crypto.randomBytes(5).toString('base64url').slice(0, CONFIRMATION_REFERENCE_LENGTH).toUpperCase();

const summaryHash = ({ amount, asset, destination, alias, routeType }) => crypto
  .createHash('sha256')
  .update(JSON.stringify({ amount: String(amount), asset, destination, alias, routeType }))
  .digest('hex');

const claimConfirmation = async ({ prisma, userId, reference, now = new Date() }) => {
  const request = await prisma.confirmationRequest.findUnique({ where: { nonce: reference } });
  if (!request || request.userId !== userId || request.state !== 'pending' || request.expiresAt <= now) return null;

  const result = await prisma.confirmationRequest.updateMany({
    where: {
      id: request.id,
      userId,
      nonce: reference,
      state: 'pending',
      expiresAt: { gt: now },
    },
    data: { state: 'consumed', consumedAt: now },
  });
  return result.count === 1 ? request : null;
};

const cancelConfirmation = async ({ prisma, userId, reference, now = new Date() }) => {
  const result = await prisma.confirmationRequest.updateMany({
    where: {
      userId,
      nonce: reference,
      state: 'pending',
      expiresAt: { gt: now },
    },
    data: { state: 'canceled', canceledAt: now },
  });
  return result.count === 1;
};

module.exports = {
  CONFIRMATION_TTL_MS,
  CONFIRMATION_REFERENCE_LENGTH,
  createReference,
  summaryHash,
  claimConfirmation,
  cancelConfirmation,
};
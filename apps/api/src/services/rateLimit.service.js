const prisma = require('../common/prisma');
const crypto = require('node:crypto');

/**
 * Fixed-window counter backed by PostgreSQL and shared across instances. Used both
 * by the express-rate-limit store (REST) and the WhatsApp per-sender throttle.
 *
 * Fixed windows expire when resetAt <= PostgreSQL's CURRENT_TIMESTAMP. The
 * insert/upsert is one statement, so the unique-key row lock serializes both
 * first writes and expiry resets across API replicas.
 */
const consume = async (key, windowMs) => {
  const [result] = await prisma.$queryRaw`
    INSERT INTO "RateLimitHit" ("id", "key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID()}, ${key}, 1,
      CURRENT_TIMESTAMP + (${windowMs}::double precision * INTERVAL '1 millisecond'),
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE
    SET "count" = CASE
          WHEN "RateLimitHit"."resetAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE "RateLimitHit"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitHit"."resetAt" <= CURRENT_TIMESTAMP
            THEN CURRENT_TIMESTAMP + (${windowMs}::double precision * INTERVAL '1 millisecond')
          ELSE "RateLimitHit"."resetAt"
        END,
        "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count", "resetAt";
  `;

  return { totalHits: result.count, resetTime: result.resetAt };
};

const decrement = async (key) => {
  await prisma.$executeRaw`
    UPDATE "RateLimitHit"
    SET "count" = GREATEST("count" - 1, 0), "updatedAt" = CURRENT_TIMESTAMP
    WHERE "key" = ${key}
      AND "resetAt" > CURRENT_TIMESTAMP
      AND "count" > 0;
  `;
};

const resetKey = async (key) => {
  await prisma.rateLimitHit.delete({ where: { key } }).catch(() => null);
};

module.exports = {
  consume,
  decrement,
  resetKey,
};

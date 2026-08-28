const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { verifyPassword, createToken } = require('../services/adminAuth.service');
const prisma = require('../common/prisma');
const { withIdAliases } = require('../common/records');
const {
  adminUserSelect,
  adminWalletSelect,
  adminTransactionSelect,
  adminKycSelect,
  toAdminUser,
  toAdminWallet,
  toAdminTransaction,
  toAdminKyc,
} = require('./admin.dto');

// Parse ?page and ?limit into safe bounds so list endpoints can never be asked
// to load the entire collection at once. Defaults to 50/page, capped at 100.
const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 50));
  return { page, limit, skip: (page - 1) * limit };
};

const login = async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!verifyPassword(password)) {
      return sendError(res, 'Invalid credentials', 401);
    }
    const token = createToken();
    return sendSuccess(res, { token }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalWallets,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      pendingKyc,
      voiceCommands,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.wallet.count(),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: 'success' } }),
      prisma.transaction.count({ where: { status: 'failed' } }),
      prisma.transaction.count({ where: { status: { in: ['pending', 'processing'] } } }),
      prisma.kycProfile.count({ where: { status: { in: ['pending', 'review'] } } }),
      prisma.voiceCommand.count(),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalWallets,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      pendingTransactions,
      pendingKyc,
      voiceCommands,
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: adminUserSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count(),
    ]);
    sendPaginated(res, withIdAliases(users.map(toAdminUser)), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getWallets = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [wallets, total] = await Promise.all([
      prisma.wallet.findMany({
        select: adminWalletSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.wallet.count(),
    ]);
    sendPaginated(res, withIdAliases(wallets.map(toAdminWallet)), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        select: adminTransactionSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count(),
    ]);
    sendPaginated(res, withIdAliases(transactions.map(toAdminTransaction)), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getKycProfiles = async (_req, res, next) => {
  try {
    const profiles = await prisma.kycProfile.findMany({
      select: adminKycSelect,
      orderBy: { updatedAt: 'desc' },
    });
    sendSuccess(res, withIdAliases(profiles.map(toAdminKyc)));
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    sendSuccess(res, withIdAliases(logs));
  } catch (error) {
    next(error);
  }
};

const getSystemHealth = async (_req, res, next) => {
  try {
    sendSuccess(res, {
      api: 'ok',
      database: 'ok',
      queues: process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL ? 'redis-configured' : 'inline-dev-mode',
      settlementRail: 'stellar',
      custodyModel: 'direct',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getStats,
  getUsers,
  getWallets,
  getTransactions,
  getKycProfiles,
  getAuditLogs,
  getSystemHealth,
};

const maskIdentifier = (value, visibleStart = 3, visibleEnd = 2) => {
  if (typeof value !== 'string' || value.length <= visibleStart + visibleEnd) return value ? '[masked]' : value;
  return `${value.slice(0, visibleStart)}...${value.slice(-visibleEnd)}`;
};

const maskPhoneNumber = (value) => maskIdentifier(value, 4, 2);

const adminUserSelect = {
  id: true,
  phoneNumber: true,
  whatsappName: true,
  createdAt: true,
  wallets: { select: { chain: true, publicKey: true, network: true, createdAt: true } },
};

const adminWalletSelect = {
  id: true,
  chain: true,
  publicKey: true,
  network: true,
  createdAt: true,
  user: { select: { phoneNumber: true, whatsappName: true } },
};

const adminTransactionSelect = {
  id: true,
  type: true,
  amount: true,
  asset: true,
  destination: true,
  explorerUrl: true,
  status: true,
  createdAt: true,
  user: { select: { phoneNumber: true } },
};

const adminKycSelect = {
  id: true,
  provider: true,
  tier: true,
  status: true,
  riskScore: true,
  sanctionsStatus: true,
  custodyStatus: true,
  updatedAt: true,
  user: { select: { phoneNumber: true } },
};

const toAdminUser = (user) => ({
  id: user.id,
  phoneNumber: maskPhoneNumber(user.phoneNumber),
  whatsappName: user.whatsappName,
  createdAt: user.createdAt,
  wallets: (user.wallets || []).map((wallet) => ({
    chain: wallet.chain,
    publicKey: maskIdentifier(wallet.publicKey, 6, 4),
    network: wallet.network,
    createdAt: wallet.createdAt,
  })),
});

const toAdminWallet = (wallet) => ({
  id: wallet.id,
  chain: wallet.chain,
  publicKey: maskIdentifier(wallet.publicKey, 6, 4),
  network: wallet.network,
  createdAt: wallet.createdAt,
  userId: wallet.user ? {
    phoneNumber: maskPhoneNumber(wallet.user.phoneNumber),
    whatsappName: wallet.user.whatsappName,
  } : null,
});

const toAdminTransaction = (transaction) => ({
  id: transaction.id,
  type: transaction.type,
  amount: transaction.amount,
  asset: transaction.asset,
  destination: maskIdentifier(transaction.destination, 6, 4),
  explorerUrl: transaction.explorerUrl,
  status: transaction.status,
  createdAt: transaction.createdAt,
  userId: transaction.user ? { phoneNumber: maskPhoneNumber(transaction.user.phoneNumber) } : null,
});

const toAdminKyc = (profile) => ({
  id: profile.id,
  provider: profile.provider,
  tier: profile.tier,
  status: profile.status,
  riskScore: profile.riskScore,
  sanctionsStatus: profile.sanctionsStatus,
  custodyStatus: profile.custodyStatus,
  updatedAt: profile.updatedAt,
  userId: profile.user ? { phoneNumber: maskPhoneNumber(profile.user.phoneNumber) } : null,
});

module.exports = {
  adminUserSelect,
  adminWalletSelect,
  adminTransactionSelect,
  adminKycSelect,
  toAdminUser,
  toAdminWallet,
  toAdminTransaction,
  toAdminKyc,
};
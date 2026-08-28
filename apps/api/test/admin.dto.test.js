const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  toAdminUser,
  toAdminWallet,
  toAdminTransaction,
  toAdminKyc,
} = require('../src/controllers/admin.dto');

const assertKeys = (value, keys) => assert.deepEqual(Object.keys(value).sort(), keys.sort());

test('admin DTOs are allowlists and omit sensitive model fields', () => {
  const user = toAdminUser({
    id: 'user-1', phoneNumber: '+2348012345678', whatsappName: 'Ada', createdAt: 'date',
    pinHash: 'secret', pendingSend: { pin: '1234' }, contactsJson: [{ phone: '+234' }], riskScore: 99,
    wallets: [{ chain: 'stellar', publicKey: 'GABCDEF123456789', network: 'testnet', createdAt: 'date', encryptedSecretKey: 'secret' }],
  });
  assertKeys(user, ['id', 'phoneNumber', 'whatsappName', 'createdAt', 'wallets']);
  assertKeys(user.wallets[0], ['chain', 'publicKey', 'network', 'createdAt']);
  assert.equal(user.phoneNumber, '+234...78');
  assert.equal(user.wallets[0].publicKey, 'GABCDE...6789');

  const wallet = toAdminWallet({ id: 'wallet-1', chain: 'stellar', publicKey: 'GABCDEF123456789', network: 'testnet', createdAt: 'date', encryptedSecretKey: 'secret', paymentCursor: 'cursor', user: { phoneNumber: '+2348012345678', whatsappName: 'Ada' } });
  assertKeys(wallet, ['id', 'chain', 'publicKey', 'network', 'createdAt', 'userId']);
  assertKeys(wallet.userId, ['phoneNumber', 'whatsappName']);

  const transaction = toAdminTransaction({ id: 'tx-1', type: 'send', amount: '10', asset: 'USDC', destination: 'GDESTINATION123456', explorerUrl: 'https://example.test/tx', status: 'success', createdAt: 'date', metadata: { secret: true }, recipientPhoneNumber: '+234', providerTransactionId: 'provider' });
  assertKeys(transaction, ['id', 'type', 'amount', 'asset', 'destination', 'explorerUrl', 'status', 'createdAt', 'userId']);

  const kyc = toAdminKyc({ id: 'kyc-1', provider: 'smileid', tier: 1, status: 'review', riskScore: 2, sanctionsStatus: 'cleared', custodyStatus: 'approved', updatedAt: 'date', metadata: { raw: true }, providerReference: 'provider', deniedReason: 'private', user: { phoneNumber: '+2348012345678' } });
  assertKeys(kyc, ['id', 'provider', 'tier', 'status', 'riskScore', 'sanctionsStatus', 'custodyStatus', 'updatedAt', 'userId']);
});
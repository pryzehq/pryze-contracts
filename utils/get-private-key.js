const Wallet = require('ethereumjs-wallet');
const fs = require('fs');
const path = require('path');
const keystore = path.resolve('.keys');

module.exports = function (address, passphrase) {
  const fname = keystore + '/' + address + '.json';

  if (!fs.existsSync(fname)) {
    throw 'No wallet found';
  }
  const encrypted = fs.readFileSync(fname, 'utf-8');
  const wallet = Wallet.fromV3(encrypted, passphrase);
  return wallet.getPrivateKey().toString('hex');
};

const Wallet = require('ethereumjs-wallet');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const keystore = path.resolve('.keys');
const logger = require('../utils/le');

if (!fs.existsSync(keystore))
  fs.mkdirSync(keystore);

inquirer.prompt([
  { type: 'password', name: 'password', message: 'Password' }
]).then(answers => {
  logger.log('Creating Wallet...');
  const wallet = Wallet.generate();
  logger.log('Wallet Created:');
  logger.log('Address:', '0x' + wallet.getAddress().toString('hex'));
  // logger.log(wallet.mnemonic.toLowerCase());
  logger.log('Encrypting...');
  return wallet.toV3(answers.password);
}).then(v3 => {
  const address = '0x' + v3.address;
  const fname = path.join(keystore, (address + '.json').toLowerCase());
  fs.writeFileSync(fname, JSON.stringify(v3));
  logger.log('Encrypted wallet stored in', fname);
});

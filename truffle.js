require('babel-register');
require('babel-polyfill');
let Web3 = require('web3');
require('dotenv').config()

const getPrivateKey = require('./utils/get-private-key.js');

const HDWalletProvider = require('./utils/truffle-provider');

const provider = (url) => {
  const address = process.env.ADDRESS;
  const password = process.env.PASSWORD;
  let privateKey;
  if (process.env.PRIVATE_KEY) {
    privateKey = process.env.PRIVATE_KEY;
  } else if (address && password){
    privateKey = getPrivateKey(address, password);
  }

  if (privateKey) {
    Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

    let providerObject = new HDWalletProvider(privateKey, url);

    if (typeof providerObject.sendAsync !== 'function') {
      providerObject.sendAsync = function () {
        return providerObject.send.apply(providerObject, arguments);
      };
    }

    return providerObject;
  } else {
    return null;
  }
};

module.exports = {
  networks: {
    testrpc: {
      network_id: 'default'
    },
    development: { // truffle test hardcodes the "test" network.
      host: 'localhost',
      port: '8545',
      network_id: 'default',
      before_timeout: 100000000,          //  <=== NEW
      test_timeout: 300000000,             //  <=== NEW
      gas: 4500000
    },
    privateChain: {
      host: 'localhost',
      port: '7545',
      network_id: '25034',
      before_timeout: 100000000,
      test_timeout: 300000000,
      gas: 4500000
    },
    devSide: { // truffle test hardcodes the "test" network.
      host: 'localhost',
      port: '8545',
      network_id: '2',
      before_timeout: 100000000,          //  <=== NEW
      test_timeout: 300000000,             //  <=== NEW
      gas: 4500000
    },
    devMain: { // truffle test hardcodes the "test" network.
      host: 'localhost',
      port: '8546',
      network_id: '3',
      before_timeout: 100000000,          //  <=== NEW
      test_timeout: 300000000,             //  <=== NEW
      gas: 4500000
    },
    mainnet: {
      gas: 6000000,
      network_id: 1,
      provider: provider('https://mainnet.infura.io/' + process.env.INFURA),
    },
    prodSide: {
      host: 'localhost',
      port: '8545',
      network_id: '25034',
      before_timeout: 100000000,          //  <=== NEW
      test_timeout: 300000000,             //  <=== NEW
      gas: 4500000
    },
  },
  mocha: {
    useColors: true,
    timeout: 0
  }
}

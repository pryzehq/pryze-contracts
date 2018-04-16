let Web3 = require('web3');
const getPrivateKey = require('./get-private-key.js');
const HDWalletProvider = require('./truffle-provider');

function initProvider (url, address, password, privateKey) {
  let key;
  if (privateKey) {
    key = privateKey;
  } else if (address && password) {
    key = getPrivateKey(address, password);
  }

  if (key) {
    Web3.providers.HttpProvider.prototype.sendAsync = Web3.providers.HttpProvider.prototype.send;

    let providerObject = new HDWalletProvider(key, url);

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

module.exports = initProvider;

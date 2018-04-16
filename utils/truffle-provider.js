// adapted from truffle-hdwallet-provider

var Wallet = require('ethereumjs-wallet');
var ProviderEngine = require('web3-provider-engine');
var FiltersSubprovider = require('web3-provider-engine/subproviders/filters.js');
var WalletSubprovider = require('web3-provider-engine/subproviders/wallet.js');
var Web3Subprovider = require('web3-provider-engine/subproviders/web3.js');
var Web3 = require('web3');

function HDWalletProvider(privKey, provider_url, address_index = 0) {

  if (privKey.startsWith('0x')) {
    privKey = privKey.slice(2);
  }

  this.privateKey = new Buffer(privKey, 'hex');

  this.wallet = Wallet.fromPrivateKey(this.privateKey);

  this.address = '0x' + this.wallet.getAddress().toString('hex');

  this.engine = new ProviderEngine();
  this.engine.addProvider(new WalletSubprovider(this.wallet, {}));
  this.engine.addProvider(new FiltersSubprovider());
  this.engine.addProvider(new Web3Subprovider(new Web3.providers.HttpProvider(provider_url)));
  this.engine.start(); // Required by the provider engine.
}

HDWalletProvider.prototype.sendAsync = function() {
  this.engine.sendAsync.apply(this.engine, arguments);
};

HDWalletProvider.prototype.send = function() {
  return this.engine.send.apply(this.engine, arguments);
};

HDWalletProvider.prototype.getAddress = function() {
  return this.address;
};

module.exports = HDWalletProvider;

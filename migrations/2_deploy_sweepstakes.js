var SweepstakesFactory = artifacts.require('SweepstakesFactory');
var MockSweepstakesFactory = artifacts.require('MockSweepstakesFactory');
var PryzeToken = artifacts.require('PryzeToken');
var PryzeSilverToken = artifacts.require('PryzeSilverToken');
var SweepstakesEntries = artifacts.require('SweepstakesEntries');
var SweepstakesFactoryVersions = artifacts.require('SweepstakesFactoryVersions');
const BigNumber = require('bignumber.js');

const PRYZE_GOLD_INIT_VAL = new BigNumber(1e27, 10);
const PRYZE_SILVER_INIT_VAL = new BigNumber(1e27, 10);

module.exports = function(deployer, network) {
  let previouslyUsedTokens = 0;
  if (network === 'devMain' || network === 'stagingMain' || network === 'privateChain') {
    deployer.deploy(PryzeToken, PRYZE_GOLD_INIT_VAL).then(function () {
      return deployer.deploy(MockSweepstakesFactory, PryzeToken.address, previouslyUsedTokens);
    })
  }

  if (network === 'development' || network === 'devSide' || network === 'prodSide' || network === 'stagingSide') {
    deployer.deploy(PryzeSilverToken, PRYZE_SILVER_INIT_VAL).then(function () {
      return deployer.deploy(SweepstakesEntries, PryzeSilverToken.address);
    })
  }

  if (network === 'mainnet') {
    let previouslyUsedTokens = 0;
    deployer.deploy(SweepstakesFactory, '0x6b834f43B7f5a1644e0C81CaA0246969dA23105e', previouslyUsedTokens).then(function () {
      // remove after first deploy
      return deployer.deploy(SweepstakesFactoryVersions);
    });
  }

  // After deploying SweepstakesFactoryVersions change this logic to run using the contract address:
  // SweepstakesFactoryVersions.publishNewVersion(SweepstakesFactory.address, 'v2.0',
  //                                              'changes to RejectCall and ApproveCalls')
}

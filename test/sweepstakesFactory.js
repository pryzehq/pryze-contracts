const PryzeTokenAbstraction = artifacts.require('PryzeToken');
const SweepstakesFactoryAbstraction = artifacts.require('MockSweepstakesFactory');
const BigNumber = require('bignumber.js');

let PRYZ_GOLD;

contract('SweepstakesFactory', function (accounts) {

  const PRYZE_GOLD_INIT_VAL = new BigNumber(1e27, 10);
  const COST_OF_SWEEPSTAKES = new BigNumber(30030e18, 10);

  beforeEach(async () => {
    PRYZ_GOLD = await PryzeTokenAbstraction.new(PRYZE_GOLD_INIT_VAL, {from: accounts[0]});
  });

  it('Test that totalUsed tokens get updated after deployment', async () => {
    let previouslyUsedTokens = new BigNumber(6.9297941823960128793386e22, 10);
    let SWEEP_FACTORY = await SweepstakesFactoryAbstraction.new(PRYZ_GOLD.address, previouslyUsedTokens, {from: accounts[0]});
    let response = await SWEEP_FACTORY.getTotalUsedTokens.call();
    assert(response.toNumber() === previouslyUsedTokens.toNumber());

    await PRYZ_GOLD.approve(SWEEP_FACTORY.address, COST_OF_SWEEPSTAKES);
    await SWEEP_FACTORY.createNewSweepstakes(
      'test',
      'test',
      'test',
      'test',
      'test',
      Date.now(),
      Date.now(),
      {from: accounts[0]});

    let balanceResponse = await PRYZ_GOLD.balanceOf.call(accounts[0]);
    let firstDeductedTokens = new BigNumber(3 * (PRYZE_GOLD_INIT_VAL - previouslyUsedTokens) / 1000 / 100, 10);
    assert(balanceResponse.toNumber() === (PRYZE_GOLD_INIT_VAL - firstDeductedTokens));

    balanceResponse = await PRYZ_GOLD.balanceOf.call(SWEEP_FACTORY.address);
    assert(balanceResponse.toNumber() === (firstDeductedTokens * 99 / 100));

    balanceResponse = await PRYZ_GOLD.balanceOf.call('0x70A5B9f9abEf6154D34B79128081823257A025F3');
    assert(balanceResponse.toNumber() === (firstDeductedTokens / 100));


  });

});

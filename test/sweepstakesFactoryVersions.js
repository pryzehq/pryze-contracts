const expectThrow = require('./utils').expectThrow;
const SweepstakesFactoryVersionsAbstraction = artifacts.require('SweepstakesFactoryVersions');
const PryzeTokenAbstraction = artifacts.require('PryzeToken');
const SweepstakesFactoryAbstraction = artifacts.require('MockSweepstakesFactory');

let CONTRACT;
let PRYZ_GOLD;
let SWEEP_FACTORY;

contract('SweepstakesFactoryVersions', function (accounts) {

  const PRYZE_GOLD_INIT_VAL = 10000000;

  beforeEach(async () => {
    CONTRACT = await SweepstakesFactoryVersionsAbstraction.new({from: accounts[0]});
    PRYZ_GOLD = await PryzeTokenAbstraction.new(PRYZE_GOLD_INIT_VAL, {from: accounts[0]});
    SWEEP_FACTORY = await SweepstakesFactoryAbstraction.new(PRYZ_GOLD.address, 0, {from: accounts[0]});
  });

  it('SweepstakesFactoryVersions test: should publish a new version', async () => {
    let response = await CONTRACT.publishNewVersion(SWEEP_FACTORY.address, 'v1.0.0', 'first version', {from: accounts[0]});
    let getResponse = await CONTRACT.getAddressOfLastVersion.call();
    assert(getResponse===SWEEP_FACTORY.address);
    getResponse = await CONTRACT.getVersionName.call(SWEEP_FACTORY.address);
    assert(getResponse=== 'v1.0.0');
    getResponse = await CONTRACT.getVersionDescription.call(SWEEP_FACTORY.address);
    assert(getResponse=== 'first version');

    // 2nd version
    let SWEEP_FACTORY2 = await SweepstakesFactoryAbstraction.new(PRYZ_GOLD.address, 0, {from: accounts[0]});
    console.log(SWEEP_FACTORY2.address);
    await CONTRACT.publishNewVersion(SWEEP_FACTORY2.address, 'v2.0.0', 'Second version', {from: accounts[0]});
    getResponse = await CONTRACT.getAddressOfLastVersion.call();
    assert(getResponse===SWEEP_FACTORY2.address);
    getResponse = await CONTRACT.getVersionsCount.call();
    assert(getResponse.toNumber()===2);
    // v1
    getResponse = await CONTRACT.getVersionName.call(SWEEP_FACTORY.address);
    assert(getResponse=== 'v1.0.0');
    getResponse = await CONTRACT.getVersionDescription.call(SWEEP_FACTORY.address);
    assert(getResponse=== 'first version');
    // v2
    getResponse = await CONTRACT.getVersionName.call(SWEEP_FACTORY2.address);
    assert(getResponse=== 'v2.0.0');
    getResponse = await CONTRACT.getVersionDescription.call(SWEEP_FACTORY2.address);
    assert(getResponse=== 'Second version');

    getResponse = await CONTRACT.getAddressOfIndex.call(0);
    assert(getResponse===SWEEP_FACTORY.address);
    getResponse = await CONTRACT.getAddressOfIndex.call(1);
    assert(getResponse===SWEEP_FACTORY2.address);
  });

  it('SweepstakesFactoryVersions test: should not allow publish from another address than the owner', async () => {
    let response = await CONTRACT.publishNewVersion(SWEEP_FACTORY.address, 'v1.0.0', 'first version', {from: accounts[0]});
    let getResponse = await CONTRACT.getAddressOfLastVersion.call();
    assert(getResponse===SWEEP_FACTORY.address);
    getResponse = await CONTRACT.getVersionName.call(SWEEP_FACTORY.address);
    assert(getResponse=== 'v1.0.0');
    getResponse = await CONTRACT.getVersionDescription.call(SWEEP_FACTORY.address);
    assert(getResponse=== 'first version');

    // 2nd version
    let SWEEP_FACTORY2 = await SweepstakesFactoryAbstraction.new(PRYZ_GOLD.address, 0, {from: accounts[0]});
    await expectThrow(CONTRACT.publishNewVersion(SWEEP_FACTORY2.address, 'v2.0.0', 'Second version', {from: accounts[1]}));
  });

});

let sha3 = require('solidity-sha3');

const PryzeSilverTokenAbstraction = artifacts.require('PryzeSilverToken');
const SweepstakesEntriesAbstraction = artifacts.require('SweepstakesEntries');

let PRYZ_SILVER;
let SWEEPSTAKES_ENTRIES;

contract('SweepstakesEntries', function (accounts) {
  const PRYZE_SILVER_INIT_VAL = 1000000000;


  beforeEach(async () => {
    PRYZ_SILVER = await PryzeSilverTokenAbstraction.new(PRYZE_SILVER_INIT_VAL, {from: accounts[0]});
    SWEEPSTAKES_ENTRIES = await SweepstakesEntriesAbstraction.new(PRYZ_SILVER.address, {from: accounts[0]})
  });

  it('PrizeSilver test: should hold value, approve and transferFrom', async () => {
    let AMOUNT = 100000;
    let balanceResponse = await PRYZ_SILVER.balanceOf.call(accounts[0]);
    assert(balanceResponse.toNumber() === PRYZE_SILVER_INIT_VAL);

    let approveResponse = await PRYZ_SILVER.approve(accounts[1], AMOUNT, {from: accounts[0]});

    let transferResponse = await PRYZ_SILVER.transferFrom(accounts[0], accounts[1], AMOUNT, {from: accounts[1]});

    balanceResponse = await PRYZ_SILVER.balanceOf.call(accounts[0]);
    assert(balanceResponse.toNumber() === (PRYZE_SILVER_INIT_VAL - AMOUNT));

    balanceResponse = await PRYZ_SILVER.balanceOf.call(accounts[1]);
    assert(balanceResponse.toNumber() === AMOUNT)
  })

  it('SweepstakesEntries creates entries for sweepstakes', async () => {

    let approvalResponse = await PRYZ_SILVER.approve(SWEEPSTAKES_ENTRIES.address, PRYZE_SILVER_INIT_VAL, {from: accounts[0]});
    let allowanceResponse = await PRYZ_SILVER.allowance.call(accounts[0], SWEEPSTAKES_ENTRIES.address);
    assert(allowanceResponse.toNumber() === PRYZE_SILVER_INIT_VAL);

    let sweepstakesId = 1
    let emailHash = sha3.default('test@test.com');
    let emailHash2 = sha3.default('test2@test.com');

    // TEST we can add entries
    let addEntrantResponse = await SWEEPSTAKES_ENTRIES.addEntrant(sweepstakesId, emailHash, accounts[1]);
    addEntrantResponse = await SWEEPSTAKES_ENTRIES.addEntrant(sweepstakesId, emailHash2, accounts[1]);
    console.log(addEntrantResponse);
    let entriesCountResponse = await SWEEPSTAKES_ENTRIES.getTotalNumberEntries.call(sweepstakesId, {from: accounts[0]});
    console.log(entriesCountResponse);
    assert(entriesCountResponse.toNumber() === 2);

    // TEST if we retrieve an email hash entry
    let winningEmailHash = await SWEEPSTAKES_ENTRIES.getEntrantEmailHash.call(sweepstakesId, 0, {from: accounts[0]});
    console.log(winningEmailHash);
    assert(winningEmailHash === emailHash);
  })
});

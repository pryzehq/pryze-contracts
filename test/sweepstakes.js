const expectThrow = require('./utils').expectThrow;
const PryzeTokenAbstraction = artifacts.require('PryzeToken');
const PryzeSilverTokenAbstraction = artifacts.require('PryzeSilverToken');
const PryzeSweepstakesAbstraction = artifacts.require('PryzeSweepstakes');
const SweepstakesEntriesAbstraction = artifacts.require('SweepstakesEntries');
const SweepstakesFactoryAbstraction = artifacts.require('MockSweepstakesFactory');

let PRYZ_SILVER;
let PRYZ_GOLD;
let SWEEP_FACTORY;
let PRYZ_GOLD_LOW;
let SWEEPSTAKES_ENTRIES;

contract('PryzeToken', function (accounts) {
  const NAME = 'Gameflip Sweepstakes 1';
  const SPONSOR_NAME = 'Gameflip';
  const SPONSOR_TERMS_URL = 'https://example.com/terms';
  const CONTACT_INFORMATION = 'test@pryze.com';
  const PRIZE_DESCRIPTION = 'You might win something cool';
  const START_TIME = Date.now();
  const END_TIME = (new Date()).setDate((new Date()).getDate() + 1);
  const PRYZE_GOLD_INIT_VAL = 10000000;
  const PRYZE_SILVER_INIT_VAL = 1000000000;
  const COST_OF_SWEEPSTAKES = 100000;

  beforeEach(async () => {
    PRYZ_GOLD = await PryzeTokenAbstraction.new(PRYZE_GOLD_INIT_VAL, {from: accounts[0]});
    PRYZ_GOLD_LOW = await PryzeTokenAbstraction.new(10, {from: accounts[0]});
    SWEEP_FACTORY = await SweepstakesFactoryAbstraction.new(PRYZ_GOLD.address, 0, {from: accounts[0]});
    PRYZ_SILVER = await PryzeSilverTokenAbstraction.new(PRYZE_SILVER_INIT_VAL, {from: accounts[0]});
    SWEEPSTAKES_ENTRIES = await SweepstakesEntriesAbstraction.new(PRYZ_SILVER.address, {from: accounts[0]});
  });

  it('PrizeGold test: should hold value, approve and transferFrom', async () => {
    let AMOUNT = 100000;
    let balanceResponse = await PRYZ_GOLD.balanceOf.call(accounts[0]);
    assert(balanceResponse.toNumber() === PRYZE_GOLD_INIT_VAL);

    let approveResponse = await PRYZ_GOLD.approve(accounts[1], AMOUNT, {from: accounts[0]});

    let transferResponse = await PRYZ_GOLD.transferFrom(accounts[0], accounts[1], AMOUNT, {from: accounts[1]});

    balanceResponse = await PRYZ_GOLD.balanceOf.call(accounts[0]);
    assert(balanceResponse.toNumber() === (PRYZE_GOLD_INIT_VAL - AMOUNT));

    balanceResponse = await PRYZ_GOLD.balanceOf.call(accounts[1]);
    assert(balanceResponse.toNumber() === AMOUNT);
  });

  it('Sweepstakes factory creates a new sweepstakes', async () => {

    let approvalResponse = await PRYZ_GOLD.approve(SWEEP_FACTORY.address, COST_OF_SWEEPSTAKES);
    let allowanceResponse = await PRYZ_GOLD.allowance.call(accounts[0], SWEEP_FACTORY.address);
    assert(allowanceResponse.toNumber() === COST_OF_SWEEPSTAKES);

    let newSweepstakesResponse = await SWEEP_FACTORY.createNewSweepstakes(
        NAME,
        SPONSOR_NAME,
        SPONSOR_TERMS_URL,
        CONTACT_INFORMATION,
        PRIZE_DESCRIPTION,
        START_TIME,
        END_TIME,
        {from: accounts[0]});

    // console.log(newSweepstakesResponse)
    const newSweepEvent = newSweepstakesResponse.logs.find(x => x.event === 'NewSweepstakesCreated');
    const newSweepAddr = newSweepEvent.args.addr;
    console.log(newSweepAddr);
    assert(newSweepAddr);

    let balanceResponse = await PRYZ_GOLD.balanceOf.call(accounts[0]);
    let totalUsedTokens = 0;
    let firstDeductedTokens = Math.floor(3 * (PRYZE_GOLD_INIT_VAL - totalUsedTokens) / 1000 / 100);
    assert(balanceResponse.toNumber() === (PRYZE_GOLD_INIT_VAL - firstDeductedTokens));

    balanceResponse = await PRYZ_GOLD.balanceOf.call(SWEEP_FACTORY.address);
    assert(balanceResponse.toNumber() === Math.floor(firstDeductedTokens * 99 / 100));


    let sweepstakes = PryzeSweepstakesAbstraction.at(newSweepAddr);
    let dataResponse = await sweepstakes.getName.call();
    console.log(dataResponse);
    assert(dataResponse === NAME);

    let blockNumber = web3.eth.blockNumber;
    let blockHash = web3.eth.getBlock(blockNumber).hash;
    let timestamp = web3.eth.getBlock(blockNumber).timestamp;
    let entriesCount = 45;

    let setWinnerPickDataResponse = await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp);
    console.log(setWinnerPickDataResponse);

    let decideWinnerResponse = await sweepstakes.decideWinner();
    console.log(decideWinnerResponse);
    let decidedWinnerEvent = decideWinnerResponse.logs.find(x => x.event === 'DecidedWinner');
    let winnerIndex = decidedWinnerEvent.args.winnerIndex;
    console.log(winnerIndex.toString());
    assert(winnerIndex > 0 && winnerIndex <= entriesCount);

    let acceptWinnerResponse = await sweepstakes.acceptWinner(web3.fromAscii('0x8978659838901989'));
    console.log(acceptWinnerResponse);
    let acceptedWinnerEvent = acceptWinnerResponse.logs.find(x => x.event === 'AcceptedWinner');
    winnerIndex = acceptedWinnerEvent.args.winnerIndex;
    console.log(winnerIndex.toString());
    assert(winnerIndex > 0 && winnerIndex <= entriesCount);

    // verify that winnerTransactionHash is saved
    const winnerTransactionHash = await sweepstakes.winnerTransactionHash.call();
    console.log('winnerTransactionHash: ', web3.toAscii(winnerTransactionHash));
    assert.equal(web3.toAscii(winnerTransactionHash).replace(/\u0000/g, ''), '0x8978659838901989');
  });

  it('accepts winner without transaction hash', async () => {
    await PRYZ_GOLD.approve(SWEEP_FACTORY.address, COST_OF_SWEEPSTAKES);
    const newSweepstakesResponse = await SWEEP_FACTORY.createNewSweepstakes(
      NAME,
      SPONSOR_NAME,
      SPONSOR_TERMS_URL,
      CONTACT_INFORMATION,
      PRIZE_DESCRIPTION,
      START_TIME,
      END_TIME,
      {from: accounts[0]}
    );
    const newSweepEvent = newSweepstakesResponse.logs.find(x => x.event === 'NewSweepstakesCreated');
    const newSweepAddr = newSweepEvent.args.addr;
    let sweepstakes = PryzeSweepstakesAbstraction.at(newSweepAddr);
    let blockNumber = web3.eth.blockNumber;
    let blockHash = web3.eth.getBlock(blockNumber).hash;
    let timestamp = web3.eth.getBlock(blockNumber).timestamp;
    await sweepstakes.setWinnerPickData(35, blockHash, blockNumber, timestamp);
    await sweepstakes.decideWinner();
    await sweepstakes.contract.acceptWinner[''].call({from: accounts[0]});
    const winnerTransactionHash = await sweepstakes.winnerTransactionHash.call();
    assert.equal(web3.toAscii(winnerTransactionHash).replace(/\u0000/g, ''), '');
  });

  it('sweepstakes factory throws a revert when balance is too low', async () => {
    const approvalResponse = await PRYZ_GOLD_LOW.approve(SWEEP_FACTORY.address, COST_OF_SWEEPSTAKES);
    const allowanceResponse = await PRYZ_GOLD_LOW.allowance.call(accounts[0], SWEEP_FACTORY.address);

    await expectThrow(SWEEP_FACTORY.createNewSweepstakes(
      NAME,
      SPONSOR_NAME,
      SPONSOR_TERMS_URL,
      CONTACT_INFORMATION,
      PRIZE_DESCRIPTION,
      START_TIME,
      END_TIME,
      {from: accounts[0]}))
  });

  it('rejects a winner with reject reason', async () => {
    await PRYZ_GOLD.approve(SWEEP_FACTORY.address, COST_OF_SWEEPSTAKES);
    const newSweepstakesResponse = await SWEEP_FACTORY.createNewSweepstakes(
      NAME,
      SPONSOR_NAME,
      SPONSOR_TERMS_URL,
      CONTACT_INFORMATION,
      PRIZE_DESCRIPTION,
      START_TIME,
      END_TIME,
      {from: accounts[0]}
    );
    const newSweepstakesEvent = newSweepstakesResponse.logs.find(x => x.event === 'NewSweepstakesCreated');
    const newSweepstakesAddress = newSweepstakesEvent.args.addr;
    const sweepstake = PryzeSweepstakesAbstraction.at(newSweepstakesAddress);
    const name = await sweepstake.getName.call();
    assert(name === NAME);

    let blockNumber = web3.eth.blockNumber;
    let blockHash = web3.eth.getBlock(blockNumber).hash;
    let timestamp = web3.eth.getBlock(blockNumber).timestamp;
    let entriesCount = 45;

    await sweepstake.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp);

    let decideWinnerResponse = await sweepstake.decideWinner();
    let decidedWinnerEvent = decideWinnerResponse.logs.find(x => x.event === 'DecidedWinner');
    let winnerIndex = decidedWinnerEvent.args.winnerIndex;
    console.log(winnerIndex.toString());
    assert(winnerIndex >= 0 && winnerIndex <= entriesCount);

    const shouldAcceptOrRejectWinner = await sweepstake.shouldAcceptOrRejectWinner.call();
    console.log(shouldAcceptOrRejectWinner);
    const acceptedWinner = await sweepstake.acceptedWinner.call();
    console.log(acceptedWinner);
    await sweepstake.rejectWinner(web3.fromAscii('Winner is not from US'));

    const rejectedWinner = await sweepstake.lastRejectedWinnerEntryIndex.call();
    console.log(rejectedWinner);
    const rejectReason = await sweepstake.getRejectReasonForIndex.call(rejectedWinner, {gas: 100000, from: accounts[0]});
    // toAscii adds \u0000 for unset bytes
    // remove \u0000 to get correct string
    assert.equal(web3.toAscii(rejectReason).replace(/\u0000/g, ''), 'Winner is not from US');
  });
});

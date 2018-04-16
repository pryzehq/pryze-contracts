const expectThrow = require('./utils').expectThrow;
const PryzeTokenAbstraction = artifacts.require('PryzeToken');
const SweepstakesFactoryAbstraction = artifacts.require('MockSweepstakesFactory');
const PryzeSweepstakesAbstraction = artifacts.require('PryzeSweepstakes');

let PRYZ_GOLD;
let SWEEP_FACTORY;

contract('SweepstakesFactory', function (accounts) {

  const PRYZE_GOLD_INIT_VAL = 10000000;
  const COST_OF_SWEEPSTAKES = 30000;
  let newSweepstakesResponse;
  let newSweepstakesEvent;
  let sweepstakes;
  const entriesCount = 45;
  let blockNumber;
  let blockHash;
  let timestamp;

  beforeEach(async () => {
    PRYZ_GOLD = await PryzeTokenAbstraction.new(PRYZE_GOLD_INIT_VAL, {from: accounts[0]});
    SWEEP_FACTORY = await SweepstakesFactoryAbstraction.new(PRYZ_GOLD.address, 0, {from: accounts[0]});
    // Accounts: 0: FactoryOwner, 1: sponsor, 2: hacker
    let AMOUNT = 100000;
    await PRYZ_GOLD.transfer(accounts[1], AMOUNT, {from: accounts[0]});
    await PRYZ_GOLD.approve(SWEEP_FACTORY.address, COST_OF_SWEEPSTAKES, {from: accounts[1]});
    newSweepstakesResponse = await SWEEP_FACTORY.createNewSweepstakes(
      'test',
      'test',
      'test',
      'test',
      'test',
      Date.now(),
      Date.now(),
      {from: accounts[1]}
    );
    newSweepstakesEvent = newSweepstakesResponse.logs.find(x => x.event === 'NewSweepstakesCreated');
    sweepstakes = PryzeSweepstakesAbstraction.at(newSweepstakesEvent.args.addr);
    blockNumber = web3.eth.blockNumber;
    blockHash = web3.eth.getBlock(blockNumber).hash;
    timestamp = web3.eth.getBlock(blockNumber).timestamp;
  });

  it('should allow setWinnerPickData call for the pryzeOwner', async () => {
     sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
  });

  it('should reject setWinnerPickData call for the sponsor', async () => {
    await expectThrow(sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[1]}));
  });

  it('should reject setWinnerPickData call for the hacker', async () => {
    await expectThrow(sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[2]}));
  });

  it('should allow decideWinner call for the pryzeOwnerr', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[0]});
  });

  it('should allow decideWinner call for the sponsor', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
  });

  it('should reject decideWinner call for the hacker', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await expectThrow(sweepstakes.decideWinner({from: accounts[2]}));
  });

  it('should allow rejectWinner call for the sponsor', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
    await sweepstakes.rejectWinner('Reject reason', {from: accounts[1]});
  });

  it('should reject rejectWinner call for the pryzeOwner', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
    await expectThrow(sweepstakes.rejectWinner('Reject reason', {from: accounts[0]}));
  });

  it('should reject rejectWinner call for the hacker', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
    await expectThrow(sweepstakes.rejectWinner('Reject reason', {from: accounts[2]}));
  });

  it('should allow acceptWinner call for the sponsor', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
    await sweepstakes.acceptWinner('Tx hash', {from: accounts[1]});
  });

  it('should reject acceptWinner call for the pryzeOwner', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
    await expectThrow(sweepstakes.acceptWinner('Tx hash', {from: accounts[0]}));
  });

  it('should reject acceptWinner call for the hacker', async () => {
    await sweepstakes.setWinnerPickData(entriesCount, blockHash, blockNumber, timestamp, {from: accounts[0]});
    await sweepstakes.decideWinner({from: accounts[1]});
    await expectThrow(sweepstakes.acceptWinner('Tx hash', {from: accounts[2]}));
  });
});

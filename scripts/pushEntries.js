let sha3 = require('solidity-sha3');
let db = require('../utils/postgresPool');
let Web3 = require('web3');
let keepAliveLog = require('../utils/keepalive');

require('dotenv').config({path: '../'});
const logger = console;

const SweepstakesEntriesAbstraction = artifacts.require('SweepstakesEntries');
const PryzeSilverTokenAbstraction = artifacts.require('PryzeSilverToken');
const PryzeSweepstakesAbstraction = artifacts.require('PryzeSweepstakes');

const initProvider = require('../utils/initProvider');
const unlockAllAccounts = require('../utils/unlockAccounts');

const findWinningEntry = require('./gateway').findWinningEntry;

let SWEEPSTAKES_ENTRIES;
let PRYZ_SILVER;

const SIDE_PROVIDER_URL = process.env.SIDE_PROVIDER_URL;
const SIDE_NETWORK_ID = process.env.SIDE_NETWORK_ID;
const MAIN_PROVIDER_URL = process.env.MAIN_PROVIDER_URL;
const MAIN_NETWORK_ID = process.env.MAIN_NETWORK_ID;

const findNewEntriesQuery = require('../queries/entries').findNewEntries;
const setInvalidReasonQuery = require('../queries/entries').setInvalidReason;

module.exports = async (callback) => {
  try {
    let provider = new Web3.providers.HttpProvider(SIDE_PROVIDER_URL);
    // dirty hack for web3@1.0.0 support for localhost testrpc,
    // see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
    if (typeof provider.sendAsync !== 'function') {
      provider.sendAsync = function () {
        return provider.send.apply(provider, arguments);
      };
    }
    let web3 = new Web3(provider);
    let accounts = await web3.eth.getAccounts();
    if (process.env.ENV === 'prod') {
      await unlockAllAccounts(web3, accounts);
    }

    PryzeSilverTokenAbstraction.setProvider(provider);
    PryzeSilverTokenAbstraction.setNetwork(SIDE_NETWORK_ID);
    SweepstakesEntriesAbstraction.setProvider(provider);
    SweepstakesEntriesAbstraction.setNetwork(SIDE_NETWORK_ID);

    if (process.env.ENV === 'prod') {
      PRYZ_SILVER = await PryzeSilverTokenAbstraction.at(process.env.PRYZE_SILVER_TOKEN_ADDRESS);
      SWEEPSTAKES_ENTRIES = await SweepstakesEntriesAbstraction.at(process.env.SWEEPSTAKES_ENTRIES_ADDRESS);
    } else {
      await PryzeSilverTokenAbstraction.detectNetwork();
      await SweepstakesEntriesAbstraction.detectNetwork();
      PRYZ_SILVER = await PryzeSilverTokenAbstraction.deployed();
      SWEEPSTAKES_ENTRIES = await SweepstakesEntriesAbstraction.deployed();
    }

    let response = await PRYZ_SILVER.approve(SWEEPSTAKES_ENTRIES.address, 1000000000, {from: accounts[0]});
    logger.log(response);

    async function loop () {

      keepAliveLog('pushEntriesProd.js loop() - checking for more entries');

      let conn;
      conn = await web3.eth.net.isListening();
      if(!conn) {
        logger.err('ERROR: Web3 provider is not connected!');
      }

      if(!web3.currentProvider) {
        logger.err('ERROR: Web3 provider is not set!');
      }

      let queryResult = await
        db.execute(findNewEntriesQuery);

      let rows = queryResult.rows;
      let lastEntryId = 0;

      for (let i = 0; i < rows.length; i++) {
        let sweepstakesId = rows[i].sweepstake_id;
        let email = rows[i].email;
        let emailHash = sha3.default(email);

        let entrantWalletAddress = rows[i].wallet;

        if (!web3.utils.isAddress(entrantWalletAddress)) {
          logger.log('Skipping user with wrong wallet - wallet: ' + entrantWalletAddress + ' email: ' + email);
          await handleInvalidEntry(db, rows[i]);
          continue;
        }

        if (entrantWalletAddress.length === 40) {
          entrantWalletAddress = '0x' + entrantWalletAddress;
        }
        logger.log('calling addEntrant with sId: ' + sweepstakesId + ' emailHash: ' + emailHash +
          ' entranceWallet: ' + entrantWalletAddress);

        try {
          let lastDecideWinnerResponse = await SWEEPSTAKES_ENTRIES.addEntrant(
            sweepstakesId,
            emailHash,
            entrantWalletAddress);
        }
        catch (err) {
          logger.error('Error on SWEEPSTAKES_ENTRIES.addEntrant ');
          logger.error(err);
          throw 'Error on SWEEPSTAKES_ENTRIES.addEntrant ';
        }

        lastEntryId = rows[i].id;
        queryResult = await
          db.execute(
            'INSERT into last_entries (entry_id, updated_at) VALUES (' + lastEntryId.toString() + ', NOW())');
        logger.log('last entry added: ' + lastEntryId);
      }

      queryResult = await
        db.execute('SELECT id, address FROM sweepstakes ' +
          'WHERE sweepstakes.pending_winning_entry_id IS NULL ' +
          'AND sweepstakes.end_date < now()');

      rows = queryResult.rows;
      let blockNumber = 0;
      let block = null;
      let blockHash = null;
      let timestamp = null;

      // Avoid calling eth functions all the time
      if (rows.length > 0) {
        blockNumber = await web3.eth.getBlockNumber();
        block = await web3.eth.getBlock(blockNumber);
        blockHash = block.hash;
        timestamp = block.timestamp;
      }

      for (let i = 0; i < rows.length; i++) {
        let sweepstakesId = rows[i].id;
        let sweepstakesAddress = rows[i].address;
        let entriesCountResponse = await SWEEPSTAKES_ENTRIES.getTotalNumberEntries.call(sweepstakesId, {from: accounts[0]});
        let entriesCount = parseInt(entriesCountResponse.toString());
        logger.log(blockNumber);
        logger.log(blockHash);
        logger.log('Entries count = ' + entriesCount);
        logger.log('Deciding winner for sweepstake at: ' + sweepstakesAddress);
        if (entriesCount > 0) {
          let winnerIndex = await pickWinners(sweepstakesAddress, entriesCount, blockHash, blockNumber, timestamp);
          logger.log('WinnerIdx for sweepstake at: ' + sweepstakesAddress + ' is: ' + winnerIndex.toString());
          if (winnerIndex >= 0) {
            let winningEmailHash = await SWEEPSTAKES_ENTRIES.getEntrantEmailHash.call(sweepstakesId, winnerIndex, {from: accounts[0]});
            logger.log('Found winning hash email for sweepstake at: ' + sweepstakesAddress + ' is: ' + winningEmailHash);
            let pendingWinningEntryId = await findWinningEntry(db, sweepstakesId, winningEmailHash);
            if (pendingWinningEntryId >= 0) {
              logger.log('Winning EntryId for sweepstake at: ' + sweepstakesAddress + ' is: ' + pendingWinningEntryId);
            }
          }
        }
      }
      setTimeout(loop, 5000);
    }

    async function pickWinners (sweepstakesAddress, entriesCount, blockHash, blockNumber, timestamp) {
      let provider = null
      if (process.env.ENV === 'prod') {
        provider = initProvider(MAIN_PROVIDER_URL, process.env.ADDRESS, process.env.PASSWORD, process.env.PRIVATE_KEY);
      } else {
        provider = new Web3.providers.HttpProvider(MAIN_PROVIDER_URL);
      }
      let web3 = new Web3(provider);
      let accounts = await web3.eth.getAccounts();

      // dirty hack for web3@1.0.0 support for localhost testrpc,
      // see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
      if (typeof provider.sendAsync !== 'function') {
        provider.sendAsync = function () {
          return provider.send.apply(provider, arguments);
        };
      }
      PryzeSweepstakesAbstraction.setProvider(provider);
      PryzeSweepstakesAbstraction.setNetwork(MAIN_NETWORK_ID);

      let sweepstakes = await PryzeSweepstakesAbstraction.at(sweepstakesAddress);

      let fromAccount = accounts[0];
      if (process.env.ENV === 'prod') {
        fromAccount = process.env.ADDRESS
      }

      let setWinnerPickDataResponse = await sweepstakes.setWinnerPickData(entriesCount, blockHash,
        blockNumber, timestamp, {from: fromAccount});
      logger.log(setWinnerPickDataResponse);

      // Set a good enough delay to make sure we call this in the next block
      let decideWinnerResponse = await sweepstakes.decideWinner({from: fromAccount});
      logger.log(decideWinnerResponse);
      let newEvent = decideWinnerResponse.logs.find(x => x.event === 'DecidedWinner');
      if (newEvent) {
        let winnerIndex = newEvent.args.winnerIndex;
        logger.log(winnerIndex.toString());
        return winnerIndex;
      } else {
        logger.error('No DecidedWinner winner event, check transaction');
        return -1;
      }
    }

    loop();

    callback();
  } catch (e) {
    logger.error(e);
  }
};

async function handleInvalidEntry (db, entry) {
  logger.log(`handing invalid entry id: ${entry.id}`);
  try {
    const response = await db.execute(setInvalidReasonQuery(entry.id));
    logger.log('Successfully update entry with invalid reason');
    logger.log(response);
  } catch (e) {
    logger.error(`Error while setting invalid reason on entry with id = ${entry.id}`);
    logger.error(e);
  }
}

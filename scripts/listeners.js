let Web3 = require('web3');
let keepAliveLog = require('../utils/keepalive');
let db = require('../utils/postgresPool');

require('dotenv').config({path: '../'});
const logger = console;

let SweepstakesFactoryArtifact = null;
if (process.env.ENV === 'prod') {
  SweepstakesFactoryArtifact = artifacts.require('SweepstakesFactory');
} else {
  SweepstakesFactoryArtifact = artifacts.require('MockSweepstakesFactory');
}
const PryzeSweepstakesAbstraction = artifacts.require('PryzeSweepstakes');
const SweepstakesEntriesAbstraction = artifacts.require('SweepstakesEntries');

const initProvider = require('../utils/initProvider');
const unlockAllAccounts = require('../utils/unlockAccounts');

const findWinningEntry = require('./gateway').findWinningEntry;

const SIDE_PROVIDER_URL = process.env.SIDE_PROVIDER_URL;
const SIDE_NETWORK_ID = process.env.SIDE_NETWORK_ID;
const MAIN_PROVIDER_URL = process.env.MAIN_PROVIDER_URL;
const MAIN_NETWORK_ID = process.env.MAIN_NETWORK_ID;
let SWEEPSTAKE_FACTORY;
let SWEEPSTAKES_ENTRIES;

// utils/records.js
const saveRecord = require('./records').saveRecords;
const getRecords = require('./records').getRecords;

// work with main network
let MAIN_WEB3;

// did the script process all blocks from
// records.lastBlockProcessedOnMainNetwork to 'latest'
// when the script started
let PROCESSED_BACKLOG_ON_MAIN_NETWORK = false;

module.exports = async (callback) => {
  try {
    let provider = null;
    if (process.env.ENV === 'prod') {
      provider = initProvider(MAIN_PROVIDER_URL, process.env.ADDRESS, process.env.PASSWORD, process.env.PRIVATE_KEY);
    } else {
      provider = new Web3.providers.HttpProvider(MAIN_PROVIDER_URL);
    }
    let sideProvider = new Web3.providers.HttpProvider(SIDE_PROVIDER_URL);
    // dirty hack for web3@1.0.0 support for localhost testrpc,
    // see https://github.com/trufflesuite/truffle-contract/issues/56#issuecomment-331084530
    if (typeof provider.sendAsync !== "function") {
      provider.sendAsync = function () {
        return provider.send.apply(provider, arguments);
      };
    }
    if (typeof sideProvider.sendAsync !== "function") {
      sideProvider.sendAsync = function () {
        return sideProvider.send.apply(sideProvider, arguments);
      };
    }

    let sideWeb3 = new Web3(sideProvider);
    let sideAccounts = await sideWeb3.eth.getAccounts();

    // set MAIN_WEB3
    MAIN_WEB3 = new Web3(provider);

    if (process.env.ENV === 'prod') {
      await unlockAllAccounts(sideWeb3, sideAccounts);
    }

    let SweepstakesFactory = SweepstakesFactoryArtifact;
    SweepstakesFactory.setProvider(provider);
    SweepstakesFactory.setNetwork(MAIN_NETWORK_ID);
    if (process.env.ENV === 'prod') {
      SWEEPSTAKE_FACTORY = await SweepstakesFactory.at(process.env.SWEEPSTAKES_FACTORY_ADDRESS);
    } else {
      await SweepstakesFactory.detectNetwork();
      SWEEPSTAKE_FACTORY = await SweepstakesFactory.deployed();
    }

    PryzeSweepstakesAbstraction.setProvider(provider);
    PryzeSweepstakesAbstraction.setNetwork(MAIN_NETWORK_ID);

    SweepstakesEntriesAbstraction.setProvider(sideProvider);
    SweepstakesEntriesAbstraction.setNetwork(SIDE_NETWORK_ID);

    if (process.env.ENV === 'prod') {
      SWEEPSTAKES_ENTRIES = await SweepstakesEntriesAbstraction.at(process.env.SWEEPSTAKES_ENTRIES_ADDRESS);
    } else {
      await PryzeSweepstakesAbstraction.detectNetwork();
      await SweepstakesEntriesAbstraction.detectNetwork();
      SWEEPSTAKES_ENTRIES = await SweepstakesEntriesAbstraction.deployed();
    }

    async function loop () {

      keepAliveLog('listener.js loop() - checking for more blocks');

      let conn;
      conn = await MAIN_WEB3.eth.net.isListening();
      if(!conn) {
        logger.error('ERROR: Web3 provider is not connected!');
      }

      if(!MAIN_WEB3.currentProvider) {
        logger.error('ERROR: Web3 provider is not set!');
      }

      const currentBlock = await MAIN_WEB3.eth.getBlockNumber();
      const lastBlockProcessed = getRecords().lastBlockProcessedOnMainNetwork;
      console.log('last  block processed: ' + lastBlockProcessed.toString() + ' current block: ' +
                   currentBlock);

      const events = SWEEPSTAKE_FACTORY.allEvents({
        fromBlock: lastBlockProcessed,
        toBlock: 'latest'
      }, function (err, result) {
        if (result.event === 'NewSweepstakesCreated') {
          logger.log('successfully Received NewSweepstakesCreated Event for sweepstake at ' + result.args.addr);
        }
      });

      let queryResult = await
        db.execute('SELECT * FROM sweepstakes ' +
          'WHERE sweepstakes.winning_entry_id IS NULL ' +
          'AND sweepstakes.address IS NOT NULL ');

      let rows = queryResult.rows;

      for (let i = 0; i < rows.length; i++) {
        let address = rows[i].address;
        let id = rows[i].id;
        let sweepstakes = PryzeSweepstakesAbstraction.at(address);
        sweepstakes.allEvents({
          fromBlock: lastBlockProcessed,
          toBlock: 'latest'
        }, async function(error, result) {
          if (result.event === 'DecidedWinner') {
            logger.log('successfully Received DecidedWinner Event for sweepstake at ' + result.args.addr);
            let winnerIndex = result.args.winnerIndex;
            logger.log('WinnerIdx for sweepstake at: ' + address + ' with id: ' + id + ' is: ' + winnerIndex.toString());
            if (winnerIndex >= 0) {
              let winningEmailHash = await SWEEPSTAKES_ENTRIES.getEntrantEmailHash.call(id, winnerIndex);
              logger.log('Found winning hash email for sweepstake at: ' + address + ' is: ' + winningEmailHash);
              let pendingWinningEntryId = await findWinningEntry(db, id, winningEmailHash);
              if (pendingWinningEntryId >= 0) {
                logger.log('Winning EntryId for sweepstake at: ' + address + ' is: ' + pendingWinningEntryId);
              }
            }
          }

          if (result.event === 'AcceptedWinner') {
            logger.log('successfully Received AcceptedWinner Event for sweepstake at ' + result.args.addr);
            let winnerIndex = result.args.winnerIndex;
            logger.log('Accepted WinnerIndexId: ' + winnerIndex.toString());
            if (winnerIndex >= 0) {
              let winningEmailHash = await SWEEPSTAKES_ENTRIES.getEntrantEmailHash.call(id, winnerIndex);
              logger.log('Found winning hash email for sweepstake at: ' + address + ' is: ' + winningEmailHash);
              let winningEntryId = await findWinningEntry(db, id, winningEmailHash);
              if (winningEntryId >= 0) {
                logger.log('Winning EntryId for sweepstake at: ' + address + ' is: ' + winningEntryId);
              }
            }
          }

          if (result.event === 'RejectedWinner') {
            logger.log('successfully Received RejectedWinner Event for sweepstake at ' + result.args.addr);
            logger.log('Rejected WinnerIndexId: ' + result.args.rejectedWinnerEntryIndex.toString());
          }
        });
      }


      await saveCurrentBlockNumberOnMainNetwork(currentBlock);
      setTimeout(loop, 300000); /* 5m */
    }
    loop();
    callback();
  } catch (e) {
    logger.error('Error in main function');
    logger.error(e);
  }
};

async function saveCurrentBlockNumberOnMainNetwork(currentBlock) {
  try {
    logger.log('Writing current block number: ' + currentBlock.toString());
    const previousRecords = getRecords();
    const newRecords = {
      ...previousRecords,
      lastBlockProcessedOnMainNetwork: currentBlock
    };
    saveRecord(newRecords);
  } catch (e) {
    logger.error('Error while fetching saving current block number on file');
    logger.error(e);
  }
}

# Pryze Smart Contracts

## This Repo has 3 components: 
* 1- Smart Contracts: Ethereum smart contracts for Pryze Sweepstakes and Pryze Tokens. Written in solidity and built using the truffle framework.
* 2- Tests: for the smart contracts. Written in JS using truffle.
* 3- Listeners: for Pryze smart contract events (e.g. picking a Sweepstakes winner). Written in JS using truffle.

## Note on Smart contracts
* We have 2 types of contracts: (1) The ones that run on the Main/Public Ethereum network and (2) the ones that run on a Side/Private Network
* Main: SweepstakesFactory, PryzeToken (and its dependencies)
* Side: SweepstakesEntries, PryzeSilver (and its dependencies)

## Setup
* Node version 8.4.0: nvm install v8.4.0
* Install ganache-cli (former testrpc): npm install -g ganache-cli
* This assumes you have postgres installed. Use the sampleDB.dump file to create the Database.
* npm install

## Run Tests on the test folder (need 2 terminal tabs/windows):
* ganache-cli (on tab 2)
* truffle test (on tab 1)

## Run/Deploy/Use Smart Contracts and Listeners on a Dev environment (need 6 terminal tabs)
* ganache-cli -p 8545 -i 2 (tab 2)
* ganache-cli -p 8546 -i 3 (tab 3)
* rm -rf build (tab 1)
* truffle compile (tab 1)
* truffle migrate --network devMain (on tab 1)
* truffle migrate --network devSide (tab 1)
* cp .env_local .env (and replace values for your DB, urls), (tab 1)
* truffle exec scripts/pushEntries.js (tab 4)
* truffle exec scripts/listeners.js (tab 5)

## Test creating a new sweepstake by: 

## Deploy a new version of smart-contracts repo on SideChain server
* clone a new clean repo (otherwise things like node_modules, .idea get synced)
* Use filezila to overwrite the folder or the new updated files.
* Make sure you have the new version of prod .env file on the repo root folder
* Make sure (or copy) the .keys folder with the private key on the repo root folder
* truffle compile

## Deploy new smart contracts on ethereum
* truffle migrate --network mainnet
* truffle migrate --network prodSide

## run on prod
* make sure side chain is up (ps aux | grep geth)
* if not run:
*    nohup geth --datadir ~/private-chain/ --networkid 25035 --rpcapi "admin,db,eth,debug,miner,net,shh,txpool,personal,web3" --rpccorsdomain "*" --rpc --rpcaddr "0.0.0.0" --nat "any" --mine --minerthreads=1 --rpcport 8545 —rpcvhosts "*" >geth-log.txt 2>&1 &
* cd pryze-smart-contracts
* make sure other truffle scripts are not running (ps aux | grep truffle) before the next commands, if so, kill those processes first:
* nohup truffle exec scripts/listeners.js --network prodSide &>> listenersOut.txt &
* nohup truffle exec scripts/pushEntries.js --network prodSide &>> pushEntriesOut.txt &

## Make sure miner is set to eth(0) and unlock accounts
* geth attach http://localhost:8545
* miner.setEtherbase(eth.accounts[0])
* function unlockAllAccounts() { for (var i = 0; i < 2; i++) { personal.unlockAccount(eth.accounts[i], "<YOURPASSWORD>", 60 * 60 * 100); } }; unlockAllAccounts();

## AWS Ubuntu code setup
* sudo apt-get update && sudo apt-get -y upgrade
* curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
* sudo apt-get install -y nodejs
* sudo apt-get install -y  build-essential
* sudo npm install -g truffle

## AWS Ubuntu geth setup
* sudo apt-get install software-properties-common
* sudo add-apt-repository -y ppa:ethereum/ethereum
* sudo apt-get update
* sudo apt-get install ethereum

## Create a new geth private chain (in case of lost data or bugs)
* sudo apt-get install software-properties-common
* sudo add-apt-repository -y ppa:ethereum/ethereum
* sudo apt-get update
* copy the following content to /home/ubuntu/private-chain/myGenesis.json:
{
   "config": {
      "chainId": 25035,
      "homesteadBlock": 0,
      "eip155Block": 0,
      "eip158Block": 0,
      "byzantiumBlock": 0
   },
   "difficulty": "400",
   "gasLimit": "4500000",
   "alloc": {
      "670e255686e2b761a2339f49060883bff173aca6": { 
          "balance": "100000000000000000000000" 
      },
      "acd070f9e27f6c0b0826b48460b69b6058acae22": { 
          "balance": "120000000000000000000000" 
      }
   }
}
* geth --datadir /home/ubuntu/private-chain init /home/ubuntu/private-chain/myGenesis.json

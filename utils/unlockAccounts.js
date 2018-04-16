require('dotenv').config({path: '../'});
async function unlockAccounts (web3, accounts) {
  for (var i = 0; i < 2; i++) {
    await web3.eth.personal.unlockAccount(accounts[i], process.env.WALLET_PASSWORD, 60 * 60 * 100);
  }
}

module.exports = unlockAccounts;

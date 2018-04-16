let sha3 = require('solidity-sha3');
require('dotenv').config({path: '../'});

module.exports = {
  findWinningEntry: async function (db, sweepstakeId, winningEmailHash) {
    let queryResult = await db.execute(
      'SELECT entries.id, users.email, users.wallet FROM entries\n' +
      'JOIN users on user_id = users.id\n' +
      'WHERE entries.sweepstake_id = ' + sweepstakeId +
      'ORDER BY entries.id ASC');

    let rows = queryResult.rows;

    for (let i = 0; i < rows.length; i++) {
      let entryEmail = rows[i].email;
      let emailHash = sha3.default(entryEmail);
      if (emailHash === winningEmailHash) {
        return rows[i].id;
      }
    }
    return -1;
  }
};

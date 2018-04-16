let moment = require('moment');

function KeepAliveLog (message) {
  console.log(moment().format() + ' - KeepAlive at: ' + message);
};

module.exports = KeepAliveLog;

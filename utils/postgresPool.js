let pg = require('pg');
var exports = module.exports = {};

require('dotenv').config({path: '../'});

let config = {
  user: process.env.RDS_USERNAME,
  database: process.env.RDS_DATABASE,
  password: process.env.RDS_PASSWORD,
  host: process.env.RDS_HOSTNAME,
  max: 10,
  idleTimeoutMillis: 90000 // dashboard queries reload every 80 seconds
};

const pool = new pg.Pool(config);

pool.on('error', function (err, client) {
    console.error('err', 'idle client error', err.message, err.stack);
});

async function execute(query) {
  return new Promise(function(resolve, reject) {
    pool.query(query, function(err, result) {
      if (err) {
        let status = {
          message: 'Error running query',
          error: err
        };
        reject(err);
      }
      resolve(result);
    });
  });
}

exports.execute = execute;
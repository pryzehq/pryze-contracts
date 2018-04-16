const fs = require('fs');
const path = require('path');

let RECORDS;
const filePath = path.resolve('records.json');

function getRecords() {
  if (RECORDS) {
    return RECORDS;
  }
  RECORDS = JSON.parse(fs.readFileSync(filePath));
  return RECORDS
}

function saveRecords(updateRecords) {
  RECORDS = updateRecords;
  fs.writeFileSync(filePath, JSON.stringify(updateRecords));
}

module.exports = {
  getRecords,
  saveRecords
};

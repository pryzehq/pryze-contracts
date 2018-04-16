module.exports.findNewEntries =
'SELECT entries.id, entries.sweepstake_id, users.email, users.wallet FROM entries ' +
'JOIN users on user_id = users.id ' +
'JOIN sweepstakes on entries.sweepstake_id = sweepstakes.id ' +
'WHERE sweepstakes.pending_winning_entry_id IS NULL ' +
'AND now() <= sweepstakes.end_date ' +
'AND now() >= sweepstakes.start_date ' +
'AND entries.id > CASE WHEN (SELECT max(entry_id) FROM last_entries) IS NULL THEN ' +
'0 ' +
'ELSE ' +
'(SELECT max(entry_id) FROM last_entries) ' +
'END ' +
'ORDER BY entries.id ASC ';

const defaultInvalidReason = 'Invalid ethereum address';
module.exports.setInvalidReason = function (entryId, invalidReason = defaultInvalidReason) {
  const query = `UPDATE entries
  SET is_valid = FALSE,
  invalid_reason = '${invalidReason}'
  WHERE id = ${entryId}`;
  return query;
};

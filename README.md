# `node:sqlite` Changes Contamination Repro

The `changes` property returned by `StatementSync.run()` sometimes reports
incorrect values.

For example, `SELECT` statements should always report 0 changes, but if a
previous statement reported nonzero changes, the previous change count is
re-used.

Only non-effectful statements which should always report 0 changes are
contaminated. Statements such as `UPDATE` or `DELETE` which may conditionally
change rows will reliably report changes.

## Instructions

`npm test` or `npm run simple`.

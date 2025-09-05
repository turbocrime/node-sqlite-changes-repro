import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(":memory:");
db.exec("CREATE TABLE test_table (id INTEGER, name TEXT)");

const insertResult = db
	.prepare("INSERT INTO test_table VALUES (1, 'test1')")
	.run();

const selectResult = db.prepare("SELECT * FROM test_table").run();

console.log({ insertResult, selectResult });

db.close();

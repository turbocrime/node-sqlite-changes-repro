import { equal } from "node:assert";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, test } from "node:test";

describe("node:sqlite changes contamination", async () => {
	let db: DatabaseSync;
	let failures: unknown[];
	let expect: <T>(actual: unknown, expected: T, message: string) => void;

	beforeEach(() => {
		failures = [];
		expect = (...params) => {
			try {
				equal(...params);
			} catch (cause: unknown) {
				failures.push(cause);
			}
		};

		db = new DatabaseSync(":memory:");
		db.exec("CREATE TABLE test_table (id INTEGER, name TEXT)");
	});

	afterEach(() => {
		try {
			if (failures.length) {
				throw new AggregateError(failures);
			}
		} finally {
			db.close();
		}
	});

	describe("SELECT operations", async () => {
		describe("single operation", async () => {
			await test("single SELECT", async () => {
				const result = db.prepare("SELECT * FROM test_table").run();
				expect(result.changes, 0, "single SELECT");
			});

			await test("single INSERT", async () => {
				const result = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result.changes, 1, "single INSERT");
			});
		});

		describe("two operations", async () => {
			await test("INSERT SELECT", async () => {
				const result1 = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result1.changes, 1, "first operation INSERT");

				const result2 = db.prepare("SELECT * FROM test_table").run();
				expect(result2.changes, 0, "second operation SELECT");
			});

			await test("SELECT INSERT", async () => {
				const result1 = db.prepare("SELECT * FROM test_table").run();
				expect(result1.changes, 0, "first operation SELECT");

				const result2 = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result2.changes, 1, "second operation INSERT");
			});
		});

		describe("three operations", async () => {
			await test("INSERT SELECT SELECT", async () => {
				const result1 = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result1.changes, 1, "first operation INSERT");

				const result2 = db.prepare("SELECT * FROM test_table").run();
				expect(result2.changes, 0, "second operation SELECT");

				const result3 = db.prepare("SELECT * FROM test_table").run();
				expect(result3.changes, 0, "third operation SELECT");
			});

			await test("SELECT INSERT SELECT", async () => {
				const result1 = db.prepare("SELECT * FROM test_table").run();
				expect(result1.changes, 0, "first operation SELECT");

				const result2 = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result2.changes, 1, "second operation INSERT");

				const result3 = db.prepare("SELECT * FROM test_table").run();
				expect(result3.changes, 0, "third operation SELECT");
			});

			await test("INSERT SELECT INSERT", async () => {
				const result1 = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result1.changes, 1, "first operation INSERT");

				const result2 = db.prepare("SELECT * FROM test_table").run();
				expect(result2.changes, 0, "second operation SELECT");

				const result3 = db
					.prepare("INSERT INTO test_table VALUES (2, 'test2')")
					.run();
				expect(result3.changes, 1, "third operation INSERT");
			});
		});

		describe("four operations", async () => {
			await test("INSERT SELECT UPDATE SELECT", async () => {
				const result1 = db
					.prepare("INSERT INTO test_table VALUES (1, 'test1')")
					.run();
				expect(result1.changes, 1, "first operation INSERT");

				const result2 = db.prepare("SELECT * FROM test_table").run();
				expect(result2.changes, 0, "second operation SELECT");

				const result3 = db
					.prepare("UPDATE test_table SET name = 'test2', id = 2 WHERE id = 1")
					.run();
				expect(result3.changes, 1, "third operation UPDATE");

				const result4 = db.prepare("SELECT * FROM test_table").run();
				expect(result4.changes, 0, "fourth operation SELECT");
			});
		});
	});

	describe("UPDATE/DELETE operations with no effect", async () => {
		await test("INSERT UPDATE", async () => {
			const result1 = db
				.prepare("INSERT INTO test_table VALUES (3, 'test3')")
				.run();
			expect(result1.changes, 1, "first operation INSERT");

			const result2 = db
				.prepare("UPDATE test_table SET name = 'unchanged' WHERE id = 999")
				.run();
			expect(result2.changes, 0, "second operation UPDATE");
		});

		await test("INSERT DELETE", async () => {
			const result1 = db
				.prepare("INSERT INTO test_table VALUES (3, 'test3')")
				.run();
			expect(result1.changes, 1, "first operation INSERT");

			const result2 = db.prepare("DELETE FROM test_table WHERE id = 999").run();
			expect(result2.changes, 0, "second operation DELETE");
		});

		await test("INSERT UPDATE DELETE", async () => {
			const result1 = db
				.prepare("INSERT INTO test_table VALUES (3, 'test3')")
				.run();
			expect(result1.changes, 1, "first operation INSERT");

			const result2 = db
				.prepare("UPDATE test_table SET name = 'unchanged' WHERE id = 999")
				.run();
			expect(result2.changes, 0, "second operation UPDATE");

			const result3 = db.prepare("DELETE FROM test_table WHERE id = 888").run();
			expect(result3.changes, 0, "third operation DELETE");
		});
	});

	describe("other operations that always return zero changes", async () => {
		await test("INSERT EXPLAIN", async () => {
			const result1 = db
				.prepare("INSERT INTO test_table VALUES (1, 'test1')")
				.run();
			expect(result1.changes, 1, "first operation INSERT");

			const result2 = db.prepare("EXPLAIN SELECT * FROM test_table").run();
			expect(result2.changes, 0, "second operation EXPLAIN");
		});

		await test("INSERT PRAGMA", async () => {
			const result1 = db
				.prepare("INSERT INTO test_table VALUES (1, 'test1')")
				.run();
			expect(result1.changes, 1, "first operation INSERT");

			const result2 = db.prepare("PRAGMA table_info(test_table)").run();
			expect(result2.changes, 0, "second operation PRAGMA");
		});

		await test("INSERT BEGIN", async () => {
			const result1 = db
				.prepare("INSERT INTO test_table VALUES (1, 'test1')")
				.run();
			expect(result1.changes, 1, "first operation INSERT");

			const result2 = db.prepare("BEGIN").run();
			expect(result2.changes, 0, "second operation BEGIN");
		});
	});
});

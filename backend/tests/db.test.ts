import "dotenv/config";
import pool from "../src/db/pool";
import { describe, test, expect, afterAll } from "vitest";

describe("Database connection", () => {
  test("should connect to the database", async () => {
    const result = await pool.query("SELECT current_database() AS name");

    expect(result.rows[0].name).toEqual("credit_wallet_test");
  });

  afterAll(async () => {
    await pool.end();
  });
});

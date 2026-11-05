import type { PoolClient } from "pg";
import pool from "../db/pool.js";

export async function addCreditsToUser(
  client: PoolClient,
  userId: string,
  orderId: number,
  credits: number,
) {
  await client.query(
    "INSERT INTO wallet_transactions (user_id, order_id, credits, type) VALUES ($1, $2, $3, 'IN')",
    [userId, orderId, credits],
  );
}

export async function getUserCredits(userId: string): Promise<number> {
  const response = await pool.query(
    `SELECT COALESCE(SUM(
    CASE
      WHEN type = 'IN' THEN credits
      WHEN type = 'OUT' THEN -credits
    END
    ), 0) as credits FROM wallet_transactions WHERE user_id = $1`,
    [userId],
  );

  return response.rows[0].credits;
}

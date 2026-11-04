import type { PoolClient } from "pg";

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

import type { PoolClient } from "pg";
import pool from "../db/pool.js";

export async function createPayment(
  orderId: number,
  stripeSessionId: string,
  amountCents: number,
) {
  const response = await pool.query(
    "INSERT INTO payments (order_id, stripe_session_id, amount_cents) VALUES ($1, $2, $3) RETURNING *",
    [orderId, stripeSessionId, amountCents],
  );

  return response.rows[0];
}

export async function getPaymentBySessionId(
  client: PoolClient,
  stripeSessionId: string,
) {
  const response = await client.query(
    "SELECT * FROM payments WHERE stripe_session_id = $1 FOR UPDATE",
    [stripeSessionId],
  );

  return response.rows[0];
}

export async function updatePaymentStatus(
  client: PoolClient,
  paymentId: number,
) {
  await client.query("UPDATE payments SET status = 'succeeded' WHERE id = $1", [
    paymentId,
  ]);
}

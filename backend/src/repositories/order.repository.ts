import pool from "../db/pool.js";
import type { Order } from "../types/order.js";

export async function createNewOrder(
  productId: number,
  userId: string,
  amountCents: number,
  credits: number,
) {
  const response = await pool.query<Order>(
    "INSERT INTO orders (product_id, user_id, amount_cents, credits) VALUES ($1, $2, $3, $4) RETURNING *",
    [productId, userId, amountCents, credits],
  );

  return response.rows[0];
}

export async function getProductById(productId: number) {
  const response = await pool.query(
    "SELECT id, sku, price_cents, credits FROM products WHERE id = $1",
    [productId],
  );

  return response.rows[0];
}

export async function hasPaidOrders(userId: string): Promise<boolean> {
  const response = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM orders WHERE user_id = $1 AND status = 'paid')",
    [userId],
  );

  return response.rows[0].exists;
}

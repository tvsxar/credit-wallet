import type { PoolClient } from "pg";
import pool from "../db/pool.js";
import type { Order } from "../types/order.js";

export async function createNewOrder(
  productId: number,
  userId: string,
  amountCents: number,
  credits: number,
): Promise<Order> {
  const response = await pool.query<Order>(
    `INSERT INTO orders (product_id, user_id, amount_cents, credits)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [productId, userId, amountCents, credits],
  );

  const order = response.rows[0];

  if (!order) {
    throw new Error("Failed to create order");
  }

  return order;
}

export async function getProductById(productId: number) {
  const response = await pool.query(
    "SELECT id, sku, name, price_cents, credits FROM products WHERE id = $1",
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

export async function getOrderById(client: PoolClient, orderId: number) {
  const response = await client.query(
    "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
    [orderId],
  );

  return response.rows[0];
}

export async function updateOrderStatus(client: PoolClient, orderId: number) {
  await client.query("UPDATE orders SET status = 'paid' WHERE id = $1", [
    orderId,
  ]);
}

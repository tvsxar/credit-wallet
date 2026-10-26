import pool from "../db/pool.js";
import type { Product } from "../types/product.js";

export async function getAllProducts() {
  const response = await pool.query<Product>(
    "SELECT id, sku, name, price_cents, credits FROM products",
  );

  return response.rows;
}

export async function checkOrders(userId: string) {
  const response = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM orders WHERE user_id = $1 AND status = 'paid')", [userId],
  );

  return response.rows[0].exists;
}

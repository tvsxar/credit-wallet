import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  test,
  expect,
  vi,
  afterAll,
} from "vitest";
import request from "supertest";
import pool from "../src/db/pool";
import { stripe } from "../src/lib/stripe";
import type Stripe from "stripe";
import app from "../src/app";

let userId: string;
let productId: number;

vi.mock("../src/middleware/requireAuth.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.auth = { user: { id: userId } };
    next();
  },
}));

vi.mock("../src/lib/stripe.js", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
}));

describe("Order creation", () => {
  beforeAll(async () => {
    const url = new URL(process.env.TEST_PG_STRING!);

    if (
      process.env.NODE_ENV !== "test" ||
      url.hostname !== "127.0.0.1" ||
      url.port !== "5433" ||
      url.pathname !== "/credit_wallet_test"
    ) {
      throw new Error("Unsafe test database configuration");
    }

    const result = await pool.query("SELECT current_database() AS name");

    expect(result.rows[0].name).toBe("credit_wallet_test");
  });

  beforeEach(async () => {
    userId = `test-${randomUUID()}`;
    vi.clearAllMocks();

    await pool.query(
      `INSERT INTO "user" (id, name, email, "emailVerified")
       VALUES ($1, $2, $3, $4)`,
      [userId, "Test User", `${randomUUID()}@example.com`, false],
    );

    const result = await pool.query(
      `INSERT INTO products (sku, name, price_cents, credits)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [`TEST-${randomUUID()}`, "Test Credits", 1000, 100],
    );

    productId = result.rows[0].id;
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM wallet_transactions WHERE user_id = $1`, [
      userId,
    ]);

    await pool.query(
      `DELETE FROM payments
       WHERE order_id IN (
         SELECT id FROM orders WHERE user_id = $1
       )`,
      [userId],
    );

    await pool.query(`DELETE FROM orders WHERE user_id = $1`, [userId]);

    await pool.query(`DELETE FROM products WHERE id = $1`, [productId]);
    await pool.query(`DELETE FROM products WHERE sku = $1`, ["WLCM-001"]);

    await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("should create an order and payment", async () => {
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/test-session",
    } as Stripe.Response<Stripe.Checkout.Session>);

    const response = await request(app).post("/api/orders").send({ productId });

    expect(response.status).toBe(201);
    expect(response.body.orderId).toEqual(expect.any(Number));
    expect(response.body.checkoutUrl).toBe(
      "https://checkout.stripe.com/test-session",
    );

    const order = await pool.query("SELECT * FROM orders WHERE id = $1", [
      response.body.orderId,
    ]);

    expect(order.rows.length).toBe(1);
    expect(order.rows[0].user_id).toBe(userId);
    expect(order.rows[0].product_id).toBe(productId);
    expect(order.rows[0].status).toBe("pending");
    expect(order.rows[0].amount_cents).toBe(1000);
    expect(order.rows[0].credits).toBe(100);

    const payment = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [response.body.orderId],
    );

    expect(payment.rows.length).toBe(1);
    expect(payment.rows[0].stripe_session_id).toBe("cs_test_123");
    expect(payment.rows[0].amount_cents).toBe(1000);
    expect(payment.rows[0].status).toBe("pending");

    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  test("should reject welcome offer when user already has a paid order", async () => {
    await pool.query(
      `INSERT INTO orders (product_id, user_id, amount_cents, credits, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [productId, userId, 1000, 100, "paid"],
    );

    const welcomeProduct = await pool.query(
      `INSERT INTO products (sku, name, price_cents, credits)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [`WLCM-001`, "Welcome Offer", 500, 100],
    );

    const response = await request(app)
      .post("/api/orders")
      .send({ productId: welcomeProduct.rows[0].id });

    const orderCount = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1",
      [userId],
    );

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Welcome offer is no longer available");
    expect(orderCount.rows).toHaveLength(1);

    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

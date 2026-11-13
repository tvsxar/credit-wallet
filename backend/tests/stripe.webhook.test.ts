import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  test,
  expect,
  afterAll,
} from "vitest";
import { stripe } from "../src/lib/stripe.js";
import request from "supertest";
import pool from "../src/db/pool";
import app from "../src/app";

let userId: string;
let productId: number;
let orderId: number;
let sessionId: string;

const createSuccessEvent = () => ({
  id: `evt_test_${randomUUID()}`,
  object: "event",
  type: "checkout.session.completed",
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      payment_status: "paid",
      currency: "eur",
      amount_total: 1000,
    },
  },
});

describe("Stripe webhook", () => {
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
    sessionId = `cs_test_${randomUUID()}`;
    userId = `test-${randomUUID()}`;

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

    const orderProduct = await pool.query(
      `INSERT INTO orders (product_id, user_id, amount_cents, credits)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [result.rows[0].id, userId, 1000, 100],
    );
    orderId = orderProduct.rows[0].id;

    await pool.query(
      `INSERT INTO payments (order_id, stripe_session_id, amount_cents)
       VALUES ($1, $2, $3)`,
      [orderId, sessionId, 1000],
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

    await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  });

  afterAll(async () => {
    await pool.end();
  });

  test("should process successful payment", async () => {
    const event = createSuccessEvent();
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(200);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("paid");
    expect(payments.rows[0].status).toBe("succeeded");
    expect(walletTransactions.rows.length).toBe(1);
    expect(walletTransactions.rows[0].user_id).toBe(userId);
    expect(walletTransactions.rows[0].type).toBe("IN");
    expect(walletTransactions.rows[0].credits).toBe(100);
  });

  test("should reject webhook with invalid signature", async () => {
    const event = createSuccessEvent();
    const jsonString = JSON.stringify(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", "invalid_signature")
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid Stripe webhook signature");

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("pending");
    expect(payments.rows[0].status).toBe("pending");
    expect(walletTransactions.rows.length).toBe(0);
  });

  test("should expire order when checkout session expires", async () => {
    const eventExpired = {
      id: `evt_test_${randomUUID()}`,
      object: "event",
      type: "checkout.session.expired",
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          payment_status: "unpaid",
          currency: "eur",
          amount_total: 1000,
        },
      },
    };

    const jsonString = JSON.stringify(eventExpired);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(200);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("expired");
    expect(payments.rows[0].status).toBe("failed");
    expect(walletTransactions.rows.length).toBe(0);
  });

  test("should not credit wallet twice for duplicate webhook", async () => {
    const event = createSuccessEvent();
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const firstResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(firstResponse.status).toBe(200);

    const secondResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(secondResponse.status).toBe(200);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("paid");
    expect(payments.rows[0].status).toBe("succeeded");
    expect(walletTransactions.rows.length).toBe(1);
    expect(walletTransactions.rows[0].user_id).toBe(userId);
    expect(walletTransactions.rows[0].type).toBe("IN");
    expect(walletTransactions.rows[0].credits).toBe(100);
  });

  test("should reject payment with mismatched amount", async () => {
    const event = createSuccessEvent();
    event.data.object.amount_total = 900;
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(500);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("pending");
    expect(payments.rows[0].status).toBe("pending");
    expect(walletTransactions.rows.length).toBe(0);
  });

  test("should reject payment with invalid currency", async () => {
    const event = createSuccessEvent();
    event.data.object.currency = "usd";
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(500);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("pending");
    expect(payments.rows[0].status).toBe("pending");
    expect(walletTransactions.rows.length).toBe(0);
  });

  test("should reject payment with unpaid status", async () => {
    const event = createSuccessEvent();
    event.data.object.payment_status = "unpaid";
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(500);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("pending");
    expect(payments.rows[0].status).toBe("pending");
    expect(walletTransactions.rows.length).toBe(0);
  });

  test("should reject payment when payment is not found", async () => {
    const event = createSuccessEvent();
    event.data.object.id = `cs_test_unknown_${randomUUID()}`;
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(500);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("pending");
    expect(payments.rows[0].status).toBe("pending");
    expect(walletTransactions.rows.length).toBe(0);
  });

  test("should rollback payment when credit insertion fails", async () => {
    await pool.query(
      `INSERT INTO wallet_transactions (user_id, order_id, credits, type)
      VALUES ($1, $2, $3, 'IN')`,
      [userId, orderId, 100],
    );

    const event = createSuccessEvent();
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", signature)
      .set("Content-Type", "application/json")
      .send(jsonString);

    expect(response.status).toBe(500);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("pending");
    expect(payments.rows[0].status).toBe("pending");
    expect(walletTransactions.rows.length).toBe(1);
    expect(walletTransactions.rows[0].user_id).toBe(userId);
    expect(walletTransactions.rows[0].type).toBe("IN");
    expect(walletTransactions.rows[0].credits).toBe(100);
  });

  test("should credit wallet only once for concurrent webhooks", async () => {
    const event = createSuccessEvent();
    const jsonString = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: jsonString,
      secret: process.env.WEBHOOK_SECRET!,
    });

    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .post("/api/webhooks/stripe")
        .set("stripe-signature", signature)
        .set("Content-Type", "application/json")
        .send(jsonString),

      request(app)
        .post("/api/webhooks/stripe")
        .set("stripe-signature", signature)
        .set("Content-Type", "application/json")
        .send(jsonString),
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const orders = await pool.query("SELECT * FROM orders WHERE id = $1", [
      orderId,
    ]);
    const payments = await pool.query(
      "SELECT * FROM payments WHERE order_id = $1",
      [orderId],
    );
    const walletTransactions = await pool.query(
      "SELECT * FROM wallet_transactions WHERE order_id = $1",
      [orderId],
    );

    expect(orders.rows[0].status).toBe("paid");
    expect(payments.rows[0].status).toBe("succeeded");
    expect(walletTransactions.rows.length).toBe(1);
    expect(walletTransactions.rows[0].user_id).toBe(userId);
    expect(walletTransactions.rows[0].type).toBe("IN");
    expect(walletTransactions.rows[0].credits).toBe(100);
  });
});

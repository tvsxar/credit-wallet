import pool from "../db/pool.js";
import {
  getOrderById,
  updateOrderStatus,
} from "../repositories/order.repository.js";
import {
  getPaymentBySessionId,
  updatePaymentStatus,
} from "../repositories/payment.repository.js";
import type Stripe from "stripe";
import { addCreditsToUser } from "../repositories/wallet.repository.js";

export async function processSuccessfulPayment(
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status !== "paid") {
    throw new Error("Payment status is not paid");
  }

  if (session.currency !== "eur") {
    throw new Error("Payment currency mismatch");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const payment = await getPaymentBySessionId(client, session.id);

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status === "succeeded") {
      await client.query("COMMIT");
      return;
    }

    if (payment.status !== "pending") {
      throw new Error("Invalid payment status");
    }

    if (payment.amount_cents !== session.amount_total) {
      throw new Error("Payment amount mismatch");
    }

    const order = await getOrderById(client, payment.order_id);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "paid") {
      throw new Error("Order already paid by another payment");
    }

    if (order.status !== "pending") {
      throw new Error("Invalid order status");
    }

    await updatePaymentStatus(client, payment.id);

    await updateOrderStatus(client, order.id);

    await addCreditsToUser(client, order.user_id, order.id, order.credits);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import {
  createNewOrder,
  getProductById,
  hasPaidOrders,
} from "../repositories/order.repository.js";
import { createPayment } from "../repositories/payment.repository.js";
import {
  ProductNotFoundError,
  WelcomeOfferUnavailableError,
} from "../errors/customErrors.js";
import { stripe } from "../lib/stripe.js";

export async function createOrder(productId: number, userId: string) {
  const product = await getProductById(productId);

  if (!product) throw new ProductNotFoundError();

  if (product.sku === "WLCM-001") {
    const hasOrders = await hasPaidOrders(userId);

    if (hasOrders) {
      throw new WelcomeOfferUnavailableError();
    }
  }

  const order = await createNewOrder(
    product.id,
    userId,
    product.price_cents,
    product.credits,
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: product.name,
          },
          unit_amount: order.amount_cents,
        },
        quantity: 1,
      },
    ],
    success_url: "http://localhost:5173/payment/success",
    cancel_url: "http://localhost:5173/payment/cancel",
    metadata: {
      orderId: String(order!.id),
    },
  });

  await createPayment(order.id, session.id, order.amount_cents);

  return {
    orderId: order.id,
    checkoutUrl: session.url,
  };
}

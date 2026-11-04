import type { Response, Request, NextFunction } from "express";
import { stripe } from "../lib/stripe.js";
import { processSuccessfulPayment } from "../services/payment.service.js";

export async function stripeWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({ message: "Missing stripe signature" });
    }

    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("The webhook secret is missing!");
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret,
      );
    } catch {
      return res.status(400).json({
        message: "Invalid Stripe webhook signature",
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      await processSuccessfulPayment(session);
    }

    return res.status(200).json({ message: "Received" });
  } catch (error) {
    next(error);
  }
}

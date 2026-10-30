import { createOrder } from "../services/order.service.js";
import type { Response, Request, NextFunction } from "express";

export async function createNewOrder(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { productId } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        message: "ProductId must be a positive integer",
      });
    }

    const userId = req.auth?.user.id;

    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const order = await createOrder(productId, userId);

    return res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
}

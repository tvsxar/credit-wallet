import { getAvailableProducts } from "../services/product.service.js";
import type { Response, Request, NextFunction } from "express";

export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.auth?.user.id;

    if (!userId) return res.status(401).json({ message: "Not authorized" });

    const products = await getAvailableProducts(userId);

    return res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
}

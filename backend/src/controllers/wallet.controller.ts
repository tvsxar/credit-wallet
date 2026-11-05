import { BadRequestError } from "../errors/customErrors.js";
import {
  getUserWalletCredits,
  getUserWalletTransactions,
} from "../services/wallet.service.js";
import type { Response, Request, NextFunction } from "express";

export async function getWalletCredits(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.auth?.user.id;

  if (!userId) return res.status(401).json({ message: "Not authorized" });

  try {
    const credits = await getUserWalletCredits(userId);

    return res.status(200).json({ credits });
  } catch (error) {
    next(error);
  }
}

export async function getWalletTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.auth?.user.id;
  const rawPage = req.query.page;

  if (rawPage !== undefined && typeof rawPage !== "string") {
    throw new BadRequestError("Invalid page number");
  }

  const page = rawPage ?? "1";

  if (!userId) return res.status(401).json({ message: "Not authorized" });

  try {
    const transactions = await getUserWalletTransactions(userId, page);

    return res.status(200).json({ transactions });
  } catch (error) {
    next(error);
  }
}

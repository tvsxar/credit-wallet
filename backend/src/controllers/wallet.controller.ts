import { getUserWalletCredits } from "../services/wallet.service.js";
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

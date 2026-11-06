import {
  getUserCredits,
  getUserTransactions,
} from "../repositories/wallet.repository.js";
import { BadRequestError } from "../errors/customErrors.js";

export async function getUserWalletCredits(userId: string) {
  const credits = await getUserCredits(userId);

  return credits;
}

export async function getUserWalletTransactions(
  userId: string,
  page: string = "1",
) {
  const pageNumber = Number(page);

  if (
    !Number.isSafeInteger(pageNumber) ||
    pageNumber <= 0 ||
    page.trim() === ""
  ) {
    throw new BadRequestError("Invalid page number");
  }

  const limit = 20;
  const offset = (pageNumber - 1) * limit;

  const transactions = await getUserTransactions(userId, limit, offset);

  return transactions;
}

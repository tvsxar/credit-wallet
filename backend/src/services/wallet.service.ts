import { getUserCredits } from "../repositories/wallet.repository.js";

export async function getUserWalletCredits(userId: string) {
  const credits = await getUserCredits(userId);

  return credits;
}

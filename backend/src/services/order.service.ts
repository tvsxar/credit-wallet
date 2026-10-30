import {
  createNewOrder,
  getProductById,
  hasPaidOrders,
} from "../repositories/order.repository.js";
import {
  ProductNotFoundError,
  WelcomeOfferUnavailableError,
} from "../errors/customErrors.js";

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

  return order;
}

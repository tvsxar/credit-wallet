import { checkOrders, getAllProducts } from '../repositories/product.repository.js';

export async function getAvailableProducts(userId: string) {
    const products = await getAllProducts();

    const hasPaidOrder = await checkOrders(userId);

    if(hasPaidOrder) return products.filter((product) => product.sku !== "WLCM-001");

    return products;
}
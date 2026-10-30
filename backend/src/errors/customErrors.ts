import { AppError } from "./appError.js";

export class ProductNotFoundError extends AppError {
  constructor() {
    super("Product not found", 404);
  }
}

export class WelcomeOfferUnavailableError extends AppError {
  constructor() {
    super("Welcome offer is no longer available", 409);
  }
}

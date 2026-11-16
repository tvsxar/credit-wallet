import request from "supertest";
import app from "../src/app";
import { describe, test, expect, vi } from "vitest";

vi.mock("../src/middleware/requireAuth.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.auth = { user: { id: "test-user-id" } };
    next();
  },
}));

describe("Orders API", () => {
  test("should return 400 Bad Request when creating an order with invalid productId", async () => {
    const response = await request(app)
      .post("/api/orders")
      .send({ productId: -1 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("ProductId must be a positive integer");
  });

  test("should return 404 Not Found when creating an order with a non-existent productId", async () => {
    const response = await request(app)
      .post("/api/orders")
      .send({ productId: 2147483647 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Product not found");
  });
});

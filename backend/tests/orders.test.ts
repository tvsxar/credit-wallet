import request from "supertest";
import app from "../src/app";
import { describe, test, expect } from "vitest";

describe("Orders API", () => {
  test("should return 401 Unauthorized when creating an order without authentication", async () => {
    const response = await request(app)
      .post("/api/orders")
      .send({ productId: 1 });

    expect(response.status).toBe(401);
  });
});

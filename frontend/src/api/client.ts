import type { Product, Session, Transaction } from "../types/api";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, method: "GET" | "POST", body?: object): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "include",
      cache: "no-store",
      ...(body && {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = response.status < 500 && typeof data?.message === "string"
      ? data.message
      : "The server could not complete the request. Try again.";
    throw new ApiError(response.status, message);
  }
  if (data === undefined) throw new Error("The server returned an unexpected response.");
  return data as T;
}

export const api = {
  session: () => request<Session | null>("/auth/get-session", "GET"),
  signIn: (email: string, password: string) =>
    request<unknown>("/auth/sign-in/email", "POST", { email, password }),
  signUp: (name: string, email: string, password: string) =>
    request<unknown>("/auth/sign-up/email", "POST", { name, email, password }),
  signOut: () => request<unknown>("/auth/sign-out", "POST", {}),
  balance: () => request<{ credits: number | string }>("/wallet/balance", "GET"),
  products: () => request<{ products: Product[] }>("/products", "GET"),
  transactions: (page: number) =>
    request<{ transactions: Transaction[] }>("/wallet/transactions?page=" + page, "GET"),
  order: (productId: number) =>
    request<{ orderId: number; checkoutUrl: string | null }>("/orders", "POST", { productId }),
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}

export interface Session {
  user: { name: string; email: string };
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  price_cents: number;
  credits: number;
}

export interface Transaction {
  id: number;
  order_id: number | null;
  credits: number;
  type: "IN" | "OUT";
  occurred_at: string;
}

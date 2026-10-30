export interface Order {
  id: number;
  product_id: number;
  user_id: string;
  amount_cents: number;
  credits: number;
  status: "pending" | "paid" | "cancelled" | "expired";
}

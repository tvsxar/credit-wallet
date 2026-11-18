export const clientOrigin = new URL(
  process.env.CLIENT_URL || "http://localhost:5173",
).origin;

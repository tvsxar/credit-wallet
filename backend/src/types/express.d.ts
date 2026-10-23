import type { auth } from "../lib/auth.js";

type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

declare global {
  namespace Express {
    interface Request {
      auth?: AuthSession;
    }
  }
}

export {};

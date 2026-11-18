import { betterAuth } from "better-auth";
import pool from "../db/pool.js";
import { clientOrigin } from "../config/clientOrigin.js";

export const auth = betterAuth({
  database: pool,
  trustedOrigins: [clientOrigin],
  emailAndPassword: {
    enabled: true,
  },

  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
});

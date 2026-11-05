import express from "express";
import {
  getWalletCredits,
  getWalletTransactions,
} from "../controllers/wallet.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/balance", requireAuth, getWalletCredits);

router.get("/transactions", requireAuth, getWalletTransactions);

export default router;

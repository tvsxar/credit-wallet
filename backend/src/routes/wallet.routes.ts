import express from "express";
import { getWalletCredits } from "../controllers/wallet.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/balance", requireAuth, getWalletCredits);

export default router;

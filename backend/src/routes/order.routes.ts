import express from 'express';
import { createNewOrder } from '../controllers/order.controller.js';
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router();

router.post("/", requireAuth, createNewOrder);

export default router;

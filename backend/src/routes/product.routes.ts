import express from 'express';
import { getProducts } from '../controllers/product.controller.js';
import { requireAuth } from '../middleware/requireAuth.js'

const router = express.Router();

router.get("/", requireAuth, getProducts);

export default router;

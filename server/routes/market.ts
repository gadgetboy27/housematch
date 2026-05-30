import { Router } from 'express';
import { z } from 'zod';
import { linzMarketService } from '../services/linz-market.js';

const router = Router();

const cardsQuerySchema = z.object({
  suburb: z.string().min(1).max(100).trim(),
  city: z.string().min(1).max(100).trim().default('Auckland'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const suburbsQuerySchema = z.object({
  q: z.string().min(2).max(100).trim(),
  city: z.string().max(100).trim().optional(),
});

const reportQuerySchema = z.object({
  address: z.string().min(1).max(500).trim(),
  city: z.string().min(1).max(100).trim(),
});

// GET /api/market/cards?suburb=Ponsonby&city=Auckland
router.get('/cards', async (req, res) => {
  const v = cardsQuerySchema.safeParse(req.query);
  if (!v.success) {
    return res.status(400).json({ error: v.error.errors[0].message });
  }
  const { suburb, city, limit } = v.data;
  const cards = await linzMarketService.getMarketCards(suburb, city, limit);
  return res.json({ cards, total: cards.length, suburb, city });
});

// GET /api/market/suburbs?q=Pon&city=Auckland
router.get('/suburbs', async (req, res) => {
  const v = suburbsQuerySchema.safeParse(req.query);
  if (!v.success) {
    return res.status(400).json({ error: v.error.errors[0].message });
  }
  const suggestions = await linzMarketService.getSuburbSuggestions(v.data.q, v.data.city);
  return res.json({ suggestions });
});

// GET /api/market/report?address=15+Ponsonby+Rd&city=Auckland
router.get('/report', async (req, res) => {
  const v = reportQuerySchema.safeParse(req.query);
  if (!v.success) {
    return res.status(400).json({ error: v.error.errors[0].message });
  }
  const report = await linzMarketService.generateAutoReport(v.data.address, v.data.city);
  return res.json(report);
});

export default router;

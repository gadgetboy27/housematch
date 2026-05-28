import { Router } from 'express';
import { z } from 'zod';
import { linzApi } from '../services/linz-api.js';

const router = Router();

// Zod validation schemas for LINZ API inputs
const titleNumberSchema = z.object({
  titleNumber: z.string()
    .min(1, 'Title number is required')
    .max(50, 'Title number too long')
    .regex(/^[A-Za-z0-9\/-]+$/, 'Title number contains invalid characters')
});

const addressLookupSchema = z.object({
  address: z.string()
    .min(1, 'Address is required')
    .max(500, 'Address too long')
    .trim()
});

const verifyAddressSchema = z.object({
  address: z.string()
    .min(1, 'Address is required')
    .max(500, 'Address too long')
    .trim(),
  city: z.string()
    .min(1, 'City is required')
    .max(100, 'City too long')
    .trim()
});

/**
 * GET /api/linz/title/:titleNumber
 * Fetch title information by title number
 */
router.get('/title/:titleNumber', async (req, res) => {
  try {
    // Validate input with Zod
    const validation = titleNumberSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message
      });
    }

    const { titleNumber } = validation.data;

    if (!linzApi.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'LINZ API is not configured. Please add LINZ_API_KEY to environment variables.'
      });
    }

    const titleData = await linzApi.getTitleByNumber(titleNumber);

    if (!titleData) {
      return res.status(404).json({
        success: false,
        error: 'Title not found in LINZ database'
      });
    }

    return res.json({
      success: true,
      titleData
    });

  } catch (error: any) {
    console.error('Error fetching LINZ title:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch title data'
    });
  }
});

/**
 * POST /api/linz/lookup-title
 * Search for title by property address (multi-strategy with multiple results)
 */
router.post('/lookup-title', async (req, res) => {
  try {
    // Validate input with Zod
    const validation = addressLookupSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message
      });
    }

    const { address } = validation.data;

    if (!linzApi.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'LINZ API is not configured. Please add LINZ_API_KEY to environment variables.',
        message: 'You can still enter lot number and certificate manually.'
      });
    }

    const titleMatches = await linzApi.searchTitleByAddress(address);

    if (!titleMatches || titleMatches.length === 0) {
      return res.json({
        success: true,
        matches: [],
        message: 'No titles found for this address. Please enter lot number and certificate manually.',
        requiresManualEntry: true
      });
    }

    // Return all matches for user selection
    return res.json({
      success: true,
      matches: titleMatches.map(match => ({
        titleNumber: match.titleNumber,
        legalDescription: match.legalDescription,
        landDistrict: match.landDistrict,
        status: match.status,
        confidence: match.confidence,
        matchStrategy: match.matchStrategy
      })),
      message: titleMatches.length === 1 
        ? 'Found 1 matching title' 
        : `Found ${titleMatches.length} possible matches. Please select the correct one.`,
      requiresSelection: titleMatches.length > 1
    });

  } catch (error: any) {
    console.error('Error looking up LINZ title:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to lookup title data',
      message: 'LINZ lookup failed. You can still enter lot number and certificate manually.'
    });
  }
});

/**
 * POST /api/linz/verify-address
 * NEW: Coordinate-based address verification (2-step process)
 * Verifies address exists in LINZ database and returns title + lot number
 */
router.post('/verify-address', async (req, res) => {
  try {
    // Validate input with Zod
    const validation = verifyAddressSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors[0].message
      });
    }

    const { address, city } = validation.data;

    if (!linzApi.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'LINZ API is not configured',
        message: 'LINZ_API_KEY is missing. Please enter lot number and certificate manually.'
      });
    }

    // Call the new 2-step verification method
    const result = await linzApi.verifyPropertyAddress(address, city);

    if (!result.success) {
      return res.json({
        success: false,
        error: result.error,
        message: result.message,
        fullAddress: result.fullAddress,
        coordinates: result.coordinates
      });
    }

    // Success - return parsed lot number and certificate of title
    return res.json({
      success: true,
      titleNumber: result.titleNumber,
      lotNumber: result.lotNumber,
      legalDescription: result.legalDescription,
      titleType: result.titleType,
      status: result.status,
      fullAddress: result.fullAddress,
      coordinates: result.coordinates,
      message: 'Address verified successfully! Title information has been retrieved.'
    });

  } catch (error: any) {
    console.error('Error verifying address with LINZ:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify address',
      message: 'Address verification failed. You can still enter lot number and certificate manually.'
    });
  }
});

/**
 * GET /api/linz/status
 * Check if LINZ API is configured and available
 */
router.get('/status', (req, res) => {
  const isConfigured = linzApi.isConfigured();
  
  res.json({
    success: true,
    configured: isConfigured,
    message: isConfigured 
      ? 'LINZ API is configured and ready' 
      : 'LINZ API key not found. Manual entry is available.'
  });
});

export default router;

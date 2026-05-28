/**
 * Property Snapshot API Routes
 * Endpoints for free property snapshot generation
 */

import { Router } from 'express';
import { propertySnapshotService } from '../services/property-snapshot.js';

const router = Router();

/**
 * POST /api/property-snapshot
 * Generate a free property snapshot using LINZ verification
 */
router.post('/', async (req, res) => {
  try {
    const { address, city } = req.body;

    if (!address || !city) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide both address and city',
      });
    }

    const snapshot = await propertySnapshotService.generateSnapshot(address, city);
    const formattedText = propertySnapshotService.formatSnapshotText(snapshot);

    res.json({
      ...snapshot,
      formattedText,
    });

  } catch (error: any) {
    console.error('❌ Property snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message || 'Failed to generate property snapshot',
    });
  }
});

export default router;

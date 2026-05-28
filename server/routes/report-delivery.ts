/**
 * Report Delivery API Routes  
 * Endpoints for managing automated report delivery
 * 🔒 SECURITY: All routes require admin authentication
 */

import { Router } from 'express';
import { reportDeliveryScheduler } from '../services/report-delivery-scheduler.js';
import { db } from '../db.js';
import { purchaseOrders } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../auth.js';

const router = Router();

// 🔒 SECURITY: All report delivery routes require admin authentication
router.use(requireAdmin);

/**
 * POST /api/report-delivery/process
 * Process all scheduled deliveries (can be triggered manually or by cron)
 * This endpoint should be called periodically (e.g., every hour)
 * 🔒 Requires admin authentication
 */
router.post('/process', async (req, res) => {
  try {
    console.log('🕐 Processing scheduled report deliveries...');
    
    const results = await reportDeliveryScheduler.processScheduledDeliveries();
    
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    };

    console.log(`✅ Delivery processing complete:`, summary);
    
    res.json({
      success: true,
      summary,
    });

  } catch (error: any) {
    console.error('❌ Delivery processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message || 'Failed to process deliveries',
    });
  }
});

/**
 * POST /api/report-delivery/deliver/:orderId
 * Manually trigger delivery for a specific order (admin use)
 * 🔒 Requires admin authentication
 */
router.post('/deliver/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing order ID',
      });
    }

    const result = await reportDeliveryScheduler.deliverOrderNow(orderId);

    res.json({
      success: result.success,
      result,
    });

  } catch (error: any) {
    console.error('❌ Manual delivery error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message || 'Failed to deliver report',
    });
  }
});

/**
 * GET /api/report-delivery/pending
 * Get list of orders pending delivery
 * 🔒 Requires admin authentication
 */
router.get('/pending', async (req, res) => {
  try {
    const now = new Date();
    
    const pendingOrders = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.status, 'processing'));

    res.json({
      success: true,
      count: pendingOrders.length,
      orders: pendingOrders.map(order => ({
        id: order.id,
        reportType: order.reportType,
        propertyAddress: order.propertyAddress,
        scheduledFor: order.deliveryScheduledFor,
        isReady: order.deliveryScheduledFor ? new Date(order.deliveryScheduledFor) <= now : false,
        deliveryAttempts: order.deliveryAttempts || 0,
      })),
    });

  } catch (error: any) {
    console.error('❌ Pending orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message || 'Failed to fetch pending orders',
    });
  }
});

export default router;

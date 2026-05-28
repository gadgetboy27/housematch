// HouseMatch Offer Wizard API Routes
// RESTful API design for managing property offers with ADLS integration

import express from 'express';
const router = express.Router();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware to verify user authentication
 * Assumes you have JWT or session-based auth
 */
const authenticateUser = (req, res, next) => {
  // Your auth logic here
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

/**
 * Middleware to verify offer ownership
 */
const verifyOfferOwnership = async (req, res, next) => {
  const { offerId } = req.params;
  const offer = await db.query(
    'SELECT buyer_id FROM offers WHERE id = $1',
    [offerId]
  );
  
  if (!offer.rows[0] || offer.rows[0].buyer_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

// ============================================================================
// OFFER ROUTES
// ============================================================================

/**
 * POST /api/offers
 * Create a new offer (starts the wizard)
 * 
 * Body: {
 *   propertyId: string,
 *   offerPrice: number,
 *   depositAmount?: number (defaults to 10% of offer price),
 *   settlementDate: string (ISO date)
 * }
 */
router.post('/offers', authenticateUser, async (req, res) => {
  try {
    const { propertyId, offerPrice, depositAmount, settlementDate } = req.body;
    
    // Validation
    if (!propertyId || !offerPrice || !settlementDate) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['propertyId', 'offerPrice', 'settlementDate']
      });
    }
    
    // Calculate deposit if not provided (10% is standard)
    const finalDepositAmount = depositAmount || (offerPrice * 0.1);
    
    // Calculate deposit payment date (typically 10 working days after acceptance)
    const depositPaymentDate = new Date(settlementDate);
    depositPaymentDate.setDate(depositPaymentDate.getDate() - 20); // 20 days before settlement
    
    const query = `
      INSERT INTO offers (
        property_id, buyer_id, offer_price, deposit_amount, 
        deposit_payment_date, settlement_date, wizard_step, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 1, 'draft')
      RETURNING *
    `;
    
    const result = await db.query(query, [
      propertyId,
      req.user.id,
      offerPrice,
      finalDepositAmount,
      depositPaymentDate,
      settlementDate
    ]);
    
    res.status(201).json({
      success: true,
      offer: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating offer:', error);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

/**
 * GET /api/offers
 * Get all offers for the authenticated user
 * Query params: status, propertyId
 */
router.get('/offers', authenticateUser, async (req, res) => {
  try {
    const { status, propertyId } = req.query;
    
    let query = 'SELECT * FROM offer_details WHERE buyer_id = $1';
    const params = [req.user.id];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    if (propertyId) {
      query += ` AND property_id = $${params.length + 1}`;
      params.push(propertyId);
    }
    
    query += ' ORDER BY offer_created_at DESC';
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      offers: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

/**
 * GET /api/offers/:offerId
 * Get a specific offer with all details
 */
router.get('/offers/:offerId', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // Get offer details
    const offerQuery = 'SELECT * FROM offer_details WHERE offer_id = $1';
    const offer = await db.query(offerQuery, [offerId]);
    
    if (!offer.rows[0]) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    // Get conditions
    const conditionsQuery = 'SELECT * FROM offer_conditions WHERE offer_id = $1 ORDER BY due_date';
    const conditions = await db.query(conditionsQuery, [offerId]);
    
    // Get chattels
    const chattelsQuery = 'SELECT * FROM offer_chattels WHERE offer_id = $1 ORDER BY chattel_type, item_description';
    const chattels = await db.query(chattelsQuery, [offerId]);
    
    // Get buyer details
    const buyerDetailsQuery = 'SELECT * FROM offer_buyer_details WHERE offer_id = $1';
    const buyerDetails = await db.query(buyerDetailsQuery, [offerId]);
    
    // Get activities
    const activitiesQuery = 'SELECT * FROM offer_activities WHERE offer_id = $1 ORDER BY created_at DESC LIMIT 20';
    const activities = await db.query(activitiesQuery, [offerId]);
    
    res.json({
      success: true,
      offer: {
        ...offer.rows[0],
        conditions: conditions.rows,
        chattels: chattels.rows,
        buyerDetails: buyerDetails.rows[0] || null,
        recentActivities: activities.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

/**
 * PATCH /api/offers/:offerId
 * Update offer details
 */
router.patch('/offers/:offerId', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    const updates = req.body;
    
    // Prevent updating certain fields after submission
    const offer = await db.query('SELECT status FROM offers WHERE id = $1', [offerId]);
    if (offer.rows[0].status !== 'draft') {
      return res.status(400).json({ 
        error: 'Cannot modify offer after submission',
        currentStatus: offer.rows[0].status
      });
    }
    
    // Build update query dynamically
    const allowedFields = ['offer_price', 'deposit_amount', 'settlement_date', 'wizard_step'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(offerId);
    const query = `
      UPDATE offers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    res.json({
      success: true,
      offer: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating offer:', error);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

/**
 * DELETE /api/offers/:offerId
 * Delete/withdraw an offer
 */
router.delete('/offers/:offerId', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // Soft delete by updating status
    const query = `
      UPDATE offers 
      SET status = 'withdrawn'
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, [offerId]);
    
    res.json({
      success: true,
      message: 'Offer withdrawn successfully',
      offer: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error withdrawing offer:', error);
    res.status(500).json({ error: 'Failed to withdraw offer' });
  }
});

// ============================================================================
// WIZARD STEP ROUTES
// ============================================================================

/**
 * POST /api/offers/:offerId/buyer-details
 * Save buyer and solicitor details (Step 2)
 */
router.post('/offers/:offerId/buyer-details', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    const {
      hasSolicitor,
      solicitorName,
      solicitorFirm,
      solicitorEmail,
      solicitorPhone,
      solicitorAddress
    } = req.body;
    
    // Check if details already exist
    const existingQuery = 'SELECT id FROM offer_buyer_details WHERE offer_id = $1';
    const existing = await db.query(existingQuery, [offerId]);
    
    let query;
    let values;
    
    if (existing.rows.length > 0) {
      // Update existing
      query = `
        UPDATE offer_buyer_details
        SET has_solicitor = $1, solicitor_name = $2, solicitor_firm = $3,
            solicitor_email = $4, solicitor_phone = $5, solicitor_address = $6
        WHERE offer_id = $7
        RETURNING *
      `;
      values = [hasSolicitor, solicitorName, solicitorFirm, solicitorEmail, 
                solicitorPhone, solicitorAddress, offerId];
    } else {
      // Insert new
      query = `
        INSERT INTO offer_buyer_details 
        (offer_id, has_solicitor, solicitor_name, solicitor_firm, 
         solicitor_email, solicitor_phone, solicitor_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      values = [offerId, hasSolicitor, solicitorName, solicitorFirm, 
                solicitorEmail, solicitorPhone, solicitorAddress];
    }
    
    const result = await db.query(query, values);
    
    // Update wizard step
    await db.query('UPDATE offers SET wizard_step = GREATEST(wizard_step, 2) WHERE id = $1', [offerId]);
    
    res.json({
      success: true,
      buyerDetails: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error saving buyer details:', error);
    res.status(500).json({ error: 'Failed to save buyer details' });
  }
});

/**
 * POST /api/offers/:offerId/conditions
 * Add conditions to offer (Step 3)
 */
router.post('/offers/:offerId/conditions', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { conditions } = req.body; // Array of condition objects
    
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({ error: 'Conditions must be a non-empty array' });
    }
    
    // Delete existing conditions and insert new ones
    await db.query('DELETE FROM offer_conditions WHERE offer_id = $1', [offerId]);
    
    const insertedConditions = [];
    
    for (const condition of conditions) {
      const { conditionType, description, daysToSatisfy } = condition;
      
      // Get settlement date to calculate due date
      const offerQuery = 'SELECT settlement_date FROM offers WHERE id = $1';
      const offer = await db.query(offerQuery, [offerId]);
      const settlementDate = new Date(offer.rows[0].settlement_date);
      
      // Calculate due date (working backwards from settlement)
      const dueDate = new Date(settlementDate);
      dueDate.setDate(dueDate.getDate() - (daysToSatisfy || 10));
      
      const query = `
        INSERT INTO offer_conditions 
        (offer_id, condition_type, description, days_to_satisfy, due_date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await db.query(query, [
        offerId,
        conditionType,
        description,
        daysToSatisfy || 10,
        dueDate
      ]);
      
      insertedConditions.push(result.rows[0]);
    }
    
    // Update wizard step
    await db.query('UPDATE offers SET wizard_step = GREATEST(wizard_step, 3) WHERE id = $1', [offerId]);
    
    res.json({
      success: true,
      conditions: insertedConditions
    });
    
  } catch (error) {
    console.error('Error saving conditions:', error);
    res.status(500).json({ error: 'Failed to save conditions' });
  }
});

/**
 * PATCH /api/offers/:offerId/conditions/:conditionId
 * Update a specific condition's status
 */
router.patch('/offers/:offerId/conditions/:conditionId', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { conditionId } = req.params;
    const { status, notes, documents } = req.body;
    
    const query = `
      UPDATE offer_conditions
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          documents = COALESCE($3, documents),
          satisfied_at = CASE WHEN $1 = 'satisfied' THEN NOW() ELSE satisfied_at END
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await db.query(query, [status, notes, documents, conditionId]);
    
    res.json({
      success: true,
      condition: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating condition:', error);
    res.status(500).json({ error: 'Failed to update condition' });
  }
});

/**
 * GET /api/standard-chattels
 * Get list of standard chattels for selection
 */
router.get('/standard-chattels', async (req, res) => {
  try {
    const query = 'SELECT * FROM standard_chattels ORDER BY category, display_order';
    const result = await db.query(query);
    
    // Group by category
    const grouped = result.rows.reduce((acc, chattel) => {
      if (!acc[chattel.category]) {
        acc[chattel.category] = [];
      }
      acc[chattel.category].push(chattel);
      return acc;
    }, {});
    
    res.json({
      success: true,
      chattels: grouped
    });
    
  } catch (error) {
    console.error('Error fetching standard chattels:', error);
    res.status(500).json({ error: 'Failed to fetch standard chattels' });
  }
});

/**
 * POST /api/offers/:offerId/chattels
 * Add chattels to offer (Step 4)
 */
router.post('/offers/:offerId/chattels', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { included, excluded } = req.body; // Arrays of chattel descriptions
    
    // Delete existing chattels
    await db.query('DELETE FROM offer_chattels WHERE offer_id = $1', [offerId]);
    
    const insertedChattels = [];
    
    // Insert included items
    if (Array.isArray(included)) {
      for (const item of included) {
        const query = `
          INSERT INTO offer_chattels (offer_id, chattel_type, item_description)
          VALUES ($1, 'included', $2)
          RETURNING *
        `;
        const result = await db.query(query, [offerId, item]);
        insertedChattels.push(result.rows[0]);
      }
    }
    
    // Insert excluded items
    if (Array.isArray(excluded)) {
      for (const item of excluded) {
        const query = `
          INSERT INTO offer_chattels (offer_id, chattel_type, item_description)
          VALUES ($1, 'excluded', $2)
          RETURNING *
        `;
        const result = await db.query(query, [offerId, item]);
        insertedChattels.push(result.rows[0]);
      }
    }
    
    // Update wizard step
    await db.query('UPDATE offers SET wizard_step = GREATEST(wizard_step, 4) WHERE id = $1', [offerId]);
    
    res.json({
      success: true,
      chattels: insertedChattels
    });
    
  } catch (error) {
    console.error('Error saving chattels:', error);
    res.status(500).json({ error: 'Failed to save chattels' });
  }
});

// ============================================================================
// OFFER SUBMISSION & DOCUMENT GENERATION
// ============================================================================

/**
 * POST /api/offers/:offerId/submit
 * Submit offer and generate ADLS form
 */
router.post('/offers/:offerId/submit', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // Validate offer is complete
    const offer = await db.query('SELECT * FROM offers WHERE id = $1', [offerId]);
    if (!offer.rows[0]) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    if (offer.rows[0].wizard_step < 4) {
      return res.status(400).json({ 
        error: 'Wizard incomplete',
        currentStep: offer.rows[0].wizard_step,
        requiredStep: 4
      });
    }
    
    // 1. Purchase ADLS form (integrate with ADLS API or payment gateway)
    // This would be an actual API call in production
    const adlsFormCost = 136.85;
    // await purchaseADLSForm(offerId); // Implement this
    
    // 2. Generate PDF with offer details
    // await generateOfferPDF(offerId); // Implement using pdf-lib or similar
    
    // 3. Update offer status
    const updateQuery = `
      UPDATE offers
      SET status = 'pending',
          wizard_completed = true,
          wizard_step = 5,
          submitted_at = NOW(),
          adls_form_purchased = true,
          adls_form_purchase_date = NOW(),
          adls_form_cost = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [adlsFormCost, offerId]);
    
    // 4. Log activity
    await db.query(
      `INSERT INTO offer_activities (offer_id, activity_type, description, created_by)
       VALUES ($1, 'offer_submitted', 'Offer submitted to vendor', $2)`,
      [offerId, req.user.id]
    );
    
    // 5. Send notifications (implement your notification system)
    // await sendOfferNotification(offerId);
    
    res.json({
      success: true,
      message: 'Offer submitted successfully',
      offer: result.rows[0],
      nextSteps: [
        'Vendor will review your offer',
        'You will be notified when vendor responds',
        'If accepted, you will need to satisfy conditions before settlement'
      ]
    });
    
  } catch (error) {
    console.error('Error submitting offer:', error);
    res.status(500).json({ error: 'Failed to submit offer' });
  }
});

/**
 * POST /api/offers/:offerId/sign
 * Initiate digital signing process
 */
router.post('/offers/:offerId/sign', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // Get offer and check if PDF is generated
    const offer = await db.query(
      'SELECT * FROM offers WHERE id = $1 AND pdf_generated = true',
      [offerId]
    );
    
    if (!offer.rows[0]) {
      return res.status(400).json({ 
        error: 'Offer PDF must be generated before signing'
      });
    }
    
    // Integrate with DocuSign/Annature
    // const envelopeId = await createDocuSignEnvelope(offerId);
    
    // For now, return mock response
    res.json({
      success: true,
      message: 'Signing process initiated',
      signingUrl: `https://housematch.co.nz/sign/${offerId}`,
      // envelopeId: envelopeId
    });
    
  } catch (error) {
    console.error('Error initiating signing:', error);
    res.status(500).json({ error: 'Failed to initiate signing' });
  }
});

// ============================================================================
// ACTIVITY & MESSAGING ROUTES
// ============================================================================

/**
 * GET /api/offers/:offerId/activities
 * Get activity timeline for an offer
 */
router.get('/offers/:offerId/activities', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const query = `
      SELECT a.*, u.full_name as created_by_name
      FROM offer_activities a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.offer_id = $1
      ORDER BY a.created_at DESC
    `;
    
    const result = await db.query(query, [offerId]);
    
    res.json({
      success: true,
      activities: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * POST /api/offers/:offerId/messages
 * Send a message related to the offer
 */
router.post('/offers/:offerId/messages', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { messageText } = req.body;
    
    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    
    const query = `
      INSERT INTO offer_messages (offer_id, sender_id, message_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await db.query(query, [offerId, req.user.id, messageText]);
    
    // Send notification to vendor
    // await notifyVendorOfMessage(offerId);
    
    res.json({
      success: true,
      message: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /api/offers/:offerId/messages
 * Get messages for an offer
 */
router.get('/offers/:offerId/messages', authenticateUser, verifyOfferOwnership, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const query = `
      SELECT m.*, u.full_name as sender_name
      FROM offer_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.offer_id = $1
      ORDER BY m.created_at ASC
    `;
    
    const result = await db.query(query, [offerId]);
    
    // Mark messages as read
    await db.query(
      'UPDATE offer_messages SET is_read = true, read_at = NOW() WHERE offer_id = $1 AND sender_id != $2',
      [offerId, req.user.id]
    );
    
    res.json({
      success: true,
      messages: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ============================================================================
// ADMIN/VENDOR ROUTES (Additional endpoints for vendor side)
// ============================================================================

/**
 * GET /api/properties/:propertyId/offers
 * Get all offers for a property (vendor view)
 */
router.get('/properties/:propertyId/offers', authenticateUser, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    // Verify user owns this property
    const propertyCheck = await db.query(
      'SELECT vendor_id FROM properties WHERE id = $1',
      [propertyId]
    );
    
    if (!propertyCheck.rows[0] || propertyCheck.rows[0].vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const query = `
      SELECT * FROM offer_details 
      WHERE property_id = $1 AND status != 'draft'
      ORDER BY offer_created_at DESC
    `;
    
    const result = await db.query(query, [propertyId]);
    
    res.json({
      success: true,
      offers: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching property offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

/**
 * PATCH /api/offers/:offerId/respond
 * Vendor responds to an offer (accept/reject)
 */
router.patch('/offers/:offerId/respond', authenticateUser, async (req, res) => {
  try {
    const { offerId } = req.params;
    const { response, counterOfferPrice, message } = req.body;
    
    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ 
        error: 'Invalid response',
        validResponses: ['accepted', 'rejected']
      });
    }
    
    // Verify user is vendor
    const offerCheck = await db.query(`
      SELECT o.id, p.vendor_id 
      FROM offers o
      JOIN properties p ON o.property_id = p.id
      WHERE o.id = $1
    `, [offerId]);
    
    if (!offerCheck.rows[0] || offerCheck.rows[0].vendor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update offer status
    const newStatus = response === 'accepted' ? 'conditional' : 'rejected';
    
    const query = `
      UPDATE offers
      SET status = $1,
          accepted_at = CASE WHEN $1 = 'conditional' THEN NOW() ELSE NULL END
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [newStatus, offerId]);
    
    // Log activity
    await db.query(
      `INSERT INTO offer_activities (offer_id, activity_type, description, created_by)
       VALUES ($1, $2, $3, $4)`,
      [offerId, 'vendor_response', `Vendor ${response} offer`, req.user.id]
    );
    
    // Send message if provided
    if (message) {
      await db.query(
        `INSERT INTO offer_messages (offer_id, sender_id, message_text)
         VALUES ($1, $2, $3)`,
        [offerId, req.user.id, message]
      );
    }
    
    res.json({
      success: true,
      message: `Offer ${response}`,
      offer: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error responding to offer:', error);
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

// ============================================================================
// EXPORT ROUTES
// ============================================================================

export default router;

// Example usage in your main app:
// import offerRoutes from './routes/offers';
// app.use('/api', offerRoutes);

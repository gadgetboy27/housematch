# 🛒 Purchase Process Flow - Complete Guide

## Overview
This document explains the complete purchase flow for property reports in housematch.nz, from checkout to order creation.

## 📊 The Complete Purchase Flow

### Step 1: Checkout Session Creation
**Endpoint:** `POST /api/stripe/create-checkout-session`

**What happens:**
1. User selects a property and report type on `/reports` page
2. Frontend calls the checkout session endpoint with:
   - `planId` (e.g., "title_search", "lim_auckland")
   - `planType` ("report" or "service")
   - `metadata` containing:
     - `propertyId`
     - `propertyAddress`
     - `propertyTitle`
     - `provider`
     - `estimatedDays`

**Backend processing:**
```
📝 Creating checkout session
💰 Report/Service payment: { price, name, description }
✅ Stripe session created: cs_test_...
💾 Payment session created with propertyData: { ... }
```

**Database records created:**
- `propertyPaymentSessions` record with:
  - `stripeSessionId` - Links to Stripe
  - `userId` - Who's buying
  - `planId` - What they're buying
  - `planType` - Type of purchase (report/service/listing/storage)
  - `amountCents` - Price in cents
  - `propertyData` - All metadata about the property/report
  - `status: 'pending'`
  - `expiresAt` - 24 hours from now

**Frontend response:**
- User is redirected to Stripe checkout page
- URL: `https://checkout.stripe.com/...`

---

### Step 2: User Completes Payment on Stripe
**What happens:**
1. User enters payment details on Stripe's secure checkout page
2. Stripe processes the payment
3. Stripe redirects user back to your app

**Redirect URL:**
```
https://your-domain.replit.app/payment-success?session_id={CHECKOUT_SESSION_ID}
```

---

### Step 3: Payment Success Handler
**Endpoint:** `GET /api/stripe/payment-success`

**What happens:**
```
🎯 PAYMENT SUCCESS ENDPOINT CALLED
🔍 Retrieving Stripe session: cs_test_...
✅ Stripe session retrieved: {
  id, payment_status: 'paid', amount_total, metadata
}
🔍 Looking up payment session in database...
✅ Payment session found: {
  id, userId, planType: 'report', planId, status: 'pending'
}
```

**For Report/Service Purchases:**
```
📄 ===== PROCESSING REPORT PURCHASE =====
Plan ID: title_search
User ID: be5aabe5-ea44-492e-82f9-06cfa5fed0cf
Amount: 15.00 NZD
📦 Metadata: { propertyId, provider, estimatedDays, ... }
🏠 Property ID: bc192078-599b-4403-9248-9c5f8d058f9b
✅ Property found: { title, address }
📋 Provider: linz
💾 Creating purchase order...
```

**Database records created:**
1. **Purchase Order** (`purchaseOrders`):
   ```javascript
   {
     id: "generated-uuid",
     userId: "user-id",
     propertyId: "property-id",
     reportType: "title_search",
     provider: "linz",
     status: "pending",
     price: "15.00",
     propertyAddress: "1 Test Lane",
     propertyTitle: "Modern Family Home",
     stripeSessionId: "cs_test_...",
     paidAt: "2025-10-25T18:58:51.000Z",
     metadata: { ... },
     amountCents: 1500,
     stripePaymentIntentId: "pi_..."
   }
   ```

2. **Transaction Record** (`transactions`):
   ```javascript
   {
     userId: "user-id",
     amountCents: 1500,
     netCents: 1500,
     type: "revenue",
     source: "stripe",
     category: "report_purchase",
     description: "Report purchase - title_search",
     stripeTransactionId: "pi_..."
   }
   ```

3. **Payment Session Update**:
   - `status: 'completed'`
   - `completedAt: now()`
   - `stripePaymentIntentId: "pi_..."`

**Logs:**
```
✅ ===== PURCHASE ORDER CREATED =====
Order ID: xyz-123
Order Details: {
  reportType: 'title_search',
  provider: 'linz',
  status: 'pending',
  price: '15.00',
  propertyAddress: '1 Test Lane'
}
💾 Updating payment session status to completed...
✅ Payment session marked as completed
💰 Creating transaction record...
✅ Transaction record created
🎉 ===== PURCHASE COMPLETE =====
```

---

## 🔍 What to Look for in Logs

### ✅ SUCCESSFUL PURCHASE FLOW:
```
1. 📝 Creating checkout session
2. ✅ Stripe session created
3. 💾 Payment session created
4. [User pays on Stripe]
5. 🎯 PAYMENT SUCCESS ENDPOINT CALLED
6. ✅ Stripe session retrieved
7. ✅ Payment session found
8. 📄 ===== PROCESSING REPORT PURCHASE =====
9. ✅ ===== PURCHASE ORDER CREATED =====
10. 💰 Creating transaction record
11. 🎉 ===== PURCHASE COMPLETE =====
```

### ⚠️ INCOMPLETE PURCHASE (User didn't pay):
```
1. 📝 Creating checkout session
2. ✅ Stripe session created
3. 💾 Payment session created
4. [User closes Stripe page without paying]
5. [No further logs - payment not completed]
```

### ❌ ERROR SCENARIOS:

**Missing Session ID:**
```
🎯 PAYMENT SUCCESS ENDPOINT CALLED
❌ Missing session_id
```

**Payment Not Completed:**
```
✅ Stripe session retrieved: { payment_status: 'unpaid' }
❌ Payment not completed. Status: unpaid
```

**Database Issue:**
```
🔍 Looking up payment session in database...
❌ Payment session not found in database
```

---

## 📋 Database Tables Involved

### 1. `propertyPaymentSessions`
- **Purpose:** Track payment attempts and store metadata
- **Key Fields:**
  - `stripeSessionId` - Links to Stripe checkout session
  - `propertyData` - Stores all purchase metadata
  - `status` - 'pending' → 'completed'
  - `expiresAt` - Auto-cleanup after 24 hours

### 2. `purchaseOrders`
- **Purpose:** Track report purchases
- **Key Fields:**
  - `reportType` - What report was purchased
  - `provider` - Who will fulfill it (LINZ, Council, etc.)
  - `status` - 'pending' → 'processing' → 'completed'
  - `propertyId` - Which property it's for
  - `paidAt` - When payment was received

### 3. `transactions`
- **Purpose:** Financial record keeping
- **Key Fields:**
  - `type: 'revenue'` - Money coming in
  - `category: 'report_purchase'`
  - `amountCents` - Amount in cents
  - `stripeTransactionId` - Links to Stripe payment

---

## 🧪 Testing the Flow

### Manual Test Steps:
1. **Start:** Go to `/reports` page
2. **Select:** Choose a property from dropdown
3. **Choose:** Select a report (e.g., Title Search - $15)
4. **Click:** "Purchase Report" button
5. **Watch Logs:** Look for "Creating checkout session"
6. **Pay:** Use Stripe test card: `4242 4242 4242 4242`
7. **Watch Logs:** Look for "PAYMENT SUCCESS ENDPOINT CALLED"
8. **Verify:** Check for "PURCHASE ORDER CREATED"

### Stripe Test Cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- Any future expiry date, any CVC

### Check Database:
```sql
-- Check payment sessions
SELECT * FROM property_payment_sessions ORDER BY created_at DESC LIMIT 5;

-- Check purchase orders
SELECT * FROM purchase_orders ORDER BY created_at DESC LIMIT 5;

-- Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
```

---

## 🚨 Common Issues

### Issue: No purchase order created
**Cause:** User didn't complete payment on Stripe
**Solution:** Use test card and complete checkout

### Issue: "Payment session not found"
**Cause:** Database session expired or wrong session ID
**Solution:** Check `propertyPaymentSessions` table

### Issue: Duplicate purchases
**Cause:** User clicked back button and paid twice
**Prevention:** Payment success handler checks `status === 'completed'`

---

## 📬 Next Steps After Purchase

### Current Implementation:
- ✅ Purchase order created with status 'pending'
- ✅ Transaction recorded
- ✅ Payment session marked complete
- 📋 Log: "Report order queued for processing"

### Future Enhancements:
1. **Email Notifications:**
   - Send order confirmation email
   - Send "report ready" email when completed

2. **Report Generation:**
   - For API reports (LINZ, MBIE): Auto-generate via API
   - For assisted reports (LIM, inspections): Email admin team

3. **Status Updates:**
   - Allow users to track report status
   - Update status: pending → processing → completed

---

## 📊 Analytics & Monitoring

### Key Metrics to Track:
1. **Conversion Rate:** Checkout sessions created vs. completed
2. **Average Order Value:** Total revenue / number of orders
3. **Popular Reports:** Which report types sell most
4. **Processing Time:** Time from purchase to delivery

### Current Logs Provide:
- ✅ Session creation timestamps
- ✅ Payment completion timestamps
- ✅ Purchase amounts and types
- ✅ User IDs for attribution

---

## 🎯 Summary

The purchase flow is **fully functional** with comprehensive logging at every step. When a user completes a purchase:

1. ✅ Stripe checkout session created
2. ✅ Payment session stored in database
3. ✅ User pays on Stripe
4. ✅ Purchase order created
5. ✅ Transaction recorded
6. ✅ All data persisted correctly

**To verify purchases are working:** Look for the complete log sequence from "Creating checkout session" → "PURCHASE COMPLETE" in your server logs.

# Supplier API Integration Flow

## Overview
This document maps the complete flow from payment success to supplier API calls for property report fulfillment.

---

## Supplier Types & Routing Map

### 1. **API-Based Suppliers** (Automatic Processing)
Reports are generated instantly via API calls:

| Report Type | Provider | Provider ID | API Endpoint | Authentication |
|------------|----------|-------------|--------------|----------------|
| Title Search | LINZ | `linz` | `https://data.linz.govt.nz/services` | API Key Required |
| Rental Data | MBIE | `mbie` | `https://api.business.govt.nz/gateway/tenancy-services` | API Key Required |

**Processing Flow:**
```
Payment Success
  → Create purchaseOrder (status: 'pending')
  → Call API immediately
  → Generate white-labeled PDF
  → Create propertyReport record
  → Update purchaseOrder (status: 'completed')
  → Email user with report link
```

---

### 2. **Assisted Suppliers** (Manual Submission)
Reports require human submission to external providers:

| Report Type | Provider | Provider ID | Submission Method | Turnaround |
|------------|----------|-------------|-------------------|------------|
| LIM Auckland | Auckland Council | `auckland_council` | Online form + Email | 10 days |
| LIM Wellington | Wellington Council | `wellington_council` | Online form + Email | 10 days |
| LIM Christchurch | Christchurch Council | `christchurch_council` | Online form + Email | 10 days |
| Building Inspection | HPPI | `hppi` | Email booking | 5 days |
| Building Inspection | Red LBP | `red_lbp` | Email booking | 5 days |

**Processing Flow:**
```
Payment Success
  → Create purchaseOrder (status: 'pending')
  → Send internal notification email to admin
  → Admin manually submits to provider
  → Update purchaseOrder (status: 'processing', providerOrderId: 'REF123')
  → Wait for provider to deliver
  → Upload PDF to system
  → Create propertyReport record
  → Update purchaseOrder (status: 'completed')
  → Email user with report link
```

---

## Payment Success Handler Logic

### Current Implementation (server/routes.ts)
```typescript
// Line 2281-2336
else if (paymentSession.planType === 'report' || paymentSession.planType === 'service') {
  // 1. Extract metadata
  const metadata = session.metadata || {};
  
  // 2. Get report config to determine provider
  const reportConfig = reportTypes[paymentSession.planId];
  const provider = reportConfig?.provider;
  
  // 3. Create purchase order
  const [purchaseOrder] = await db.insert(purchaseOrders).values({
    userId: paymentSession.userId,
    propertyId: metadata.propertyId,
    reportType: paymentSession.planId,
    provider: provider.id,  // 'linz', 'mbie', 'auckland_council', etc.
    status: 'pending',
    amountCents: paymentSession.amountCents,
    stripePaymentIntentId: session.payment_intent,
    metadata: metadata,  // Store propertyId, reportType, etc.
  });
  
  // 4. Route to appropriate handler
  if (provider.type === 'api') {
    await processApiReport(purchaseOrder);
  } else if (provider.type === 'assisted') {
    await notifyAdminForManualProcessing(purchaseOrder);
  }
}
```

---

## Required Environment Variables

### API Keys Needed:
```env
# LINZ API
LINZ_API_KEY=your_linz_api_key_here

# MBIE API
MBIE_API_KEY=your_mbie_api_key_here
```

---

## Database Schema Requirements

### purchaseOrders Table (✅ Already Exists)
```typescript
{
  id: uuid,
  userId: uuid,
  propertyId: uuid,          // ✅ Already exists
  reportType: string,        // 'title_search', 'rental_data', 'lim_auckland', etc.
  provider: string,          // ✅ Already exists - 'linz', 'mbie', 'auckland_council'
  providerOrderId: string,   // ✅ Already exists - External reference ID
  status: string,            // ✅ Already exists - 'pending', 'processing', 'completed', 'failed'
  metadata: json,            // ✅ Already exists - Stores propertyId, provider details
  amountCents: integer,
  stripePaymentIntentId: string,
  paidAt: timestamp,
  completedAt: timestamp,
  createdAt: timestamp,
}
```

### ✅ Schema is Already Complete!

---

## Report Processing Service (TO BUILD)

### File: `server/services/reportProcessor.ts`

```typescript
import { reportTypes } from '@shared/reportConfig';

export async function processReportOrder(purchaseOrder: PurchaseOrder) {
  const reportConfig = reportTypes[purchaseOrder.reportType];
  const provider = reportConfig.provider;
  
  switch (provider.type) {
    case 'api':
      return await processApiReport(purchaseOrder, reportConfig);
    case 'assisted':
      return await notifyAssistedReport(purchaseOrder, reportConfig);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

async function processApiReport(order: PurchaseOrder, config: ReportType) {
  switch (config.provider.id) {
    case 'linz':
      return await callLinzApi(order);
    case 'mbie':
      return await callMbieApi(order);
    default:
      throw new Error(`No API handler for: ${config.provider.id}`);
  }
}

async function callLinzApi(order: PurchaseOrder) {
  // Get property details
  const property = await getProperty(order.propertyId);
  
  // Call LINZ API
  const response = await fetch(`${process.env.LINZ_API_ENDPOINT}/title-search`, {
    headers: { 'Authorization': `Bearer ${process.env.LINZ_API_KEY}` },
    body: JSON.stringify({
      address: property.address,
      certificateOfTitle: property.certificateOfTitle,
    }),
  });
  
  // Generate white-labeled PDF
  const pdfBuffer = await generateBrandedPdf(response.data, 'Title Search');
  
  // Upload to object storage
  const pdfUrl = await uploadToStorage(pdfBuffer, `reports/${order.id}.pdf`);
  
  // Create report record
  await db.insert(propertyReports).values({
    orderId: order.id,
    userId: order.userId,
    propertyId: order.propertyId,
    reportType: 'title_search',
    provider: 'linz',
    pdfUrl,
    rawData: response.data,
    status: 'completed',
  });
  
  // Update order status
  await db.update(purchaseOrders)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(purchaseOrders.id, order.id));
  
  // Send email notification
  await emailService.sendReportReady(order.userId, order.id);
}

async function notifyAssistedReport(order: PurchaseOrder, config: ReportType) {
  // Send email to admin team for manual processing
  await emailService.sendAdminNotification({
    subject: `New ${config.name} Order`,
    orderId: order.id,
    provider: config.provider.name,
    propertyAddress: order.propertyAddress,
    instructions: getSubmissionInstructions(config.provider.id),
  });
  
  // Update status to processing
  await db.update(purchaseOrders)
    .set({ status: 'processing' })
    .where(eq(purchaseOrders.id, order.id));
}
```

---

## Next Steps

### ✅ Phase 1: Schema (COMPLETE)
- purchaseOrders table has all required fields
- Metadata stores propertyId and provider info

### 🔨 Phase 2: Report Processor Service (TO DO)
1. Create `server/services/reportProcessor.ts`
2. Implement `processReportOrder()` function
3. Add LINZ API integration
4. Add MBIE API integration
5. Add admin notification for assisted reports

### 🔨 Phase 3: Payment Success Integration (TO DO)
1. Update `/api/stripe/payment-success` to call `processReportOrder()`
2. Handle API reports automatically
3. Queue assisted reports for manual processing

### 🔨 Phase 4: Admin Dashboard (TO DO)
1. Show pending assisted orders
2. Allow status updates and providerOrderId entry
3. Upload final reports

---

## Provider Contact Matrix

| Provider | Contact Method | Turnaround | Cost Structure |
|----------|----------------|------------|----------------|
| LINZ | API (instant) | 0 days | $8 per search |
| MBIE | API (instant) | 0 days | Free (government data) |
| Auckland Council | https://forms.aucklandcouncil.govt.nz | 10 days | $375 standard, $506 urgent |
| Wellington Council | https://wellington.govt.nz/forms/lim | 10 days | $563.50 standard |
| Christchurch Council | council@ccc.govt.nz | 10 days | $319 |
| HPPI | bookings@hppi.co.nz | 5 days | $699 |
| Red LBP | info@redlbp.co.nz | 5 days | $699 |

---

## Summary

**Current State:**
✅ Schema ready
✅ Payment flow captures provider info
✅ Purchase orders created with correct metadata

**Next Required:**
🔨 Build report processor service
🔨 Integrate LINZ & MBIE APIs
🔨 Set up admin notifications for assisted reports
🔨 Build admin dashboard for manual order tracking

**Provider Routing is Simple:**
- Read `purchaseOrder.provider` field
- Check `reportTypes[reportType].provider.type`
- Route to API handler or admin notification

No complex routing needed - the `reportConfig.ts` already contains all the mapping!

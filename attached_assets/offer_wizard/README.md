# HouseMatch Offer Wizard - Complete Implementation Guide

A comprehensive database schema and API system for managing property offers with ADLS (Auckland District Law Society) legal document integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Wizard Flow](#wizard-flow)
- [Implementation Guide](#implementation-guide)
- [Legal Compliance](#legal-compliance)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🎯 Overview

This system enables buyers to create legally compliant property purchase offers through a guided wizard interface. It integrates with ADLS forms (11th Edition 2022) - the standard legal documents for property sales in New Zealand.

### What This System Does

1. **Guided Offer Creation**: Step-by-step wizard for buyers to create offers
2. **Legal Compliance**: Uses legitimate ADLS forms ($136.85 per transaction)
3. **Condition Management**: Tracks finance, LIM reports, building inspections, etc.
4. **Digital Signing**: Integrates with DocuSign/Annature
5. **Communication**: Built-in messaging between buyers and vendors
6. **Activity Tracking**: Complete audit trail of all offer-related actions

### What This System Does NOT Do

- ❌ Generate fake legal documents
- ❌ Provide legal advice (users still need conveyancers/lawyers)
- ❌ Modify ADLS clause wording (standardized for legal reasons)

---

## ✨ Features

### For Buyers

- **Smart Offer Wizard**: 5-step process to create complete offers
- **Condition Tracking**: Monitor progress on finance, inspections, etc.
- **Real-time Updates**: Get notified when vendor responds
- **Digital Signatures**: Sign documents remotely
- **Chat with Vendor**: Direct communication channel

### For Vendors

- **Offer Dashboard**: View all offers on your property
- **Accept/Reject**: Respond to offers with optional messages
- **Counter Offers**: Propose different prices
- **Offer Comparison**: Compare multiple offers side-by-side

### System Features

- **ADLS Integration**: Purchase and fill legitimate forms
- **PDF Generation**: Auto-generate completed contracts
- **Activity Logging**: Complete audit trail
- **Status Workflow**: Track offers from draft to settlement
- **Conditional Periods**: Automatic date calculations

---

## 🗄️ Database Schema

### Core Tables

#### `offers`
Main table storing offer details and status.

```sql
Key Fields:
- id: UUID primary key
- property_id: Reference to property
- buyer_id: Reference to user
- offer_price: Buyer's offered price
- deposit_amount: Usually 10% of offer price
- settlement_date: When settlement will occur
- status: Current offer status (draft, pending, accepted, etc.)
- wizard_step: Current step in wizard (1-5)
```

**Status Flow:**
```
draft → pending → conditional → unconditional → settled
                ↓
              rejected / withdrawn
```

#### `offer_buyer_details`
Stores buyer's solicitor/conveyancer information.

```sql
Key Fields:
- has_solicitor: Boolean
- solicitor_name, solicitor_firm, solicitor_email
- solicitor_phone, solicitor_address
```

#### `offer_conditions`
Conditions that must be satisfied before the offer becomes unconditional.

```sql
Key Fields:
- condition_type: finance | lim_report | building_inspection | etc.
- description: Human-readable description
- days_to_satisfy: Number of working days to satisfy
- due_date: Calculated deadline
- status: pending | satisfied | waived | failed
```

**Common Conditions:**
- Finance approval (most common)
- LIM (Land Information Memorandum) report
- Building inspection report
- Title search
- Valuation report
- Sale of buyer's existing property

#### `offer_chattels`
Items included or excluded from the sale.

```sql
Key Fields:
- chattel_type: 'included' | 'excluded'
- item_description: e.g., "Fixed floor coverings"
- is_standard: Whether from standard list
```

#### `offer_activities`
Complete audit trail of all actions.

```sql
Key Fields:
- activity_type: offer_created | status_changed | condition_satisfied | etc.
- description: Human-readable activity description
- metadata: JSONB with additional context
```

#### `offer_messages`
Communication between buyer and vendor.

```sql
Key Fields:
- sender_id: Who sent the message
- message_text: Message content
- is_read: Whether recipient has read it
```

### Helper Tables

- `standard_chattels`: Pre-populated list of common chattels
- `properties`: Property listings (assumed to exist)
- `users`: User accounts (assumed to exist)

### Database Views

#### `offer_details`
Denormalized view combining offer, property, and buyer information for efficient querying.

---

## 🔌 API Routes

### Offer Management

#### Create Offer
```http
POST /api/offers
Content-Type: application/json

{
  "propertyId": "uuid",
  "offerPrice": 850000,
  "depositAmount": 85000,
  "settlementDate": "2025-12-01"
}
```

#### Get User's Offers
```http
GET /api/offers?status=pending&propertyId=uuid
```

#### Get Single Offer
```http
GET /api/offers/:offerId
```
Returns complete offer with conditions, chattels, and activities.

#### Update Offer
```http
PATCH /api/offers/:offerId
Content-Type: application/json

{
  "offer_price": 860000,
  "wizard_step": 2
}
```

#### Withdraw Offer
```http
DELETE /api/offers/:offerId
```
Soft delete - sets status to 'withdrawn'.

### Wizard Steps

#### Step 2: Save Buyer Details
```http
POST /api/offers/:offerId/buyer-details
Content-Type: application/json

{
  "hasSolicitor": true,
  "solicitorName": "Jane Smith",
  "solicitorFirm": "Smith & Associates",
  "solicitorEmail": "jane@smithlaw.co.nz",
  "solicitorPhone": "09-123-4567",
  "solicitorAddress": "123 Queen St, Auckland"
}
```

#### Step 3: Add Conditions
```http
POST /api/offers/:offerId/conditions
Content-Type: application/json

{
  "conditions": [
    {
      "conditionType": "finance",
      "description": "Subject to finance approval",
      "daysToSatisfy": 10
    },
    {
      "conditionType": "building_inspection",
      "description": "Subject to satisfactory building inspection",
      "daysToSatisfy": 7
    }
  ]
}
```

#### Step 4: Add Chattels
```http
POST /api/offers/:offerId/chattels
Content-Type: application/json

{
  "included": [
    "Fixed floor coverings",
    "Blinds and curtains",
    "Dishwasher",
    "Heat pump"
  ],
  "excluded": [
    "Fridge/Freezer",
    "Washing machine"
  ]
}
```

#### Step 5: Submit Offer
```http
POST /api/offers/:offerId/submit
```

This endpoint:
1. Validates wizard completion
2. Purchases ADLS form ($136.85)
3. Generates PDF with offer details
4. Updates status to 'pending'
5. Notifies vendor

### Document Management

#### Initiate Digital Signing
```http
POST /api/offers/:offerId/sign
```

Integrates with DocuSign/Annature to create signing envelope.

### Communication

#### Get Activities
```http
GET /api/offers/:offerId/activities
```

#### Send Message
```http
POST /api/offers/:offerId/messages
Content-Type: application/json

{
  "messageText": "I'm flexible on the settlement date if needed."
}
```

#### Get Messages
```http
GET /api/offers/:offerId/messages
```

### Vendor Routes

#### Get Property Offers
```http
GET /api/properties/:propertyId/offers
```

#### Respond to Offer
```http
PATCH /api/offers/:offerId/respond
Content-Type: application/json

{
  "response": "accepted",
  "message": "We accept your offer. Looking forward to working with you."
}
```

---

## 🎯 Wizard Flow

### Step 1: Property & Price Details

**Data Collected:**
- Property ID (from listing they swiped on)
- Offer price
- Deposit amount (defaults to 10%)
- Preferred settlement date

**Validation:**
- Offer price must be positive
- Deposit must not exceed offer price
- Settlement date must be in future

### Step 2: Buyer Information

**Data Collected:**
- Does buyer have a solicitor?
- If yes:
  - Solicitor name
  - Law firm name
  - Contact details (email, phone, address)

**Note:** If buyer doesn't have a solicitor, you can suggest partnering conveyancers here.

### Step 3: Conditions

**Common Conditions:**

1. **Finance** (Most common - 90%+ of offers)
   - Description: "Subject to buyer obtaining finance approval"
   - Typical days: 10 working days
   - What it means: Buyer must get bank loan approved

2. **LIM Report**
   - Description: "Subject to buyer being satisfied with LIM report"
   - Typical days: 10 working days
   - Cost: $200-400 from council
   - What it covers: Rates, building consents, property info

3. **Building Inspection**
   - Description: "Subject to buyer being satisfied with building inspection"
   - Typical days: 10 working days
   - Cost: $400-800
   - What it covers: Structural issues, weathertightness, etc.

4. **Title Search**
   - Description: "Subject to buyer being satisfied with title search"
   - Typical days: 5 working days
   - Cost: ~$23
   - What it covers: Property boundaries, easements, covenants

5. **Valuation**
   - Description: "Subject to property valuing at offer price"
   - Typical days: 10 working days
   - What it means: Bank's valuer must agree property is worth the price

6. **Sale of Buyer's Property**
   - Description: "Subject to buyer selling existing property"
   - Typical days: 60+ days
   - What it means: Buyer must sell their current home first

**UI Suggestion:**
- Show checkboxes for common conditions
- Pre-fill descriptions
- Allow custom conditions
- Show "typical days" as suggestions

### Step 4: Chattels

**What are Chattels?**
Items that are not permanently fixed to the property but could be included in the sale.

**Standard Included Items:**
- Fixed floor coverings (carpet, vinyl)
- Blinds and curtains
- Light fittings
- Stove, oven, rangehood
- Dishwasher
- Heat pumps
- Fixed heaters
- Alarm system
- Letterbox

**Typically Excluded:**
- Freestanding furniture
- Washing machine
- Dryer
- Fridge/Freezer
- Wall art
- Outdoor furniture

**UI Suggestion:**
- Two lists: "Included" and "Excluded"
- Pre-populate with `standard_chattels` table
- Let user modify/add custom items
- Make it clear what stays and what goes

### Step 5: Review & Submit

**What Happens Here:**

1. **Review Screen**
   - Show all entered information
   - Allow editing any section
   - Display ADLS form cost: $136.85

2. **On Submit:**
   - Purchase ADLS form (API call or payment)
   - Generate PDF with collected data
   - Change status: draft → pending
   - Log activity
   - Send notification to vendor
   - Show success message with next steps

3. **Next Steps Message:**
   ```
   ✅ Offer submitted successfully!
   
   What happens next:
   1. Vendor will review your offer
   2. You'll be notified when they respond
   3. If accepted, you'll need to satisfy conditions before settlement
   4. Keep an eye on your condition due dates
   
   Typical response time: 1-3 days
   ```

---

## 🚀 Implementation Guide

### Prerequisites

```bash
# Database
PostgreSQL 14+

# Backend
Node.js 18+
Express.js
pg (node-postgres)

# Frontend (suggested)
React/Next.js
TypeScript
Tailwind CSS
```

### Step 1: Database Setup

```bash
# Connect to your database
psql -U your_user -d housematch_db

# Run the schema file
\i offer-wizard-schema.sql
```

This will:
- Create all tables
- Set up indexes
- Add triggers for timestamps
- Seed standard chattels data

### Step 2: Environment Variables

```env
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/housematch_db
ADLS_API_KEY=your_adls_api_key
DOCUSIGN_API_KEY=your_docusign_key
DOCUSIGN_ACCOUNT_ID=your_account_id
```

### Step 3: Install Dependencies

```bash
npm install express pg dotenv
npm install --save-dev @types/node @types/express typescript
```

### Step 4: Set Up API Routes

```javascript
// server.js
import express from 'express';
import offerRoutes from './routes/offer-wizard-routes.js';

const app = express();

app.use(express.json());
app.use('/api', offerRoutes);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Step 5: Build Frontend Wizard

```typescript
// Example React component structure
components/
  OfferWizard/
    Step1PropertyDetails.tsx
    Step2BuyerInfo.tsx
    Step3Conditions.tsx
    Step4Chattels.tsx
    Step5Review.tsx
    WizardProgress.tsx
```

**Wizard State Management:**

```typescript
// Use React Context or Zustand
interface WizardState {
  currentStep: number;
  offerId: string | null;
  offerData: CompleteWizardData;
  isLoading: boolean;
  errors: ValidationError[];
}
```

### Step 6: Integrate ADLS Forms

You have two options:

**Option A: Direct Purchase (Recommended)**
1. Contact ADLS: info@adls.org.nz
2. Request API access for bulk purchases
3. Implement `purchaseADLSForm()` function
4. Store transaction ID in database

**Option B: Pre-purchased Forms**
1. Purchase forms in advance
2. Store PDFs in secure storage
3. Fill programmatically using pdf-lib
4. Track usage for accounting

### Step 7: PDF Generation

```typescript
import { PDFDocument } from 'pdf-lib';

async function generateOfferPDF(offerId: string) {
  // 1. Fetch offer data
  const offer = await getCompleteOffer(offerId);
  
  // 2. Load ADLS template
  const templatePdf = await PDFDocument.load(adlsTemplate);
  
  // 3. Fill in fields
  const form = templatePdf.getForm();
  form.getTextField('purchaser_name').setText(offer.buyer_name);
  form.getTextField('purchase_price').setText(offer.offer_price.toString());
  // ... fill all fields
  
  // 4. Save
  const pdfBytes = await templatePdf.save();
  const pdfUrl = await uploadToS3(pdfBytes, `offer-${offerId}.pdf`);
  
  // 5. Update database
  await db.query(
    'UPDATE offers SET pdf_generated = true, pdf_url = $1 WHERE id = $2',
    [pdfUrl, offerId]
  );
  
  return pdfUrl;
}
```

### Step 8: Digital Signing Integration

```typescript
import docusign from 'docusign-esign';

async function createSigningEnvelope(offerId: string) {
  const offer = await getCompleteOffer(offerId);
  const apiClient = new docusign.ApiClient();
  
  // Configure DocuSign
  apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
  
  // Create envelope
  const envelope = new docusign.EnvelopeDefinition();
  envelope.emailSubject = `Property Offer - ${offer.property_address}`;
  
  // Add document
  const doc = new docusign.Document();
  doc.documentBase64 = await getPDFBase64(offer.pdf_url);
  doc.name = 'Offer to Purchase';
  doc.fileExtension = 'pdf';
  doc.documentId = '1';
  envelope.documents = [doc];
  
  // Add signers
  const buyerSigner = docusign.Signer.constructFromObject({
    email: offer.buyer_email,
    name: offer.buyer_name,
    recipientId: '1',
    routingOrder: '1'
  });
  
  const vendorSigner = docusign.Signer.constructFromObject({
    email: offer.vendor_email,
    name: offer.vendor_name,
    recipientId: '2',
    routingOrder: '2'
  });
  
  envelope.recipients = new docusign.Recipients();
  envelope.recipients.signers = [buyerSigner, vendorSigner];
  
  // Send
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
  
  // Save envelope ID
  await db.query(
    'UPDATE offers SET docusign_envelope_id = $1, docusign_status = $2 WHERE id = $3',
    [result.envelopeId, 'sent', offerId]
  );
  
  return result;
}
```

---

## ⚖️ Legal Compliance

### What You MUST Do

1. **Use Legitimate ADLS Forms**
   - Purchase from adls.org.nz
   - Cost: $136.85 per Agreement for Sale & Purchase
   - Track purchases for accounting

2. **Don't Provide Legal Advice**
   - Add disclaimer: "Not legal advice. Consult your solicitor."
   - Recommend users engage conveyancers
   - Partner with law firms if possible

3. **Don't Modify ADLS Clauses**
   - Fill in fields only
   - Don't change legal wording
   - Standard clauses exist for legal reasons

4. **Privacy Compliance**
   - Store personal data securely
   - Comply with Privacy Act 2020 (NZ)
   - Have clear privacy policy
   - Allow data export/deletion

### Suggested Disclaimers

**On Wizard Start:**
```
⚠️ Important Notice

This wizard helps you create a property offer, but it is not a 
substitute for legal advice. We strongly recommend engaging a 
solicitor or conveyancer before making an offer.

The Agreement for Sale & Purchase is a legally binding contract. 
Make sure you understand all conditions and obligations before signing.

Need a lawyer? [View our recommended conveyancers]
```

**Before Final Submit:**
```
📋 Before You Submit

✅ I have reviewed all details carefully
✅ I understand this is a legally binding offer
✅ I have consulted (or will consult) a solicitor
✅ I can meet the settlement date and conditions

Cost: $136.85 will be charged for the ADLS form
```

### Partner with Conveyancers

Consider partnering with firms like:
- conveyancing.co.nz
- Proppy (digital conveyancing startup)
- Convey Law
- Legal Vision NZ

**Partnership Benefits:**
- Referral fees
- Better user experience
- Legal compliance support
- Streamlined process

---

## 🧪 Testing

### Unit Tests

```typescript
// Example test for offer creation
describe('POST /api/offers', () => {
  it('should create offer with valid data', async () => {
    const response = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        propertyId: testPropertyId,
        offerPrice: 800000,
        settlementDate: '2025-12-01'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.offer).toHaveProperty('id');
    expect(response.body.offer.status).toBe('draft');
  });
  
  it('should reject offer with invalid price', async () => {
    const response = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        propertyId: testPropertyId,
        offerPrice: -1000,
        settlementDate: '2025-12-01'
      });
    
    expect(response.status).toBe(400);
  });
});
```

### Integration Tests

Test the complete wizard flow:

```typescript
describe('Offer Wizard Flow', () => {
  it('should complete full wizard', async () => {
    // Step 1: Create offer
    const offer = await createOffer({...});
    
    // Step 2: Add buyer details
    await addBuyerDetails(offer.id, {...});
    
    // Step 3: Add conditions
    await addConditions(offer.id, [{...}]);
    
    // Step 4: Add chattels
    await addChattels(offer.id, {...});
    
    // Step 5: Submit
    const submitted = await submitOffer(offer.id);
    
    expect(submitted.status).toBe('pending');
    expect(submitted.wizard_completed).toBe(true);
  });
});
```

### Manual Testing Checklist

- [ ] Create offer with minimum data
- [ ] Create offer with all optional fields
- [ ] Update offer at each wizard step
- [ ] Add multiple conditions
- [ ] Add custom chattels
- [ ] Submit complete offer
- [ ] Vendor accepts offer
- [ ] Vendor rejects offer
- [ ] Mark condition as satisfied
- [ ] Send messages
- [ ] Withdraw offer
- [ ] Test with expired session
- [ ] Test with invalid data
- [ ] Test concurrent edits

---

## 🚀 Deployment

### Database Migration

```bash
# Production deployment
psql $DATABASE_URL < offer-wizard-schema.sql
```

### Environment Setup

```yaml
# Neon/Supabase recommended for Postgres
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=20

# ADLS Integration
ADLS_API_KEY=...
ADLS_WEBHOOK_SECRET=...

# Digital Signing
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_ACCOUNT_ID=...
DOCUSIGN_WEBHOOK_URL=https://api.housematch.co.nz/webhooks/docusign

# File Storage (S3/R2)
S3_BUCKET=housematch-documents
S3_REGION=ap-southeast-2
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Notifications
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
```

### Monitoring

**Key Metrics to Track:**
- Offer creation rate
- Wizard completion rate (by step)
- Average time to complete wizard
- Offer acceptance rate
- Condition satisfaction rate
- ADLS form purchase costs

**Logging:**
```typescript
// Log important events
logger.info('Offer created', { offerId, buyerId, propertyId, price });
logger.info('Offer submitted', { offerId, conditions: conditionCount });
logger.warn('ADLS purchase failed', { offerId, error });
logger.error('PDF generation failed', { offerId, error });
```

### Security Considerations

1. **Authentication**
   - Require auth for all endpoints
   - Verify offer ownership
   - Rate limit API calls

2. **Data Validation**
   - Validate all inputs
   - Sanitize user content
   - Prevent SQL injection

3. **File Security**
   - Store PDFs in private S3 bucket
   - Generate signed URLs for access
   - Expire URLs after 1 hour

4. **Audit Trail**
   - Log all offer changes
   - Track who did what when
   - Store IP addresses for submissions

---

## 📚 Additional Resources

### ADLS Information
- Website: https://www.adls.org.nz
- Forms: https://shop.adls.org.nz
- Support: info@adls.org.nz

### NZ Property Law
- REINZ Guide: https://www.reinz.co.nz
- Land Information NZ: https://www.linz.govt.nz
- Property Law Act 2007

### Related Services
- LIM Reports: Contact local councils
- Building Inspections: Master Builders, House Check
- Conveyancing: conveyancing.co.nz, Proppy

---

## 🆘 Support & Troubleshooting

### Common Issues

**Q: Offer submission fails with "wizard incomplete"**
A: Check `wizard_step` - must be 4 or higher. Ensure all required steps completed.

**Q: PDF generation fails**
A: Check ADLS form template is valid PDF. Verify pdf-lib version compatibility.

**Q: Deposit calculation wrong**
A: Default is 10%. Can override with `depositAmount` parameter.

**Q: Condition due dates incorrect**
A: Due dates calculated backwards from `settlement_date` minus `days_to_satisfy`.

**Q: Can't update submitted offer**
A: Offers with status != 'draft' cannot be edited. Create new offer if needed.

### Database Issues

**Reset demo data:**
```sql
-- CAREFUL: Deletes all offers
DELETE FROM offer_messages;
DELETE FROM offer_activities;
DELETE FROM offer_chattels;
DELETE FROM offer_conditions;
DELETE FROM offer_buyer_details;
DELETE FROM offers;
```

**Check offer status distribution:**
```sql
SELECT status, COUNT(*) 
FROM offers 
GROUP BY status;
```

**Find stuck offers:**
```sql
SELECT * FROM offers 
WHERE status = 'pending' 
AND submitted_at < NOW() - INTERVAL '7 days';
```

---

## 📝 License & Usage

This schema and API design is provided for the HouseMatch platform. 

**Remember:**
- ADLS forms are copyrighted - purchase legitimately
- This code is a starting point - customize for your needs
- Always consult legal professionals for NZ property law
- Test thoroughly before production use

---

## 🎉 You're Ready!

You now have:
✅ Complete database schema
✅ RESTful API routes
✅ TypeScript types
✅ Implementation guide
✅ Legal compliance knowledge

**Next Steps:**
1. Set up your database
2. Implement the API routes
3. Build the frontend wizard
4. Contact ADLS for form access
5. Partner with conveyancers
6. Test thoroughly
7. Launch! 🚀

**Questions?** Review the HouseMatch legal docs conversation for more context on ADLS forms and NZ property law requirements.

Good luck building HouseMatch! 🏡

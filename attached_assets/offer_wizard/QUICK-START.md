# HouseMatch Offer Wizard - Quick Start Guide

Get your offer wizard up and running in 30 minutes! ⚡

## 📦 What You Got

- ✅ **offer-wizard-schema.sql** - Complete database schema
- ✅ **offer-wizard-routes.js** - RESTful API endpoints
- ✅ **offer-wizard-types.ts** - TypeScript type definitions
- ✅ **OfferWizard-React-Example.tsx** - Frontend component example
- ✅ **README.md** - Comprehensive documentation

## 🚀 Quick Setup (30 Minutes)

### Step 1: Database Setup (5 min)

```bash
# Connect to your Postgres database
psql $DATABASE_URL

# Run the schema
\i offer-wizard-schema.sql

# Verify tables created
\dt
```

You should see:
- offers
- offer_buyer_details
- offer_conditions
- offer_chattels
- offer_activities
- offer_messages
- standard_chattels

### Step 2: Install Backend Dependencies (2 min)

```bash
npm install express pg dotenv cors
npm install --save-dev typescript @types/node @types/express
```

### Step 3: Set Up API Server (10 min)

```javascript
// server.js
import express from 'express';
import pg from 'pg';
import offerRoutes from './offer-wizard-routes.js';

const { Pool } = pg;
const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Make pool available to routes
app.locals.db = pool;

// Middleware
app.use(express.json());
app.use('/api', offerRoutes);

// Start server
app.listen(3000, () => {
  console.log('🚀 Server running on http://localhost:3000');
});
```

**Important:** Update the route handlers to use `req.app.locals.db` instead of `db`:

```javascript
// In offer-wizard-routes.js, replace:
const result = await db.query(...);

// With:
const result = await req.app.locals.db.query(...);
```

### Step 4: Test the API (5 min)

```bash
# Start your server
node server.js

# Test with curl
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "123",
    "offerPrice": 800000,
    "settlementDate": "2025-12-01"
  }'
```

### Step 5: Add Frontend (8 min)

Copy `OfferWizard-React-Example.tsx` to your React/Next.js project:

```bash
# In your frontend project
mkdir -p components/offers
cp OfferWizard-React-Example.tsx components/offers/OfferWizard.tsx
```

Use it:

```tsx
import OfferWizard from '@/components/offers/OfferWizard';

export default function PropertyPage({ property }) {
  return (
    <div>
      <PropertyDetails property={property} />
      <OfferWizard 
        propertyId={property.id} 
        listingPrice={property.price} 
      />
    </div>
  );
}
```

## ✅ You're Live!

Your basic offer wizard is now working! Users can:
- Create offers
- Fill in buyer details
- Add conditions
- Select chattels
- Submit offers

## 🎨 Next Steps (Choose Your Priority)

### A. Make It Pretty (1-2 hours)
- [ ] Add Tailwind CSS styling
- [ ] Create loading states
- [ ] Add animations
- [ ] Responsive design for mobile

### B. Add ADLS Integration (2-4 hours)
- [ ] Contact ADLS for API access
- [ ] Implement PDF generation
- [ ] Add payment processing for $136.85 fee
- [ ] Store generated PDFs in S3/R2

### C. Digital Signing (3-5 hours)
- [ ] Sign up for DocuSign or Annature
- [ ] Implement envelope creation
- [ ] Add webhook handlers for signature events
- [ ] Update UI to show signing status

### D. Vendor Dashboard (4-6 hours)
- [ ] Build vendor offer list view
- [ ] Add accept/reject functionality
- [ ] Implement counter-offers
- [ ] Add messaging between buyer and vendor

### E. Condition Tracking (2-3 hours)
- [ ] Build condition management UI
- [ ] Add file upload for condition documents
- [ ] Implement due date reminders
- [ ] Track condition satisfaction status

## 🧪 Testing Checklist

Run through this flow to verify everything works:

1. **Create Draft Offer**
   ```bash
   POST /api/offers
   # Should return offer with status='draft'
   ```

2. **Complete Wizard Steps**
   ```bash
   POST /api/offers/:id/buyer-details
   POST /api/offers/:id/conditions
   POST /api/offers/:id/chattels
   ```

3. **Submit Offer**
   ```bash
   POST /api/offers/:id/submit
   # Should change status to 'pending'
   ```

4. **View Offer**
   ```bash
   GET /api/offers/:id
   # Should return complete offer with all details
   ```

5. **Test Error Cases**
   - Submit without completing wizard
   - Create offer with invalid price
   - Update offer after submission

## 🐛 Common Issues & Fixes

### Issue: "Cannot read property 'query' of undefined"
**Fix:** Make sure you're passing `db` to routes:
```javascript
app.locals.db = pool;
```

### Issue: "Relation 'offers' does not exist"
**Fix:** Run the schema file:
```bash
psql $DATABASE_URL < offer-wizard-schema.sql
```

### Issue: "CORS error when calling API"
**Fix:** Add CORS middleware:
```javascript
import cors from 'cors';
app.use(cors());
```

### Issue: "depositAmount is null"
**Fix:** Calculate default in API if not provided:
```javascript
const finalDepositAmount = depositAmount || (offerPrice * 0.1);
```

## 📊 Database Quick Reference

**Get all offers for a user:**
```sql
SELECT * FROM offer_details WHERE buyer_id = 'user-uuid';
```

**Get pending conditions:**
```sql
SELECT * FROM offer_conditions 
WHERE offer_id = 'offer-uuid' AND status = 'pending';
```

**Get offer timeline:**
```sql
SELECT * FROM offer_activities 
WHERE offer_id = 'offer-uuid' 
ORDER BY created_at DESC;
```

**Reset test data:**
```sql
DELETE FROM offer_messages;
DELETE FROM offer_activities;
DELETE FROM offer_chattels;
DELETE FROM offer_conditions;
DELETE FROM offer_buyer_details;
DELETE FROM offers;
```

## 🎯 Production Checklist

Before going live, ensure you have:

- [ ] Environment variables secured
- [ ] Database backups enabled
- [ ] API rate limiting implemented
- [ ] Error logging set up (Sentry, etc.)
- [ ] Authentication & authorization working
- [ ] HTTPS enabled
- [ ] Privacy policy updated
- [ ] Terms of service include legal disclaimers
- [ ] ADLS forms legally purchased
- [ ] Conveyancer partnerships established
- [ ] Test transactions completed end-to-end

## 📚 File Reference

### Database Schema (`offer-wizard-schema.sql`)
- Core tables for offers, conditions, chattels
- Views for efficient querying
- Triggers for automatic logging
- Standard chattels seed data

### API Routes (`offer-wizard-routes.js`)
- 20+ endpoints for full CRUD operations
- Wizard step management
- Document generation hooks
- Messaging system

### Types (`offer-wizard-types.ts`)
- Complete TypeScript definitions
- Request/response interfaces
- Validation types
- Constants and enums

### React Component (`OfferWizard-React-Example.tsx`)
- 5-step wizard UI
- Form validation
- API integration
- Progress tracking

### Full Documentation (`README.md`)
- Detailed implementation guide
- Legal compliance information
- Testing strategies
- Production deployment guide

## 💡 Pro Tips

1. **Start Simple**: Get the basic flow working before adding bells and whistles
2. **Test Early**: Use Postman/curl to test API before building frontend
3. **Mock Data**: Use seed data for testing (don't purchase ADLS forms yet)
4. **Incremental**: Deploy one feature at a time
5. **Get Feedback**: Show users early prototypes to validate the flow

## 🆘 Need Help?

Reference the full [README.md](./README.md) for:
- Detailed API documentation
- Legal compliance guide
- Advanced features
- Troubleshooting
- Production deployment

Reference your [HouseMatch legal docs conversation](https://claude.ai/chat/7b5bbb8d-57b8-46fe-aac1-dfe4cf3bb41e) for context on:
- ADLS forms and pricing
- NZ property law requirements
- Sale & Purchase Agreement process

## 🎉 Success Metrics

You'll know it's working when:
- ✅ Users can complete the wizard in under 5 minutes
- ✅ Draft offers save automatically
- ✅ Conditions calculate due dates correctly
- ✅ Vendors can view and respond to offers
- ✅ PDFs generate with accurate information
- ✅ Digital signing works smoothly

Now go build something amazing! 🚀🏠

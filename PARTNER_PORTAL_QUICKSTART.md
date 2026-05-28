# Partner Portal - Quick Start Guide

**Ready to Launch!** Your partner portal is fully functional. Here's how to get started.

---

## 🚀 **Step 1: Access Your Admin Dashboard**

1. **Login to your main app** at: `https://housematch-nz.replit.app/`
   - Use your admin account email: `demo@propertyapp.com` (or your admin email)
   
2. **Navigate to Partner Management:**
   - URL: `https://housematch-nz.replit.app/admin/partners`
   - OR click the admin menu in your main app navigation

3. **You'll see three tabs:**
   - 📋 **Pending Verification** - New partners waiting for approval
   - 👥 **All Partners** - Complete partner roster
   - 💰 **Unpaid Orders** - Track payouts to partners

---

## 🤝 **Step 2: Onboard Your First Partner**

### **Option A: API Signup (Recommended for Testing)**

Use this API call to create a test partner application (requires admin approval):

```bash
curl -X POST https://housematch-nz.replit.app/partner/signup \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Cleaning Services Ltd",
    "contactName": "John Smith",
    "email": "cleaner@testcompany.co.nz",
    "phone": "+6421234567",
    "businessAddress": "123 Main St, Auckland",
    "website": "https://testcleaning.co.nz",
    "description": "Professional cleaning services for properties",
    "gstNumber": "123-456-789",
    "serviceTypes": ["cleaning"],
    "regions": ["Auckland"],
    "accountType": "service_partner"
  }'
```

**Note:** This creates a pending application. Admin must approve it and credentials will be auto-generated.

### **Option B: Real Partner Registration**

For your first real partners:
1. Collect their details via email/phone:
   - Company name
   - Contact person name
   - Email address
   - Phone number
   - Services offered (cleaning, moving, staging, hosting)
   - Regions covered (Auckland, Wellington, Christchurch, etc.)
   - Bank account details (for payouts)

2. Create their account using the API above
3. Email them their login credentials:
   - Login URL: `https://housematch-nz.replit.app/partner/login`
   - Email: (their email)
   - Password: (you choose - they can't reset yet)

---

## ✅ **Step 3: Verify the Partner**

1. Go to **Admin Dashboard** → **Pending Verification** tab
2. You'll see the new partner in the list
3. Click **"Approve"** button
4. (Optional) Add verification notes: "Verified via phone call, checked business registration"
5. Click **"Confirm Approval"**

**Security Note:** Only verify partners you've:
- Spoken to personally
- Verified their business registration
- Checked their bank account details

---

## 📦 **Step 4: Create & Assign an Order**

### **Manual Order Creation (For Testing)**

Currently, orders are created when customers request services in the main app. For testing:

```sql
-- Create a test order in the database
INSERT INTO service_orders (
  buyer_id, 
  service_name, 
  service_type, 
  customer_name, 
  customer_email, 
  customer_phone,
  property_address,
  price_cents, 
  status, 
  partner_id
) VALUES (
  'demo-user-001',  -- Your demo user ID
  'Home Cleaning Service',
  'cleaning',
  'Test Customer',
  'customer@example.com',
  '0212345678',
  '123 Test Street, Auckland',
  25000,  -- $250.00
  'assigned',
  'PARTNER_ID_HERE'  -- Replace with actual partner ID from previous step
);
```

**Get Partner ID:**
```sql
SELECT id, company_name, email FROM service_partners WHERE email = 'cleaner@testcompany.co.nz';
```

---

## 👤 **Step 5: Partner Accepts the Order**

1. **Partner logs in:**
   - Navigate to: `https://housematch-nz.replit.app/partner/login`
   - Enter their email and password
   
2. **Partner sees dashboard:**
   - Verification status: "Verified" ✅
   - Order appears in "Pending" tab
   
3. **Partner accepts order:**
   - Go to: `/partner/orders`
   - Click "Pending" tab
   - Click **"Accept Order"** button
   - Order moves to "Active" tab

4. **Partner updates progress:**
   - Click on the active order
   - Click **"Update Status"**
   - Select status (e.g., "In Progress")
   - Add message: "Starting cleaning service tomorrow at 9am"
   - Click **"Submit Update"**

5. **Partner marks complete:**
   - Update status to "Completed"
   - Order moves to "Completed" tab

---

## 💸 **Step 6: Process Payout**

1. **View unpaid orders:**
   - Go to: `/admin/partners` → **"Unpaid Orders"** tab
   - See completed order with payout amount

2. **Make bank transfer:**
   - Manually transfer money to partner's bank account
   - Example: $225.00 ($250 - 10% commission)

3. **Record payout in system:**
   - Click **"Mark as Paid"** button
   - Confirm amount: $225.00
   - Add notes: "Bank transfer ref: 20251101-001"
   - Click **"Confirm Payment"**
   - Order removed from unpaid list

---

## 📊 **Monitoring Your Partner Ecosystem**

### **Admin Dashboard Metrics:**
- **Pending Verification:** Number of partners waiting approval
- **All Partners:** Total active partners, total earnings
- **Unpaid Orders:** Outstanding payouts owed

### **Partner Dashboard (What Partners See):**
- Total earnings
- Active orders count
- Completed jobs
- Verification status
- Recent orders list

---

## 🛡️ **Security Features Built-In**

✅ **Unverified partners cannot accept orders** (client + server-side block)  
✅ **Password hashing** with scrypt for all partner accounts  
✅ **Admin-only routes** protected by `is_admin` flag  
✅ **Session-based authentication** with secure cookies  
✅ **Input validation** on all forms and API endpoints  

---

## 🐛 **Troubleshooting**

### **Partner can't login:**
1. Check database: `SELECT * FROM partner_users WHERE email = 'their-email';`
2. Verify password was hashed (should contain `.` separator)
3. Check partner exists in `service_partners` table

### **Partner can't accept orders:**
1. Check verification status: `SELECT verification_status FROM service_partners WHERE id = 'partner-id';`
2. Must be `'verified'` (not `'pending'` or `'rejected'`)
3. Check browser console for error messages

### **Admin can't access /admin/partners:**
1. Check admin flag: `SELECT is_admin FROM users WHERE email = 'your-email';`
2. Must be `true` (not `false` or `NULL`)
3. Try logging out and back in

### **Payout not saving:**
1. Check order status is `'completed'`
2. Check `partner_id` is set on the order
3. Verify no console errors in browser

---

## 📞 **Support Workflow**

**For Partner Issues:**
- Partner contacts you via email/phone
- You check database directly for issues
- Update manually if needed
- Document common issues for future automation

**For Admin Issues:**
- Check Sentry dashboard for backend errors
- Check browser console for frontend errors
- Review server logs in workflow output

---

## 🎯 **Success Metrics - First 2 Weeks**

Track these manually:
- [ ] 2-3 partners registered
- [ ] 2-3 partners verified
- [ ] 1-2 orders assigned and accepted
- [ ] 1-2 orders completed
- [ ] 1 payout processed successfully
- [ ] Zero critical bugs reported
- [ ] Partner feedback collected

---

## 📋 **What's Next?**

**After first partner feedback:**
1. Partner password reset flow
2. Email notifications for verification
3. Partner profile edit form (update bank details)
4. Session rotation re-enabled
5. Automated e2e tests

**After 10+ partners:**
1. Stripe Connect integration
2. Automated payout processing
3. Partner analytics dashboard
4. Real-time order updates

---

## 🚨 **Known Limitations (MVP)**

- ❌ No partner registration UI (API-only for now)
- ❌ No password reset (partners must contact you)
- ❌ No email notifications (manual process)
- ❌ No automated Stripe payouts (manual bank transfers)
- ❌ Session rotation disabled (TODO for production)

**These are INTENTIONAL for MVP.** We ship fast, validate with real partners, then automate based on actual usage patterns.

---

## ✅ **Ready to Launch Checklist**

Before onboarding your first partner:
- [ ] Test partner registration API works
- [ ] Test partner login flow
- [ ] Test admin verification workflow
- [ ] Test order acceptance (verified partner)
- [ ] Test unverified partner block (security)
- [ ] Test payout tracking
- [ ] Verify no console errors
- [ ] Set up admin account with `is_admin: true`

**You're ready!** 🚀

---

**Questions?** Check `PARTNER_PORTAL_QA_CHECKLIST.md` for detailed testing steps.

**Last Updated:** November 1, 2025

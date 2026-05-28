# Partner Portal MVP - Manual QA Checklist

**Last Updated:** November 1, 2025  
**Purpose:** Manual validation of partner portal MVP before quiet launch with 2-3 real partners

---

## 🚪 Dashboard Access Guide

### **For YOU (Admin/Site Owner):**
1. Login to main app with your admin account
2. Navigate to: `https://your-domain.replit.app/admin/partners`
3. You'll see three tabs:
   - **Pending Verification** - Approve/reject new partners
   - **All Partners** - View complete roster
   - **Unpaid Orders** - Track and mark payouts

**Note:** Your user account must have `is_admin: true` in the database.

### **For Service Partners (Cleaners, Movers, Stagers):**
1. Navigate to: `https://your-domain.replit.app/partner/login`
2. Login with email/password (created via registration API)
3. Access pages:
   - `/partner/dashboard` - Stats and verification status
   - `/partner/orders` - View and accept orders
   - `/partner/profile` - Company info and bank details

### **For Customers (Property Buyers):**
1. Main app: `https://your-domain.replit.app/`
2. Existing TikTok-style property swiping interface
3. Can request services (creates orders for partners)

---

## Pre-Launch Validation

### 🔐 Partner Registration & Authentication

**Test: Partner Signup**
1. ✅ Navigate to: `/partner/signup` (or use API)
2. ✅ Submit partner application via API:
   ```bash
   POST /partner/signup
   {
     "companyName": "Test Services Ltd",
     "contactName": "John Doe",
     "email": "test-partner@example.com",
     "phone": "+6421234567",
     "gstNumber": "123-456-789",
     "serviceTypes": ["cleaning"],
     "regions": ["Auckland"],
     "accountType": "service_partner"
   }
   ```
3. ✅ Verify response: `{ success: true, partnerId: "...", message: "Application submitted..." }`
4. ✅ Check database: Partner created with `status: 'pending'`
5. ✅ Note: Login credentials will be auto-generated upon admin approval

**Test: Partner Login**
1. ✅ Navigate to: `/partner/login`
2. ✅ Enter credentials from registration
3. ✅ Click "Sign In"
4. ✅ Verify redirect to partner dashboard
5. ✅ Verify toast message: "Login successful"

**Expected Behavior:**
- ✅ Password properly hashed with scrypt
- ✅ Session cookie `partner.sid` set
- ✅ No console errors

---

### 👨‍💼 Admin Partner Verification

**Test: Admin Approval Workflow**
1. ✅ Login as admin user (with `is_admin: true`)
2. ✅ Navigate to: `/admin/partners`
3. ✅ Click "Pending Verification" tab
4. ✅ Verify new partner appears in list
5. ✅ Click "Approve" button
6. ✅ Add verification notes (optional)
7. ✅ Click "Confirm Approval"
8. ✅ Verify success toast
9. ✅ Verify partner moved to "All Partners" tab
10. ✅ Check database: `verificationStatus: 'verified'`

**Test: Admin Rejection Workflow**
1. ✅ Register second test partner
2. ✅ Click "Reject" button
3. ✅ Enter rejection reason (required)
4. ✅ Click "Confirm Rejection"
5. ✅ Verify success toast
6. ✅ Check database: `verificationStatus: 'rejected'`

**Expected Behavior:**
- ✅ Only admin users can access `/admin/partners`
- ✅ Rejection requires reason
- ✅ Status updates reflected immediately

---

### 📋 Partner Dashboard & Orders

**Test: Partner Dashboard (Unverified)**
1. ✅ Login as unverified partner
2. ✅ Navigate to: `/partner/dashboard`
3. ✅ Verify alert shows: "Pending Verification"
4. ✅ Verify stats show zeros
5. ✅ Verify no orders displayed

**Test: Partner Dashboard (Verified)**
1. ✅ Login as verified partner
2. ✅ Navigate to: `/partner/dashboard`
3. ✅ Verify badge shows: "Verified"
4. ✅ Verify stats cards display correctly
5. ✅ Verify recent orders section exists

**Test: Order Assignment (Admin)**
1. ✅ Create test service order in database or via UI
2. ✅ As admin, assign order to verified partner
3. ✅ Check database: `partnerId` set, `status: 'assigned'`

**Test: Partner Views Orders**
1. ✅ Login as verified partner
2. ✅ Navigate to: `/partner/orders`
3. ✅ Verify order appears in "Pending" tab
4. ✅ Verify "Accept Order" button visible
5. ✅ Verify order details displayed correctly

**Test: Partner Accepts Order (Verified)**
1. ✅ Click "Accept Order" button
2. ✅ Verify success toast
3. ✅ Verify order moves to "Active" tab
4. ✅ Check database: `status: 'accepted'`, `acceptedAt` timestamp set

**Test: Partner Accepts Order (Unverified - Should Fail)**
1. ✅ Login as unverified partner
2. ✅ Try to accept order
3. ✅ Verify button disabled OR error message
4. ✅ Verify server returns 403 error
5. ✅ Check logs: "Your account must be verified before accepting orders"

**Expected Behavior:**
- ✅ Unverified partners cannot accept orders (client + server-side guard)
- ✅ Order status updates reflected immediately
- ✅ No console errors

---

### 📝 Partner Updates & Status

**Test: Partner Updates Order Status**
1. ✅ As partner, navigate to accepted order
2. ✅ Click "Update Status" button
3. ✅ Select status: "In Progress"
4. ✅ Enter message: "Work started - cleaning kitchen"
5. ✅ Click "Submit Update"
6. ✅ Verify success toast
7. ✅ Check database: `partnerUpdates` table has new entry

**Test: Mark Order Complete**
1. ✅ Update order status to "Completed"
2. ✅ Verify `completedAt` timestamp set
3. ✅ Verify order moves to "Completed" tab

---

### 👤 Partner Profile

**Test: Profile Display**
1. ✅ Navigate to: `/partner/profile`
2. ✅ Verify company name displayed
3. ✅ Verify verification status badge
4. ✅ Verify service types shown
5. ✅ Verify bank account details visible
6. ✅ Verify performance metrics displayed

**Expected Data:**
- Company Name: "Test Services Ltd"
- Status: "Verified" (green badge)
- Email: test-partner@example.com
- Services: Cleaning
- Regions: Auckland

---

### 💰 Admin Payout Management

**Test: Unpaid Orders List**
1. ✅ Login as admin
2. ✅ Navigate to: `/admin/partners`
3. ✅ Click "Unpaid Orders" tab
4. ✅ Verify completed order appears
5. ✅ Verify payout amount displayed

**Test: Manual Payout Recording**
1. ✅ Click "Mark as Paid" button
2. ✅ Enter payout amount (optional - defaults to order amount)
3. ✅ Enter payout notes: "Bank transfer ref: 123456"
4. ✅ Click "Confirm Payment"
5. ✅ Verify success toast
6. ✅ Verify order removed from unpaid list
7. ✅ Check database: `payoutStatus: 'paid'`, `payoutDate` set, `payoutNotes` saved

**Expected Behavior:**
- ✅ Only completed orders appear in unpaid list
- ✅ Payout records timestamp and notes
- ✅ List updates immediately after marking paid

---

## Security Validation

### 🔒 Authentication Guards

**Test: Unauthenticated Access**
1. ✅ Logout from partner portal
2. ✅ Navigate to: `/partner/dashboard`
3. ✅ Verify redirect to login page
4. ✅ Verify API returns 401 for `/partner/orders`

**Test: Partner Cannot Access Admin Routes**
1. ✅ Login as partner
2. ✅ Navigate to: `/admin/partners`
3. ✅ Verify 403 error or redirect
4. ✅ Verify API returns 403 for admin endpoints

**Test: Verification Status Guard**
1. ✅ As unverified partner, try to accept order
2. ✅ Verify server returns 403
3. ✅ Verify error message: "Your account must be verified before accepting orders"

---

## Cross-Browser Testing

**Browsers to Test:**
- ✅ Chrome (primary)
- ✅ Safari (iOS important for NZ market)
- ✅ Firefox
- ✅ Mobile Safari (iPhone)
- ✅ Mobile Chrome (Android)

**Test on Each:**
- ✅ Partner login works
- ✅ Dashboard displays correctly
- ✅ Orders list responsive
- ✅ Accept order button functional
- ✅ Profile page readable

---

## Known Issues & TODOs (Post-Launch)

### 🔧 Technical Debt
- [ ] **Session Rotation**: Currently disabled for MVP. Add back for production security
  - Location: `server/partner-auth.ts` line 211-223
  - Issue: Session regeneration caused deserialization errors
  - Priority: Medium (security enhancement)

- [ ] **Comprehensive E2E Tests**: Manual testing only for MVP
  - Automated tests blocked by OIDC auth complexity
  - Add after validating workflows with real partners
  - Priority: Low (nice-to-have)

- [ ] **Password Reset Flow**: Not implemented for partner users
  - Partners must contact admin for password reset
  - Priority: High (add after first partner feedback)

### 📋 Future Enhancements
- [ ] Partner registration UI (currently API-only)
- [ ] Email notifications for verification status
- [ ] Partner profile edit form (update bank details)
- [ ] Partner analytics dashboard
- [ ] Automated Stripe Connect integration
- [ ] Real-time order status updates via WebSockets

### 💰 GST/Tax Handling (B2B Simplified)
**Current Approach (Correct for NZ B2B):**
- GST is included in service prices charged to customers
- GST is passed through to partners in their payout
- Partners handle their own GST obligations with IRD
- No GST tracking needed in platform (B2B exempt from collection)
- Partners offset GST received against their own costs

**What This Means:**
- ✅ Platform charges customer $250 (incl GST if applicable)
- ✅ Partner receives $225 ($250 - 10% commission)
- ✅ Partner reports their income and GST to IRD
- ✅ No platform tax reporting required

---

## Launch Checklist

**Before Onboarding First Partner:**
- [ ] Run through complete manual QA checklist above
- [ ] Verify all database migrations applied: `npm run db:push`
- [ ] Confirm admin account exists and has `is_admin: true`
- [ ] Test partner registration API works
- [ ] Test partner login flow end-to-end
- [ ] Test admin verification workflow
- [ ] Test order acceptance with verified partner
- [ ] Test payout tracking works
- [ ] Verify no console errors in any flow
- [ ] Check Sentry for any backend errors

**Post-Launch Monitoring:**
- [ ] Monitor partner registration rate
- [ ] Track verification approval time
- [ ] Measure order acceptance rate
- [ ] Collect partner feedback on UX
- [ ] Monitor payout processing time

---

## Success Metrics for MVP

**Week 1-2:**
- 2-3 partners registered
- 100% verification completion rate
- 1-2 orders assigned and accepted
- 1 manual payout processed successfully
- Zero critical bugs reported

**Week 3-4:**
- Partner satisfaction feedback collected
- Decision on automation priorities based on real usage
- Plan for session rotation reintroduction
- Roadmap for Stripe Connect integration

---

## Support & Escalation

**Partner Issues:**
- Login problems → Check partner_users table, verify password hash format
- Cannot accept orders → Check verification_status in service_partners table
- Missing orders → Verify partner_id assignment in service_orders table

**Admin Issues:**
- Cannot verify partners → Check is_admin flag in users table
- Payout tracking not saving → Check database permissions

**Emergency Contacts:**
- Database issues: Check Neon console
- Authentication issues: Review session logs
- Critical bugs: Check Sentry dashboard

---

**Approved for Launch:** Manual validation complete ✅  
**Next Review:** After first 3 partner signups  
**Documentation Owner:** Development Team

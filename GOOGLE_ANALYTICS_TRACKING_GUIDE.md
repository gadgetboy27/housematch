# Google Analytics Tracking Guide - HouseMatch.nz

This guide shows you how to add Google Analytics tracking to any page or component in your React app.

## 📍 What's Already Set Up

### 1. **Automatic Tracking** (Already Working)
- ✅ Every page view is tracked automatically
- ✅ Route changes in your single-page app
- ✅ User sessions and engagement time

### 2. **Pre-Built Event Tracking Functions**
Located in `client/src/components/Analytics.tsx`:

```typescript
// Property interactions
trackPropertyView(propertyId, address)
trackPropertyLike(propertyId)

// Revenue tracking
trackReportPurchase(reportType, price)  // Tracks in NZD
trackPremiumUpgrade(planName, price)

// User actions
trackSearch(searchTerm)
trackOfferSubmission(propertyId, offerType)
```

---

## 🎯 How to Add Tracking to Your Pages

### Method 1: Track Page Views with Metadata

Add this to **any page component** to track when users visit:

```typescript
import { usePageTracking } from "@/components/Analytics";

export default function MyPage() {
  // Track this specific page
  usePageTracking('Page Name Here', {
    page_category: 'reports',
    user_type: 'property_buyer',
    custom_field: 'any_value'
  });

  return (
    // Your page content
  );
}
```

**Real Examples Already Added:**

1. **Home Page** (`client/src/pages/home.tsx`):
   ```typescript
   usePageTracking('Property Discovery Home', {
     page_category: 'discovery',
     user_type: 'property_browser'
   });
   ```

2. **Reports Page** (`client/src/pages/reports.tsx`):
   ```typescript
   usePageTracking('Property Reports', { 
     page_category: 'reports',
     user_type: 'property_buyer'
   });
   ```

3. **Add Property Page** (`client/src/pages/add-property.tsx`):
   ```typescript
   usePageTracking('Add Property Listing', {
     page_category: 'listing',
     user_type: 'property_owner'
   });
   ```

---

### Method 2: Track Button Clicks

Track specific user interactions:

```typescript
import { useTrackClick } from "@/components/Analytics";

export default function MyComponent() {
  const trackClick = useTrackClick();

  const handleButtonClick = () => {
    // Track the click
    trackClick('filter_applied', {
      filter_type: 'location',
      filter_value: 'Auckland'
    });
    
    // Your existing logic
    applyFilter();
  };

  return <button onClick={handleButtonClick}>Filter</button>;
}
```

**Common Click Events to Track:**
- Filter applications
- Sort changes
- Property type selections
- CTA button clicks
- Navigation menu items

---

### Method 3: Track Form Submissions

Track when forms are submitted (success or failure):

```typescript
import { useTrackForm } from "@/components/Analytics";

export default function ContactForm() {
  const trackForm = useTrackForm();

  const handleSubmit = async (data) => {
    try {
      await submitForm(data);
      
      // Track successful submission
      trackForm('contact_form', true);
      
    } catch (error) {
      // Track failed submission
      trackForm('contact_form', false, error.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

### Method 4: Track Custom Events

For anything not covered by the pre-built functions:

```typescript
import { trackEvent } from "@/components/Analytics";

// Anywhere in your code
trackEvent('custom_event_name', {
  property1: 'value1',
  property2: 123,
  property3: true
});
```

**Example Use Cases:**
```typescript
// Video played
trackEvent('property_video_played', {
  property_id: '123',
  video_duration: 30
});

// Photo gallery opened
trackEvent('photo_gallery_opened', {
  property_id: '123',
  photo_count: 15
});

// AI search used
trackEvent('ai_search_used', {
  search_query: 'modern apartment Auckland',
  results_count: 12
});
```

---

## 📊 What You Can Track

### User Behavior
- Page views with metadata
- Time spent on pages
- Navigation paths
- Button clicks

### Property Interactions
- Property views
- Likes/favorites
- Swipes (left/right)
- Detail views
- Photo gallery engagement

### Revenue Events
- Report purchases (with price in NZD)
- Premium subscriptions
- Payment completion
- Abandoned checkouts

### Engagement Metrics
- Form submissions (success/failure)
- Search queries
- Filter usage
- AI feature usage
- Offer submissions

---

## 🎨 Quick Examples for Common Pages

### Track a Pricing Page
```typescript
// client/src/pages/pricing-page.tsx
import { usePageTracking, useTrackClick } from "@/components/Analytics";

export default function PricingPage() {
  usePageTracking('Pricing Plans', {
    page_category: 'monetization',
    user_type: 'potential_customer'
  });

  const trackClick = useTrackClick();

  return (
    <button onClick={() => {
      trackClick('pricing_plan_selected', {
        plan_name: 'Premium',
        plan_price: 99
      });
      selectPlan('premium');
    }}>
      Select Premium
    </button>
  );
}
```

### Track Partner Signup
```typescript
// client/src/pages/partner-signup.tsx
import { usePageTracking, useTrackForm } from "@/components/Analytics";

export default function PartnerSignup() {
  usePageTracking('Partner Signup', {
    page_category: 'partner_acquisition',
    user_type: 'potential_partner'
  });

  const trackForm = useTrackForm();

  const handleSubmit = async (data) => {
    try {
      await registerPartner(data);
      trackForm('partner_signup_form', true);
    } catch (error) {
      trackForm('partner_signup_form', false, error.message);
    }
  };
}
```

### Track Search Results
```typescript
// In your search component
import { trackSearch } from "@/components/Analytics";

const handleSearch = (query: string) => {
  trackSearch(query);
  performSearch(query);
};
```

---

## 🔍 Viewing Your Data in Google Analytics

1. **Real-time Events**: 
   - Go to [Google Analytics](https://analytics.google.com)
   - Reports → Realtime → Events
   - See events as they happen!

2. **Page Views**:
   - Reports → Engagement → Pages and screens
   - See which pages are most popular

3. **Custom Events**:
   - Reports → Engagement → Events
   - All your custom events appear here

4. **Revenue**:
   - Reports → Monetization → Purchase revenue
   - E-commerce tracking for report sales

---

## 🎯 Best Practices

### Do's ✅
- Track important user actions (purchases, signups, searches)
- Add metadata to understand context
- Track both success and failure states
- Use descriptive event names

### Don'ts ❌
- Don't track personally identifiable information (PII)
- Don't track every single click (focus on meaningful actions)
- Don't send sensitive data (passwords, payment details)
- Don't track user emails or phone numbers

---

## 🚀 Quick Start Checklist

To add tracking to a new page:

1. [ ] Import the hook: `import { usePageTracking } from "@/components/Analytics"`
2. [ ] Add page tracking at the top of your component
3. [ ] (Optional) Add click tracking for important buttons
4. [ ] (Optional) Add form tracking for submissions
5. [ ] Test in browser console (you'll see `📊 GA: Tracked...` logs)
6. [ ] Verify in Google Analytics Real-time view

---

## 📝 Console Logs

All tracking events log to the browser console for debugging:

```
📊 GA: Tracked page view - Property Reports {page_category: 'reports', user_type: 'property_buyer'}
📊 GA: Tracked event - filter_applied {filter_type: 'location', filter_value: 'Auckland'}
📊 GA: Tracked form - contact_form {success: true}
```

This makes it easy to verify tracking is working during development!

---

## 🎉 You're All Set!

Your analytics are now tracking across individual pages with rich metadata. You can see exactly:
- Which pages are popular
- What actions users take
- Where they drop off
- What converts to revenue

Happy tracking! 📊

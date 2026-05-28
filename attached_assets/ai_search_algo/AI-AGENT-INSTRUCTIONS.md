# 🤖 AI AGENT INTEGRATION GUIDE
## SwipeRight NZ - AI Property Search System

---

## 📋 FOR THE AI CODING AGENT

This guide explains EXACTLY where each piece of code goes and what YOU (the AI agent) need to customize vs what should stay as-is.

---

## 🎯 Key Concepts

### 1. **Two-Layer Architecture**

```
┌─────────────────────────────────────────────┐
│         EXTERNAL AI (Anthropic Claude)      │
│  Purpose: Parse natural language queries   │
│  Location: Your backend calls their API    │
│  Cost: ~$0.004 per search                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│      YOUR PROPRIETARY ALGORITHMS            │
│  Purpose: Search, Score, Rank, Cross-sell  │
│  Location: YOUR server (never exposed)     │
│  Cost: $0 (runs on your hardware)          │
└─────────────────────────────────────────────┘
```

### 2. **File Responsibilities**

| File | What It Does | AI Used? |
|------|-------------|----------|
| `AGENT-READY-Backend.ts` | Backend logic | Yes (Claude for parsing only) |
| `AGENT-READY-Frontend.tsx` | UI Component | No (just displays results) |
| Database Schema | Store data | No |

---

## 📁 File Integration Instructions

### FILE 1: Backend (`AGENT-READY-Backend.ts`)

**Location:** `server/routes/ai-property-search.ts`

**What's Already Done:**
- ✅ Claude API integration for query parsing
- ✅ Database connections
- ✅ API route handlers
- ✅ Basic scoring framework

**What YOU Need to Customize:**
All sections marked with 🔒 and comments like:
```typescript
// ┌─────────────────────────────────────────────────────┐
// │ 🔒 START: YOUR PROPRIETARY ALGORITHM                │
// └─────────────────────────────────────────────────────┘
```

**Specific Customization Points:**

#### 1. Search Logic (Lines ~250-350)
```typescript
async function searchPropertiesWithProprietaryLogic()
```
**Customize:**
- Database query logic
- Feature matching weights
- Location-based filtering
- Multi-stage search strategy

**Example:**
```typescript
// ADD YOUR CUSTOM FILTERING
if (criteria.mustHaves?.includes('pool')) {
  conditions.push(eq(properties.features->>'has_pool', 'true'));
}

// ADD YOUR DISTANCE CALCULATIONS
if (criteria.priorities?.includes('schools')) {
  // Calculate distance to schools
  // Filter properties within 1km of good schools
}
```

#### 2. Learning Algorithm (Lines ~400-550)
```typescript
async function getUserLearnedPreferencesProprietaryAlgorithm()
```
**Customize:**
- How you weight different signals (recency, frequency)
- Confidence calculation formula
- Feature importance scoring
- Pattern recognition logic

**Example:**
```typescript
// ADD YOUR WEIGHTING LOGIC
const recentSwipes = swipes.slice(0, 20); // Last 20 swipes
const olderSwipes = swipes.slice(20);

// Weight recent swipes 2x more
const weightedLikes = recentSwipes.length * 2 + olderSwipes.length;
```

#### 3. Match Scoring (Lines ~600-900)
```typescript
async function calculateMatchScoreProprietaryAlgorithm()
```
**Customize:**
- Score weights (currently 40/30/20/10)
- Bonus points for special features
- Penalties for deal-breakers
- Match reason generation

**Example:**
```typescript
// ADD YOUR BONUS LOGIC
if (property.features?.pool && criteria.mustHaves?.includes('pool')) {
  baseMatchScore += 5; // Bonus for must-have feature
  matchReasons.push('Has pool as requested');
}

// ADD YOUR PENALTY LOGIC
if (criteria.dealBreakers?.includes('busy_road') && property.features?.busy_road) {
  baseMatchScore -= 10; // Penalty for deal-breaker
}
```

#### 4. Cross-sell Logic (Lines ~950-1050)
```typescript
function getReportRecommendationsProprietaryLogic()
```
**Customize:**
- Match score thresholds for recommendations
- Property-type specific recommendations
- Bundle offers
- Dynamic pricing

**Example:**
```typescript
// ADD YOUR BUNDLE LOGIC
if (matchScore >= 80 && property.priceCents > 50000000) {
  // For high-value, high-match properties, offer bundle
  recommendations.push({
    type: 'premium_bundle',
    name: 'Complete Property Package',
    price: 41900, // Normally $459, bundle for $419
    savings: 'Save $40!',
  });
}
```

---

### FILE 2: Frontend (`AGENT-READY-Frontend.tsx`)

**Location:** `client/src/components/AIPropertySearch.tsx`

**What's Already Done:**
- ✅ Complete UI component structure
- ✅ API integration (calls your backend)
- ✅ State management
- ✅ Event handlers

**What YOU Need to Customize:**
All sections marked with 🎨 and comments like:
```typescript
// ┌─────────────────────────────────────────────────────┐
// │ 🎨 CUSTOMIZE: Match score color scheme              │
// └─────────────────────────────────────────────────────┘
```

**Specific Customization Points:**

#### 1. Brand Colors (Lines ~150-160)
```typescript
const getMatchScoreColor = (score: number): string => {
```
**Customize to match your brand:**
```typescript
// REPLACE with YOUR brand colors
if (score >= 80) return "bg-gradient-to-r from-[#YOUR-COLOR-1] to-[#YOUR-COLOR-2]";
```

#### 2. Example Queries (Lines ~200-207)
```typescript
const exampleQueries = [
```
**Update to match your target market:**
```typescript
const exampleQueries = [
  "Waterfront apartment in Auckland CBD",
  "Character villa in Ponsonby under $2m",
  "Investment townhouse with high rental yield",
  // ADD YOUR EXAMPLES
];
```

#### 3. Match Labels (Lines ~165-175)
```typescript
const getMatchScoreLabel = (score: number): string => {
```
**Customize how you describe matches:**
```typescript
if (score >= 90) return "Dream Home!";
if (score >= 80) return "Perfect Match!";
// CHANGE LABELS TO FIT YOUR BRAND VOICE
```

#### 4. Analytics Tracking (Lines ~130, 143, 154)
```typescript
// 🎨 CUSTOMIZE: Add analytics tracking here
// trackEvent('ai_search_initiated', { query: searchQuery });
```
**Add your analytics:**
```typescript
handleSearch = () => {
  // YOUR ANALYTICS CODE HERE
  gtag('event', 'ai_search', { query: searchQuery });
  mixpanel.track('AI Search Initiated');
  
  searchMutation.mutate(searchQuery);
};
```

---

## 🔌 Integration Steps

### Step 1: Backend Integration

```bash
# 1. Copy the backend file
cp AGENT-READY-Backend.ts server/routes/ai-property-search.ts

# 2. Add to your server/index.ts:
import {
  handleAIPropertySearch,
  handlePropertySwipe,
  trackReportRecommendation,
} from "./routes/ai-property-search";

# 3. Register routes:
app.post("/api/ai/search-properties", handleAIPropertySearch);
app.post("/api/property/swipe", handlePropertySwipe);
app.post("/api/reports/recommendation-track", trackReportRecommendation);
```

### Step 2: Frontend Integration

```bash
# 1. Copy the frontend file
cp AGENT-READY-Frontend.tsx client/src/components/AIPropertySearch.tsx

# 2. Import in your main app:
import { AIPropertySearch } from "@/components/AIPropertySearch";
import { useState } from "react";

# 3. Add to your UI:
function YourMainComponent() {
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  
  return (
    <>
      <Button onClick={() => setAiSearchOpen(true)}>
        AI Search
      </Button>
      
      <AIPropertySearch 
        open={aiSearchOpen} 
        onOpenChange={setAiSearchOpen} 
      />
    </>
  );
}
```

### Step 3: Environment Setup

```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...

# Get your key from:
# https://console.anthropic.com/settings/keys
```

---

## 🎯 Customization Priority Guide

### MUST Customize (Critical for your business):

1. **Match Scoring Algorithm** ⭐⭐⭐⭐⭐
   - Lines 600-900 in Backend
   - This is YOUR competitive advantage
   - Customize all score weights and formulas

2. **Cross-sell Logic** ⭐⭐⭐⭐⭐
   - Lines 950-1050 in Backend
   - This is YOUR revenue optimization
   - Customize recommendations based on property/user

3. **Brand Colors & UI** ⭐⭐⭐⭐
   - Throughout Frontend file
   - Make it match your brand identity

### SHOULD Customize (Important for quality):

4. **Search Logic** ⭐⭐⭐⭐
   - Lines 250-350 in Backend
   - Improves search quality
   - Add your domain knowledge

5. **Learning Algorithm** ⭐⭐⭐⭐
   - Lines 400-550 in Backend
   - Makes recommendations smarter over time

6. **Example Queries** ⭐⭐⭐
   - Lines 200-207 in Frontend
   - Guides users to better searches

### CAN Customize (Nice to have):

7. **Analytics Integration** ⭐⭐⭐
   - Throughout Frontend
   - Track user behavior

8. **Match Labels/Icons** ⭐⭐
   - Lines 150-185 in Frontend
   - Polish the UX

---

## 🚫 DO NOT Change

**These parts should stay as-is:**

1. **Claude API Integration**
   ```typescript
   // DON'T CHANGE THIS
   const message = await anthropic.messages.create({
     model: "claude-sonnet-4-20250514",
     max_tokens: 1000,
     messages: [{
       role: "user",
       content: prompt
     }]
   });
   ```
   **Why:** This is the standard Anthropic API call

2. **API Endpoints**
   ```typescript
   // DON'T CHANGE THESE
   POST /api/ai/search-properties
   POST /api/property/swipe
   POST /api/reports/recommendation-track
   ```
   **Why:** Frontend and backend need to match

3. **Data Types/Interfaces**
   ```typescript
   // DON'T CHANGE THESE
   interface SearchCriteria { ... }
   interface PropertyWithScore { ... }
   ```
   **Why:** TypeScript will break if these don't match

4. **Database Schema**
   ```typescript
   // DON'T CHANGE THESE
   properties, userPreferences, propertySwipes, etc.
   ```
   **Why:** Already created in database

---

## 🧪 Testing Your Customizations

### Test Backend Changes:

```bash
# Start your server
npm run dev

# Test AI search
curl -X POST http://localhost:5000/api/ai/search-properties \
  -H "Content-Type: application/json" \
  -d '{"query": "3 bedroom house under $800k"}'

# Verify response includes your custom scores
# Check that matchScore, matchReasons, etc. reflect your algorithm
```

### Test Frontend Changes:

```bash
# Start your frontend
npm run dev

# Open browser
# Click AI Search button
# Enter a test query
# Verify:
# - Colors match your brand
# - Labels use your terminology
# - Analytics fire correctly
```

---

## 📊 Where Each Algorithm Lives

```
Backend File (server/routes/ai-property-search.ts)
│
├── parseSearchQueryWithClaude()
│   └── Uses: Claude API ☁️
│   └── Purpose: "3 bed house" → {bedrooms: 3}
│   └── Customize: NO - leave as-is
│
├── searchPropertiesWithProprietaryLogic() 🔒
│   └── Uses: Your database 💾
│   └── Purpose: Find matching properties
│   └── Customize: YES - add your logic
│
├── getUserLearnedPreferencesProprietaryAlgorithm() 🔒
│   └── Uses: Your swipe data 📊
│   └── Purpose: Learn user preferences
│   └── Customize: YES - add your learning logic
│
├── calculateMatchScoreProprietaryAlgorithm() 🔒
│   └── Uses: Your scoring algorithm 🎯
│   └── Purpose: Score each property 0-100%
│   └── Customize: YES - this is YOUR secret sauce
│
├── rankPropertiesByScore() 🔒
│   └── Uses: Your ranking logic 📈
│   └── Purpose: Sort by relevance
│   └── Customize: YES - add your sorting logic
│
└── getReportRecommendationsProprietaryLogic() 🔒
    └── Uses: Your business rules 💰
    └── Purpose: Recommend reports for revenue
    └── Customize: YES - optimize for conversion
```

```
Frontend File (client/src/components/AIPropertySearch.tsx)
│
├── UI Components 🎨
│   └── Customize: YES - match your brand
│
├── Event Handlers 🎯
│   └── Customize: YES - add analytics
│
└── API Calls 📡
    └── Customize: NO - must match backend
```

---

## 💡 Example Customization Workflow

**Scenario:** You want to boost properties with garages in your scoring

**Step 1: Backend - Update Scoring**
```typescript
// In calculateMatchScoreProprietaryAlgorithm()
// Around line 750

// ADD THIS:
if (property.features?.has_garage) {
  baseMatchScore += 5; // 5 bonus points for garage
  matchReasons.push('Has garage (high demand feature)');
}
```

**Step 2: Frontend - Update Display** (Optional)
```typescript
// In getMatchScoreLabel()
// Around line 170

// ADD THIS:
if (property.features?.has_garage && score >= 70) {
  return "Great Match (with garage!)";
}
```

**Step 3: Test**
```bash
# Search for "house with garage"
# Verify properties with garages score higher
# Check that "Has garage" appears in match reasons
```

---

## 🎓 Quick Reference

### Common Tasks:

| Task | File | Line(s) | Difficulty |
|------|------|---------|------------|
| Change score weights | Backend | 600-900 | Medium |
| Add new filter criteria | Backend | 250-350 | Easy |
| Customize brand colors | Frontend | 150-160 | Easy |
| Add analytics tracking | Frontend | Multiple | Easy |
| Modify learning logic | Backend | 400-550 | Hard |
| Change cross-sell rules | Backend | 950-1050 | Medium |
| Update example queries | Frontend | 200-207 | Easy |

---

## 🚀 Ready to Customize!

You now have:
- ✅ Complete backend with clear customization points
- ✅ Complete frontend with clear customization points
- ✅ This guide explaining where everything goes

**Next Steps:**
1. Copy both files to your project
2. Search for 🔒 markers in backend (YOUR proprietary code)
3. Search for 🎨 markers in frontend (YOUR brand/UI)
4. Customize each marked section
5. Test thoroughly
6. Deploy!

**Your proprietary algorithms stay on YOUR server. Claude (Anthropic) only helps parse queries. You control everything else!**

---

## ❓ FAQ for AI Agents

**Q: Do I need to change the Claude API integration?**
A: NO. Leave it as-is. It's just for parsing queries.

**Q: Where do I add my secret scoring formula?**
A: Backend, lines 600-900, in `calculateMatchScoreProprietaryAlgorithm()`

**Q: Can I change the API endpoints?**
A: Not recommended. Frontend and backend need to match.

**Q: How do I add my brand colors?**
A: Frontend, lines 150-160, in `getMatchScoreColor()`

**Q: Where do I add analytics?**
A: Frontend, search for "🎨 CUSTOMIZE: Add analytics"

**Q: Do I need to modify the database schema?**
A: NO. It's already created. Just use it.

**Q: Can I add more example queries?**
A: YES! Frontend, lines 200-207, in `exampleQueries` array

**Q: Where's the revenue optimization logic?**
A: Backend, lines 950-1050, in `getReportRecommendationsProprietaryLogic()`

---

**You're all set! Start customizing and make this system your own!** 🚀

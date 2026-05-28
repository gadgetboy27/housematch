# SwipeRight NZ - AI Property Search Integration Guide
## Complete Implementation Roadmap

---

## 🎯 Overview

This implementation adds THREE powerful features to SwipeRight NZ:

1. **AI Property Search** - Natural language search powered by Claude
2. **Learning System** - Learns user preferences from swipe behavior
3. **Cross-sell Engine** - Smart report recommendations based on match scores

---

## 📋 Prerequisites

- ✅ Existing SwipeRight NZ app with property database
- ✅ PostgreSQL database (Neon)
- ✅ Node.js backend (Express)
- ✅ React frontend
- ✅ Anthropic API key ([Get one here](https://console.anthropic.com/))

---

## 🚀 Implementation Steps

### STEP 1: Database Setup (15 minutes)

**1.1 Run the SQL migration**
```bash
# Connect to your Neon database
psql "postgresql://your-connection-string"

# Run the migration
\i 01-database-schema-updates.sql
```

This creates:
- `user_preferences` - Stores learned preferences
- `property_swipes` - Tracks all swipes for learning
- `ai_search_history` - Logs search queries and results
- `property_match_scores` - Cached match scores
- `report_recommendations` - Cross-sell tracking
- Helper functions and indexes for performance

**1.2 Verify tables were created**
```sql
\dt user_preferences
\dt property_swipes
\dt ai_search_history
```

**1.3 Update your Drizzle schema**
Copy the schema definitions from `05-server-integration-guide.ts` into your `db/schema.ts` file.

**1.4 Generate Drizzle migrations**
```bash
npm run db:generate
npm run db:migrate
```

---

### STEP 2: Environment Setup (5 minutes)

**2.1 Add Anthropic API key to `.env`**
```bash
# Add to your .env file
ANTHROPIC_API_KEY=sk-ant-api03-xxx...

# Get your API key from:
# https://console.anthropic.com/settings/keys
```

**2.2 Install Anthropic SDK**
```bash
npm install @anthropic-ai/sdk
```

**2.3 Test API key**
```bash
# Quick test
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

### STEP 3: Backend Integration (30 minutes)

**3.1 Add the AI search route handler**
```bash
# Copy the backend file to your server
cp 02-backend-api-routes.ts server/routes/ai-property-search.ts
```

**3.2 Import and register routes**

In your `server/index.ts` or `server/routes.ts`:

```typescript
import {
  handleAIPropertySearch,
  handlePropertySwipe,
  getUserPropertyFeed,
  trackReportRecommendation,
} from "./routes/ai-property-search";

// Add these routes
app.post("/api/ai/search-properties", handleAIPropertySearch);
app.post("/api/property/swipe", handlePropertySwipe);
app.get("/api/properties/feed", getUserPropertyFeed);
app.post("/api/reports/recommendation-track", trackReportRecommendation);
app.get("/api/user/learning-status", async (req, res) => {
  // Copy from 05-server-integration-guide.ts
});
```

**3.3 Update your properties model**

Make sure your properties table has these columns (add if missing):
```sql
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS nearby_schools JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS commute_data JSONB DEFAULT '{}';
```

**3.4 Test the backend**
```bash
# Start your server
npm run dev

# Test AI search endpoint
curl -X POST http://localhost:5000/api/ai/search-properties \
  -H "Content-Type: application/json" \
  -d '{"query": "3 bedroom home in Auckland under $800k"}'
```

---

### STEP 4: Frontend Integration (45 minutes)

**4.1 Add the AI Search component**
```bash
# Copy to your components folder
cp 03-frontend-ai-search-component.tsx client/src/components/AIPropertySearch.tsx
```

**4.2 Add swipe tracking**
```bash
cp 04-swipe-tracking-component.tsx client/src/components/SwipeTracker.tsx
```

**4.3 Integrate into your main app**

In your main navigation or header component:

```typescript
import { AIPropertySearch } from "@/components/AIPropertySearch";
import { useState } from "react";

export function Header() {
  const [aiSearchOpen, setAiSearchOpen] = useState(false);
  
  return (
    <header>
      {/* Your existing header */}
      
      <Button onClick={() => setAiSearchOpen(true)}>
        <Sparkles className="mr-2" />
        AI Search
      </Button>
      
      <AIPropertySearch 
        open={aiSearchOpen} 
        onOpenChange={setAiSearchOpen} 
      />
    </header>
  );
}
```

**4.4 Integrate swipe tracking into your swipe UI**

In your existing property swipe component:

```typescript
import { useSwipeTracker } from "@/components/SwipeTracker";

export function PropertySwipeView() {
  const { trackSwipe } = useSwipeTracker();
  
  const handleSwipe = (property: any, direction: 'left' | 'right') => {
    // Track the swipe
    trackSwipe(property.id, direction, {
      title: property.title,
      bedrooms: property.bedrooms,
      priceCents: property.priceCents,
      // ... other relevant fields
    });
    
    // Your existing swipe logic
    // ...
  };
  
  return (
    // Your existing swipe UI
  );
}
```

**4.5 Add learning progress indicator**

```typescript
import { LearningProgressIndicator, useUserLearningStatus } from "@/components/SwipeTracker";

export function SwipePage() {
  const { data: learningStatus } = useUserLearningStatus();
  
  return (
    <div>
      {/* Your swipe UI */}
      
      {learningStatus && (
        <LearningProgressIndicator 
          swipeCount={learningStatus.swipeCount}
          confidence={learningStatus.confidence}
        />
      )}
    </div>
  );
}
```

---

### STEP 5: Testing & Validation (30 minutes)

**5.1 Test AI Search**

1. Open your app
2. Click "AI Search" button
3. Try these queries:
   - "3 bedroom house in Auckland under $800k"
   - "Modern apartment with sea views"
   - "Family home near good schools"
   - "Investment property with good rental yield"

**Expected Results:**
- ✅ Query is parsed correctly (check console logs)
- ✅ Properties are returned with match scores
- ✅ Match reasons are displayed
- ✅ Properties are sorted by match score (highest first)

**5.2 Test Swipe Tracking**

1. Go to property swipe page
2. Swipe on 10 properties (mix of likes and passes)
3. Check database:
```sql
SELECT * FROM property_swipes WHERE user_id = YOUR_USER_ID ORDER BY created_at DESC LIMIT 10;
```

**Expected Results:**
- ✅ Each swipe is recorded in `property_swipes`
- ✅ `property_snapshot` contains property details
- ✅ `view_duration_seconds` is populated

**5.3 Test Learning System**

1. Swipe on at least 20 properties
2. Check learning status:
```bash
curl http://localhost:5000/api/user/learning-status \
  -H "Cookie: your-session-cookie"
```

**Expected Results:**
- ✅ `confidence` increases with more swipes
- ✅ Preferences are calculated in `user_preferences` table
- ✅ AI search results improve based on swipe history

**5.4 Test Cross-sell**

1. Do an AI search
2. Look at high-match properties (>70% match)
3. Check for report recommendations

**Expected Results:**
- ✅ High-match properties show 2-3 recommended reports
- ✅ Clicking report button navigates to purchase page
- ✅ Clicks are tracked in `report_recommendations` table

---

### STEP 6: Performance Optimization (20 minutes)

**6.1 Add database indexes** (Already in migration, but verify)
```sql
-- Check indexes exist
\di user_preferences
\di property_swipes
\di ai_search_history
```

**6.2 Set up materialized view refresh**

Add a cron job to refresh the search index every 15 minutes:

```typescript
import cron from 'node-cron';

cron.schedule('*/15 * * * *', async () => {
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY property_search_optimized`
  );
  console.log('✅ Search index refreshed');
});
```

**6.3 Set up preference recalculation**

Every hour, recalculate preferences for active users:

```typescript
cron.schedule('0 * * * *', async () => {
  const activeUsers = await db
    .select({ userId: propertySwipes.userId })
    .from(propertySwipes)
    .where(gte(propertySwipes.createdAt, sql`NOW() - INTERVAL '24 hours'`))
    .groupBy(propertySwipes.userId);
  
  for (const user of activeUsers) {
    await db.execute(
      sql`SELECT update_user_preferences_from_swipes(${user.userId})`
    );
  }
});
```

---

## 🎨 UI/UX Enhancements (Optional)

### Add Onboarding Flow

Help users understand the learning system:

```typescript
export function LearningOnboarding() {
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI is Learning Your Taste</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>The more you swipe, the smarter our AI becomes at finding your perfect home!</p>
          <ul className="space-y-2">
            <li>✅ Swipe right on properties you like</li>
            <li>❌ Swipe left on properties you don't</li>
            <li>🧠 AI learns your preferences</li>
            <li>🎯 Get better matches over time</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Add Search History

Let users see their past searches:

```typescript
export function SearchHistory() {
  const { data: history } = useQuery({
    queryKey: ["/api/ai/search-history"],
  });
  
  return (
    <div className="space-y-2">
      <h3>Recent Searches</h3>
      {history?.map((search) => (
        <Card key={search.id} className="cursor-pointer">
          <CardContent className="p-3">
            <p className="text-sm">{search.rawQuery}</p>
            <p className="text-xs text-muted-foreground">
              {search.propertiesFound} properties found
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 📊 Analytics & Monitoring

### Track Key Metrics

**Search Performance:**
- Average search time
- AI parsing accuracy
- Properties found per search
- Click-through rate

**Learning Effectiveness:**
- User confidence scores
- Time to reach 80% confidence
- Improvement in match scores over time

**Cross-sell Performance:**
- Recommendation impression rate
- Click-through rate
- Conversion rate (recommendation → purchase)
- Revenue per search

### Set up monitoring dashboard:

```typescript
app.get("/api/admin/dashboard", async (req, res) => {
  const [searchStats, learningStats, crossSellStats] = await Promise.all([
    // Get search performance metrics
    db.select({
      totalSearches: sql<number>`COUNT(*)`,
      avgSearchTime: sql<number>`AVG(search_duration_ms)`,
      avgPropertiesFound: sql<number>`AVG(properties_found)`,
    }).from(aiSearchHistory),
    
    // Get learning metrics
    db.select({
      totalUsers: sql<number>`COUNT(*)`,
      avgConfidence: sql<number>`AVG(confidence_score)`,
      highConfidenceUsers: sql<number>`COUNT(*) FILTER (WHERE confidence_score > 0.7)`,
    }).from(userPreferences),
    
    // Get cross-sell metrics
    db.select({
      totalRecs: sql<number>`COUNT(*)`,
      clickRate: sql<number>`AVG(CASE WHEN clicked THEN 1.0 ELSE 0.0 END) * 100`,
      conversionRate: sql<number>`AVG(CASE WHEN purchased THEN 1.0 ELSE 0.0 END) * 100`,
    }).from(reportRecommendations),
  ]);
  
  res.json({ searchStats, learningStats, crossSellStats });
});
```

---

## 🎯 Advanced Features (Future Enhancements)

### 1. Multi-Source Search

Extend search to include external property sources:

```typescript
async function searchExternalProperties(criteria: SearchCriteria) {
  // Search Trade Me Property API
  const tradeMeResults = await searchTradeMe(criteria);
  
  // Search real estate.co.nz
  const realEstateResults = await searchRealEstate(criteria);
  
  return [...tradeMeResults, ...realEstateResults];
}
```

### 2. Predictive Recommendations

Proactively notify users of new matches:

```typescript
cron.schedule('0 9 * * *', async () => {
  // Daily at 9 AM, find new properties that match user preferences
  const users = await getActiveUsers();
  
  for (const user of users) {
    const newMatches = await findNewMatchesForUser(user.id);
    
    if (newMatches.length > 0) {
      await sendEmailNotification(user, newMatches);
    }
  }
});
```

### 3. Neighborhood Intelligence

Add detailed neighborhood data:

```typescript
interface NeighborhoodData {
  walkScore: number;
  transitScore: number;
  bikeScore: number;
  crimeRate: number;
  schoolRatings: { name: string; rating: number }[];
  amenities: { type: string; distance: number }[];
  demographics: {
    medianAge: number;
    medianIncome: number;
    familyFriendly: number;
  };
}
```

### 4. AI Chat Assistant

Add conversational search:

```typescript
export function PropertyChatbot() {
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (message: string) => {
    const response = await apiRequest("POST", "/api/ai/chat", {
      message,
      history: messages,
    });
    
    setMessages([...messages, { role: 'user', content: message }, response]);
  };
  
  return <ChatInterface messages={messages} onSend={sendMessage} />;
}
```

---

## 🐛 Troubleshooting

### Issue: AI Search returns 401 error

**Solution:**
- Check that user is authenticated
- Verify session cookies are being sent
- Check authentication middleware is running before route

### Issue: No properties found

**Solution:**
- Check database has properties with `status = 'active'`
- Verify search criteria aren't too restrictive
- Check Claude API is parsing query correctly (console.log the parsed criteria)

### Issue: Learning not improving

**Solution:**
- Verify swipes are being tracked (check `property_swipes` table)
- Ensure preference recalculation cron job is running
- Check that users have at least 10 swipes before expecting results

### Issue: Slow search performance

**Solution:**
- Refresh materialized view: `REFRESH MATERIALIZED VIEW property_search_optimized`
- Add more database indexes on frequently queried columns
- Consider caching match scores for popular properties

---

## 📈 Success Metrics

Track these KPIs to measure success:

**User Engagement:**
- Daily active users using AI search
- Average searches per user
- Time spent in AI search vs regular browse

**Learning Quality:**
- Average user confidence score
- Match score accuracy (liked properties have high scores)
- Time to reach 70%+ confidence

**Business Impact:**
- Report purchase conversion rate from AI search
- Revenue from cross-sell recommendations
- User retention (users with AI search vs without)

---

## 🎉 Launch Checklist

Before going live:

- [ ] All database migrations run successfully
- [ ] API key is set in production environment
- [ ] AI search tested with 100+ real queries
- [ ] Swipe tracking verified across all user flows
- [ ] Cross-sell UI displays correctly on all devices
- [ ] Performance metrics are being logged
- [ ] Cron jobs are set up and running
- [ ] Error handling is in place for all API calls
- [ ] Rate limiting configured for Anthropic API
- [ ] Monitoring and alerting set up
- [ ] User onboarding flow tested
- [ ] Mobile responsive design verified
- [ ] Analytics tracking implemented
- [ ] Load testing completed
- [ ] Security audit passed

---

## 💡 Pro Tips

**For Best Results:**

1. **Seed the learning system** - Import historical swipe data if you have it
2. **A/B test match scoring** - Try different weights for the scoring algorithm
3. **Personalize examples** - Show search examples based on user's swipe history
4. **Add social proof** - "Properties like this get swiped right 80% of the time"
5. **Gamify learning** - "🎯 Level 3: AI knows you well! Unlock premium features"

---

## 📚 Additional Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)

---

## 🤝 Support

Need help? Check these resources:
- GitHub Issues: [your-repo/issues]
- Discord: [your-discord-link]
- Email: support@swiperight.nz

---

**Built with ❤️ for SwipeRight NZ**

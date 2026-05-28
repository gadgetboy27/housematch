-- SwipeRight NZ - AI Search Integration Database Schema
-- Add these tables to your existing Neon PostgreSQL database

-- ============================================
-- 1. USER PREFERENCES & LEARNING
-- ============================================

-- Track user property preferences learned from swipes
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Explicit preferences (from onboarding/profile)
  min_bedrooms INTEGER,
  max_bedrooms INTEGER,
  min_bathrooms INTEGER,
  max_bathrooms INTEGER,
  min_price_cents BIGINT,
  max_price_cents BIGINT,
  preferred_suburbs TEXT[], -- Array of suburb names
  property_types TEXT[], -- ['house', 'apartment', 'townhouse']
  
  -- Lifestyle preferences
  lifestyle_type VARCHAR(50), -- 'family', 'professional', 'retiree', 'student', 'investor'
  priorities TEXT[], -- ['schools', 'commute', 'quiet', 'nightlife', 'parks', 'shopping']
  must_haves TEXT[], -- ['garage', 'garden', 'pool', 'view']
  deal_breakers TEXT[], -- ['busy_road', 'no_parking', 'small_sections']
  
  -- Learned preferences (calculated from swipe behavior)
  preferred_price_range_cents INT8RANGE, -- Learned from swipes
  preferred_suburb_scores JSONB, -- {"Auckland Central": 0.8, "Ponsonby": 0.9}
  preferred_property_features JSONB, -- {"has_garage": 0.7, "has_garden": 0.9}
  
  -- Meta
  confidence_score DECIMAL(3,2) DEFAULT 0.0, -- 0.0-1.0, how confident we are in preferences
  last_calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- 2. SWIPE HISTORY & LEARNING
-- ============================================

-- Track every swipe for learning
CREATE TABLE IF NOT EXISTS property_swipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Swipe data
  direction VARCHAR(10) NOT NULL, -- 'right' (like), 'left' (pass), 'super' (super like)
  swipe_speed_ms INTEGER, -- How fast they swiped (impulse vs considered)
  view_duration_seconds INTEGER, -- How long they viewed before swiping
  
  -- Context at time of swipe
  property_snapshot JSONB, -- Store property details at time of swipe
  user_filters JSONB, -- What filters were active
  
  -- Learning data
  features_at_swipe JSONB, -- Extract key features for ML
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_property_swipe UNIQUE(user_id, property_id)
);

CREATE INDEX idx_swipes_user_id ON property_swipes(user_id);
CREATE INDEX idx_swipes_property_id ON property_swipes(property_id);
CREATE INDEX idx_swipes_direction ON property_swipes(direction);
CREATE INDEX idx_swipes_created_at ON property_swipes(created_at DESC);

-- ============================================
-- 3. AI SEARCH HISTORY
-- ============================================

-- Track AI searches for analytics and improvement
CREATE TABLE IF NOT EXISTS ai_search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Search query
  raw_query TEXT NOT NULL,
  parsed_criteria JSONB, -- Extracted by Claude
  
  -- Results
  properties_found INTEGER DEFAULT 0,
  properties_shown INTEGER DEFAULT 0,
  top_property_ids INTEGER[],
  
  -- User interaction
  clicked_property_ids INTEGER[], -- Which properties they clicked
  requested_reports INTEGER[], -- Property IDs where reports were requested
  search_satisfaction_score INTEGER, -- 1-5 if they rate it
  
  -- Performance
  search_duration_ms INTEGER,
  ai_parsing_duration_ms INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_search_user_id ON ai_search_history(user_id);
CREATE INDEX idx_ai_search_created_at ON ai_search_history(created_at DESC);

-- ============================================
-- 4. PROPERTY MATCH SCORES (Cached)
-- ============================================

-- Cache match scores for faster retrieval
CREATE TABLE IF NOT EXISTS property_match_scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Match scores (0-100)
  overall_score DECIMAL(5,2) NOT NULL,
  base_match_score DECIMAL(5,2), -- Criteria match
  lifestyle_score DECIMAL(5,2), -- Lifestyle fit
  value_score DECIMAL(5,2), -- Price vs market
  preference_score DECIMAL(5,2), -- Based on swipe history
  
  -- Reasoning
  match_reasons TEXT[],
  confidence DECIMAL(3,2), -- 0.0-1.0
  
  -- Meta
  calculated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Recalculate after this
  
  CONSTRAINT unique_user_property_score UNIQUE(user_id, property_id)
);

CREATE INDEX idx_match_scores_user_id ON property_match_scores(user_id);
CREATE INDEX idx_match_scores_property_id ON property_match_scores(property_id);
CREATE INDEX idx_match_scores_overall_score ON property_match_scores(overall_score DESC);
CREATE INDEX idx_match_scores_expires_at ON property_match_scores(expires_at);

-- ============================================
-- 5. REPORT RECOMMENDATIONS (Cross-sell)
-- ============================================

-- Track which reports we've recommended and results
CREATE TABLE IF NOT EXISTS report_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- Recommendation
  report_type VARCHAR(50) NOT NULL, -- 'title_search', 'lim_report', 'rental_data', etc.
  recommended_at TIMESTAMP DEFAULT NOW(),
  recommendation_context VARCHAR(100), -- 'ai_search_result', 'swipe_match', 'property_view'
  
  -- User action
  clicked BOOLEAN DEFAULT FALSE,
  clicked_at TIMESTAMP,
  purchased BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP,
  order_id INTEGER, -- Reference to orders table if purchased
  
  -- Performance tracking
  match_score_when_recommended DECIMAL(5,2)
);

CREATE INDEX idx_report_recs_user_id ON report_recommendations(user_id);
CREATE INDEX idx_report_recs_property_id ON report_recommendations(property_id);
CREATE INDEX idx_report_recs_purchased ON report_recommendations(purchased);

-- ============================================
-- 6. UPDATE EXISTING PROPERTIES TABLE
-- ============================================

-- Add columns to existing properties table for enhanced matching
-- Run this only if these columns don't exist

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS nearby_schools JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS commute_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS neighborhood_score JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP;

-- Example features structure:
-- features: {"has_garage": true, "has_garden": true, "has_pool": false, "modern_kitchen": true}
-- nearby_schools: [{"name": "Auckland Grammar", "distance_km": 1.2, "decile": 10}]
-- commute_data: {"cbd_minutes": 15, "nearest_station": "Britomart"}
-- neighborhood_score: {"safety": 8, "walkability": 9, "nightlife": 7}

CREATE INDEX IF NOT EXISTS idx_properties_features ON properties USING GIN (features);
CREATE INDEX IF NOT EXISTS idx_properties_amenities ON properties USING GIN (amenities);

-- ============================================
-- 7. MATERIALIZED VIEW FOR FAST SEARCH
-- ============================================

-- Create a materialized view for faster AI searches
CREATE MATERIALIZED VIEW IF NOT EXISTS property_search_optimized AS
SELECT 
  p.id,
  p.title,
  p.address,
  p.suburb,
  p.city,
  p.bedrooms,
  p.bathrooms,
  p.price_cents,
  p.property_type,
  p.features,
  p.amenities,
  p.image_url,
  p.created_at,
  -- Aggregated data for faster filtering
  COALESCE(p.bedrooms, 0) as bedrooms_safe,
  COALESCE(p.bathrooms, 0) as bathrooms_safe,
  COALESCE(p.price_cents, 0) as price_cents_safe
FROM properties p
WHERE p.status = 'active' OR p.status = 'available';

CREATE UNIQUE INDEX idx_property_search_id ON property_search_optimized(id);
CREATE INDEX idx_property_search_bedrooms ON property_search_optimized(bedrooms_safe);
CREATE INDEX idx_property_search_price ON property_search_optimized(price_cents_safe);
CREATE INDEX idx_property_search_suburb ON property_search_optimized(suburb);

-- Refresh the materialized view (run this periodically or on property updates)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY property_search_optimized;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to calculate user preference confidence
CREATE OR REPLACE FUNCTION calculate_preference_confidence(p_user_id INTEGER)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  swipe_count INTEGER;
  right_swipe_count INTEGER;
  confidence DECIMAL(3,2);
BEGIN
  -- Count total swipes
  SELECT COUNT(*) INTO swipe_count
  FROM property_swipes
  WHERE user_id = p_user_id;
  
  -- Count right swipes (likes)
  SELECT COUNT(*) INTO right_swipe_count
  FROM property_swipes
  WHERE user_id = p_user_id AND direction IN ('right', 'super');
  
  -- Calculate confidence (0.0 to 1.0)
  -- Need at least 10 swipes to have any confidence
  -- Full confidence at 50+ swipes with good like ratio
  IF swipe_count < 10 THEN
    confidence := 0.0;
  ELSIF swipe_count >= 50 AND right_swipe_count >= 10 THEN
    confidence := 1.0;
  ELSE
    confidence := LEAST((swipe_count::DECIMAL / 50.0), 1.0);
  END IF;
  
  RETURN confidence;
END;
$$ LANGUAGE plpgsql;

-- Function to update user preferences from swipes (call this periodically)
CREATE OR REPLACE FUNCTION update_user_preferences_from_swipes(p_user_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_confidence DECIMAL(3,2);
BEGIN
  -- Calculate confidence
  v_confidence := calculate_preference_confidence(p_user_id);
  
  -- Update or insert preferences
  INSERT INTO user_preferences (
    user_id,
    preferred_price_range_cents,
    confidence_score,
    last_calculated_at
  )
  SELECT
    p_user_id,
    int8range(
      (SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY (property_snapshot->>'price_cents')::BIGINT)
       FROM property_swipes WHERE user_id = p_user_id AND direction IN ('right', 'super')),
      (SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY (property_snapshot->>'price_cents')::BIGINT)
       FROM property_swipes WHERE user_id = p_user_id AND direction IN ('right', 'super'))
    ),
    v_confidence,
    NOW()
  ON CONFLICT (user_id) DO UPDATE SET
    preferred_price_range_cents = EXCLUDED.preferred_price_range_cents,
    confidence_score = EXCLUDED.confidence_score,
    last_calculated_at = EXCLUDED.last_calculated_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA FOR TESTING
-- ============================================

-- Insert sample user preferences for testing
-- INSERT INTO user_preferences (user_id, min_bedrooms, max_price_cents, preferred_suburbs, lifestyle_type, priorities)
-- VALUES (1, 3, 80000000, ARRAY['Auckland Central', 'Ponsonby', 'Grey Lynn'], 'family', ARRAY['schools', 'parks']);

COMMENT ON TABLE user_preferences IS 'Stores user property preferences for AI matching, both explicit and learned from behavior';
COMMENT ON TABLE property_swipes IS 'Tracks all property swipes for learning user preferences';
COMMENT ON TABLE ai_search_history IS 'Logs all AI searches for analytics and improvement';
COMMENT ON TABLE property_match_scores IS 'Cached match scores for faster retrieval';
COMMENT ON TABLE report_recommendations IS 'Tracks report cross-sell recommendations and conversions';

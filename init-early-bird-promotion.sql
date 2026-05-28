-- Initialize Early Bird Promotion
-- This creates the "Launch Special: First 100 Listings FREE!" promotion

INSERT INTO early_bird_promotion (
  name,
  description,
  total_limit,
  total_used,
  is_active
) VALUES (
  'Launch Special: First 100 Listings FREE!',
  'Be one of the first 100 property owners to list for FREE! Limited time only.',
  100,
  0,
  true
)
ON CONFLICT DO NOTHING;

-- Verify it was created
SELECT * FROM early_bird_promotion;

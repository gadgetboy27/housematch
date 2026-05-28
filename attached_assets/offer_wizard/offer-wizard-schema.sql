-- HouseMatch Offer Wizard Database Schema
-- Based on ADLS Agreement for Sale & Purchase requirements (11th Edition 2022)

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Properties table (assuming this exists from your main app)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address TEXT NOT NULL,
    legal_description TEXT,
    current_listing_price DECIMAL(12, 2),
    vendor_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (assuming this exists)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OFFER WIZARD TABLES
-- ============================================================================

-- Main offers table
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Offer details
    offer_price DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) NOT NULL,
    deposit_payment_date DATE NOT NULL,
    settlement_date DATE NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',           -- User is filling out the wizard
        'pending',         -- Submitted but awaiting vendor response
        'accepted',        -- Vendor accepted
        'rejected',        -- Vendor rejected
        'conditional',     -- Accepted but subject to conditions
        'unconditional',   -- All conditions met
        'withdrawn',       -- Buyer withdrew
        'cancelled',       -- Cancelled by system/admin
        'settled'          -- Successfully completed
    )),
    
    -- Wizard completion tracking
    wizard_step INTEGER DEFAULT 1,
    wizard_completed BOOLEAN DEFAULT FALSE,
    
    -- Document generation
    adls_form_purchased BOOLEAN DEFAULT FALSE,
    adls_form_purchase_date TIMESTAMPTZ,
    adls_form_cost DECIMAL(10, 2) DEFAULT 136.85,
    pdf_generated BOOLEAN DEFAULT FALSE,
    pdf_url TEXT,
    
    -- Digital signing
    docusign_envelope_id TEXT,
    docusign_status TEXT,
    signed_by_buyer_at TIMESTAMPTZ,
    signed_by_vendor_at TIMESTAMPTZ,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_offer_price CHECK (offer_price > 0),
    CONSTRAINT positive_deposit CHECK (deposit_amount > 0),
    CONSTRAINT deposit_not_greater_than_price CHECK (deposit_amount <= offer_price),
    CONSTRAINT settlement_after_deposit CHECK (settlement_date > deposit_payment_date)
);

-- Buyer information (solicitor/conveyancer details)
CREATE TABLE offer_buyer_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Buyer's solicitor/conveyancer
    has_solicitor BOOLEAN DEFAULT FALSE,
    solicitor_name TEXT,
    solicitor_firm TEXT,
    solicitor_email TEXT,
    solicitor_phone TEXT,
    solicitor_address TEXT,
    
    -- Additional buyer info
    buyer_occupation TEXT,
    buyer_id_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conditions attached to the offer
CREATE TABLE offer_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    -- Condition type
    condition_type TEXT NOT NULL CHECK (condition_type IN (
        'finance',
        'lim_report',
        'building_inspection',
        'title_search',
        'valuation',
        'insurance',
        'sale_of_buyers_property',
        'custom'
    )),
    
    -- Condition details
    description TEXT NOT NULL,
    days_to_satisfy INTEGER NOT NULL DEFAULT 10,
    due_date DATE NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',     -- Awaiting fulfillment
        'satisfied',   -- Condition met
        'waived',      -- Buyer waived condition
        'failed'       -- Condition not met (offer fails)
    )),
    
    -- Supporting documents
    documents JSONB DEFAULT '[]',
    
    -- Notes
    notes TEXT,
    
    satisfied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chattels (items included/excluded in the sale)
CREATE TABLE offer_chattels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    chattel_type TEXT NOT NULL CHECK (chattel_type IN ('included', 'excluded')),
    item_description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    
    -- Common chattels reference
    is_standard BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Standard chattels reference table (pre-populated)
CREATE TABLE standard_chattels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    typically_included BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);

-- Timeline/activity log for offers
CREATE TABLE offer_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages between buyer and vendor
CREATE TABLE offer_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    
    sender_id UUID NOT NULL REFERENCES users(id),
    message_text TEXT NOT NULL,
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_property ON offers(property_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX idx_offer_conditions_offer ON offer_conditions(offer_id);
CREATE INDEX idx_offer_conditions_status ON offer_conditions(status);
CREATE INDEX idx_offer_chattels_offer ON offer_chattels(offer_id);
CREATE INDEX idx_offer_activities_offer ON offer_activities(offer_id);
CREATE INDEX idx_offer_messages_offer ON offer_messages(offer_id);

-- ============================================================================
-- SEED DATA: STANDARD CHATTELS
-- ============================================================================

INSERT INTO standard_chattels (category, description, typically_included, display_order) VALUES
-- Fixed Coverings
('Fixed Coverings', 'Fixed floor coverings', true, 1),
('Fixed Coverings', 'Blinds and curtains', true, 2),
('Fixed Coverings', 'Light fittings', true, 3),

-- Kitchen Appliances
('Kitchen Appliances', 'Stove', true, 10),
('Kitchen Appliances', 'Oven', true, 11),
('Kitchen Appliances', 'Rangehood', true, 12),
('Kitchen Appliances', 'Dishwasher', true, 13),

-- Heating/Cooling
('Heating/Cooling', 'Heat pump', true, 20),
('Heating/Cooling', 'Fixed heaters', true, 21),
('Heating/Cooling', 'Ceiling fans', true, 22),

-- Outdoor
('Outdoor', 'Letterbox', true, 30),
('Outdoor', 'Clothesline', true, 31),
('Outdoor', 'Garden shed', true, 32),
('Outdoor', 'Fixed BBQ', true, 33),

-- Security
('Security', 'Alarm system', true, 40),
('Security', 'Security cameras', true, 41),
('Security', 'Gate remote controls', true, 42),

-- Typically Excluded
('Excluded', 'Freestanding furniture', false, 100),
('Excluded', 'Washing machine', false, 101),
('Excluded', 'Dryer', false, 102),
('Excluded', 'Fridge/Freezer', false, 103),
('Excluded', 'Wall art and mirrors', false, 104);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offer_buyer_details_updated_at BEFORE UPDATE ON offer_buyer_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offer_conditions_updated_at BEFORE UPDATE ON offer_conditions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offer_chattels_updated_at BEFORE UPDATE ON offer_chattels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate condition due dates
CREATE OR REPLACE FUNCTION calculate_condition_due_date(
    settlement_date DATE,
    days_to_satisfy INTEGER
)
RETURNS DATE AS $$
BEGIN
    -- Working days calculation (simplified - excludes weekends)
    RETURN settlement_date - (days_to_satisfy * INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- Function to log offer activities automatically
CREATE OR REPLACE FUNCTION log_offer_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO offer_activities (offer_id, activity_type, description, metadata)
        VALUES (NEW.id, 'offer_created', 'Offer created', jsonb_build_object('offer_price', NEW.offer_price));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO offer_activities (offer_id, activity_type, description, metadata)
            VALUES (NEW.id, 'status_changed', 'Offer status changed', 
                    jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_offer_changes AFTER INSERT OR UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION log_offer_activity();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Complete offer details view
CREATE OR REPLACE VIEW offer_details AS
SELECT 
    o.id as offer_id,
    o.status,
    o.offer_price,
    o.deposit_amount,
    o.deposit_payment_date,
    o.settlement_date,
    o.wizard_completed,
    o.created_at as offer_created_at,
    
    -- Property info
    p.id as property_id,
    p.address as property_address,
    p.legal_description,
    p.current_listing_price,
    
    -- Buyer info
    u.id as buyer_id,
    u.full_name as buyer_name,
    u.email as buyer_email,
    u.phone as buyer_phone,
    
    -- Solicitor info
    bd.solicitor_name,
    bd.solicitor_firm,
    bd.solicitor_email,
    
    -- Conditions count
    (SELECT COUNT(*) FROM offer_conditions WHERE offer_id = o.id AND status = 'pending') as pending_conditions,
    (SELECT COUNT(*) FROM offer_conditions WHERE offer_id = o.id AND status = 'satisfied') as satisfied_conditions,
    
    -- Document status
    o.pdf_generated,
    o.pdf_url,
    o.docusign_status
    
FROM offers o
JOIN properties p ON o.property_id = p.id
JOIN users u ON o.buyer_id = u.id
LEFT JOIN offer_buyer_details bd ON o.id = bd.offer_id;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get all offers for a property
-- SELECT * FROM offer_details WHERE property_id = 'some-uuid' ORDER BY offer_created_at DESC;

-- Get all pending conditions for an offer
-- SELECT * FROM offer_conditions WHERE offer_id = 'some-uuid' AND status = 'pending';

-- Get offer timeline
-- SELECT * FROM offer_activities WHERE offer_id = 'some-uuid' ORDER BY created_at DESC;

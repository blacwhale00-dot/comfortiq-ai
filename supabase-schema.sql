-- ============================================
-- ComfortIQ.AI - Supabase Schema
-- Built by Tandem - March 22, 2026
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- LEADS TABLE - Core homeowner records
-- ============================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contact Info
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    
    -- Location
    street_address TEXT,
    city TEXT,
    state TEXT DEFAULT 'GA',
    zip_code TEXT,
    
    -- Quiz Answers (JSON for flexibility)
    quiz_answers JSONB DEFAULT '{}',
    
    -- System Info
    system_age INTEGER,
    system_model TEXT,
    system_brand TEXT,
    outdoor_unit_photo_url TEXT,
    thermostat_photo_url TEXT,
    breaker_panel_photo_url TEXT,
    electric_bill_photo_url TEXT,
    
    -- Electric Bill Analysis
    monthly_bill NUMERIC,
    kwh_usage NUMERIC,
    rate_per_kwh NUMERIC DEFAULT 0.14,
    power_tax NUMERIC,  -- Monthly waste from inefficiency
    
    -- Scoring
    readiness_score INTEGER DEFAULT 0,  -- 0-100
    persona TEXT,  -- 'System Survivor' / 'Efficiency Hunter' / 'Planner'
    
    -- Pipeline
    stage TEXT DEFAULT 'new' CHECK (stage IN (
        'new', 'quiz_started', 'quiz_complete', 
        'photos_uploaded', 'report_sent', 'recovery',
        'appointment_scheduled', 'sold', 'lost'
    )),
    
    -- Discount Tracking
    discount_outdoor_unit BOOLEAN DEFAULT FALSE,
    discount_thermostat BOOLEAN DEFAULT FALSE,
    discount_breaker_panel BOOLEAN DEFAULT FALSE,
    discount_electric_bill BOOLEAN DEFAULT FALSE,
    discount_total NUMERIC DEFAULT 0,
    
    -- Savings Analysis (from calculator)
    savings_analysis JSONB,
    
    -- Recommendation
    recommended_tier TEXT,  -- 'budget' / 'efficiency' / 'ultimate'
    estimate_low NUMERIC,
    estimate_high NUMERIC,
    
    -- Tags
    tags TEXT[] DEFAULT '{}',
    
    -- Tracking
    pdf_opens INTEGER DEFAULT 0,
    sms_count INTEGER DEFAULT 0,
    call_count INTEGER DEFAULT 0,
    email_opens INTEGER DEFAULT 0,
    
    -- Timestamps
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    next_action_at TIMESTAMP WITH TIME ZONE,
    quiz_started_at TIMESTAMP WITH TIME ZONE,
    quiz_completed_at TIMESTAMP WITH TIME ZONE,
    report_sent_at TIMESTAMP WITH TIME ZONE,
    appointment_scheduled_at TIMESTAMP WITH TIME ZONE,
    
    -- Revenue
    deal_value NUMERIC,
    closed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    source TEXT DEFAULT 'quiz',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT
);

-- Indexes for leads
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_next_action ON leads(next_action_at) WHERE next_action_at IS NOT NULL;
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);
CREATE INDEX idx_leads_zip ON leads(zip_code);

-- ============================================
-- COMMUNICATIONS TABLE - All outreach log
-- ============================================
CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Communication Type
    type TEXT NOT NULL CHECK (type IN ('sms', 'voice', 'email', 'whatsapp', 'chat')),
    direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    
    -- Content
    subject TEXT,
    content TEXT NOT NULL,
    
    -- Twilio/Provider Info
    twilio_sid TEXT,
    twilio_status TEXT,  -- 'queued' 'sent' 'delivered' 'failed' 'undelivered'
    
    -- Timing
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Related to quiz stage
    trigger_at TIMESTAMP WITH TIME ZONE,  -- When this should be sent
    sequence_step INTEGER DEFAULT 0,
    
    -- Cost tracking
    cost NUMERIC DEFAULT 0,
    
    -- Notes
    notes TEXT
);

-- Indexes for communications
CREATE INDEX idx_comm_lead_id ON communications(lead_id);
CREATE INDEX idx_comm_type ON communications(type);
CREATE INDEX idx_comm_created ON communications(created_at DESC);
CREATE INDEX idx_comm_twilio_sid ON communications(twilio_sid);

-- ============================================
-- CONTRACTORS TABLE - William + future contractors
-- ============================================
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    company TEXT,
    
    -- Service area
    service_area TEXT[],  -- Array of zip codes or cities
    state TEXT DEFAULT 'GA',
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    
    -- William's specific fields
    is_william BOOLEAN DEFAULT FALSE,
    years_experience INTEGER,
    specializations TEXT[],
    
    -- Twilio numbers (for calling from this contractor)
    twilio_call_from TEXT,
    
    -- GHL integration (legacy)
    ghl_location_id TEXT,
    
    -- Stats
    total_leads INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    total_sold INTEGER DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0
);

-- Insert William as first contractor
INSERT INTO contractors (name, email, phone, company, is_william, years_experience, status)
VALUES (
    'Will Macon',
    'will@rsandrews.com',
    '(404) 555-0100',
    'R.S. Andrews',
    TRUE,
    20,
    'active'
);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
    
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Address for appointment
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    
    -- Status
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'completed', 
        'cancelled', 'no_show', 'rescheduled'
    )),
    
    -- Outcome
    outcome TEXT,  -- 'sold' / 'quote_sent' / 'follow_up_needed' / 'not_interested'
    deal_value NUMERIC,
    notes TEXT,
    
    -- Reminders sent
    reminder_24h BOOLEAN DEFAULT FALSE,
    reminder_2h BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_appt_lead ON appointments(lead_id);
CREATE INDEX idx_appt_contractor ON appointments(contractor_id);
CREATE INDEX idx_appt_scheduled ON appointments(scheduled_at);

-- ============================================
-- QUIZ SESSIONS TABLE - Chat history per lead
-- ============================================
CREATE TABLE quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Conversation state
    current_question INTEGER DEFAULT 1,
    conversation_history JSONB DEFAULT '[]',
    
    -- Variables tracked
    comfort_score INTEGER,
    bill_pain TEXT,
    age_band TEXT,
    emergency_history BOOLEAN DEFAULT FALSE,
    iaq_issues BOOLEAN DEFAULT FALSE,
    budget_stress BOOLEAN DEFAULT FALSE,
    
    -- State
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_qs_lead ON quiz_sessions(lead_id);

-- ============================================
-- PHOTOS TABLE - All uploaded photos
-- ============================================
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN (
        'outdoor_unit', 'thermostat', 'breaker_panel', 
        'electric_bill', 'roof', 'ductwork', 'other'
    )),
    
    -- Storage
    supabase_storage_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    
    -- AI Analysis (done by Tandem)
    ai_analysis JSONB,  -- {model, age, brand, condition, notes}
    ai_read_at TIMESTAMP WITH TIME ZONE,
    
    -- What was extracted
    extracted_model TEXT,
    extracted_brand TEXT,
    extracted_age INTEGER,
    extracted_serial TEXT
);

CREATE INDEX idx_photo_lead ON photos(lead_id);
CREATE INDEX idx_photo_type ON photos(type);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_leads_updated
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_contractors_updated
    BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate Power Tax automatically
CREATE OR REPLACE FUNCTION calculate_power_tax(
    p_monthly_bill NUMERIC,
    p_system_age INTEGER
) RETURNS NUMERIC AS $$
DECLARE
    v_current_seer NUMERIC;
    v_optimal_seer NUMERIC := 18;
    v_rate NUMERIC := 0.14;
    v_annual_cost NUMERIC;
    v_optimal_annual NUMERIC;
BEGIN
    -- Estimate current SEER from age
    IF p_system_age <= 5 THEN v_current_seer := 14;
    ELSIF p_system_age <= 10 THEN v_current_seer := 12;
    ELSIF p_system_age <= 15 THEN v_current_seer := 10;
    ELSE v_current_seer := 10;
    END IF;
    
    v_annual_cost := p_monthly_bill * 12;
    
    -- Power Tax = amount wasted due to inefficiency
    -- At optimal SEER 18, what should annual cost be?
    -- Efficiency ratio: current/optimal
    v_optimal_annual := v_annual_cost * (v_current_seer / v_optimal_seer);
    
    RETURN ROUND(v_annual_cost - v_optimal_annual, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Public read/write for leads (app inserts itself)
CREATE POLICY "Public can view leads" ON leads FOR SELECT USING (true);
CREATE POLICY "Public can insert leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update leads" ON leads FOR UPDATE USING (true);

CREATE POLICY "Public can view communications" ON communications FOR SELECT USING (true);
CREATE POLICY "Public can insert communications" ON communications FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view appointments" ON appointments FOR SELECT USING (true);
CREATE POLICY "Public can insert appointments" ON appointments FOR INSERT WITH CHECK (true);

-- ============================================
-- SUPABASE STORAGE BUCKETS
-- ============================================
-- Run these in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- ============================================
-- SNAPSHOT VIEWS FOR DASHBOARD
-- ============================================

-- Hot leads view (needs immediate attention)
CREATE VIEW hot_leads AS
SELECT 
    l.id,
    l.first_name,
    l.last_name,
    l.phone,
    l.email,
    l.stage,
    l.power_tax,
    l.readiness_score,
    l.system_age,
    l.estimate_high,
    l.pdf_opens,
    l.sms_count,
    l.last_contacted_at,
    l.next_action_at,
    EXTRACT(HOURS FROM NOW() - l.last_contacted_at) as hours_since_contact
FROM leads l
WHERE l.stage IN ('new', 'recovery', 'report_sent')
    AND l.readiness_score >= 50
ORDER BY l.readiness_score DESC, l.power_tax DESC;

-- Pipeline summary
CREATE VIEW pipeline_summary AS
SELECT 
    stage,
    COUNT(*) as count,
    SUM(estimate_high) as total_value,
    AVG(readiness_score) as avg_score
FROM leads
WHERE stage NOT IN ('sold', 'lost')
GROUP BY stage;

-- Recovery queue
CREATE VIEW recovery_queue AS
SELECT 
    l.id,
    l.first_name,
    l.phone,
    l.stage,
    l.readiness_score,
    l.pdf_opens,
    l.sms_count,
    l.last_contacted_at,
    c.content as last_message
FROM leads l
LEFT JOIN LATERAL (
    SELECT content FROM communications 
    WHERE lead_id = l.id AND direction = 'outbound'
    ORDER BY created_at DESC LIMIT 1
) c ON true
WHERE l.stage = 'recovery'
    OR (l.next_action_at <= NOW() AND l.next_action_at IS NOT NULL)
ORDER BY l.next_action_at ASC NULLS LAST;

-- William's daily dashboard
CREATE VIEW daily_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM leads WHERE DATE(created_at) = CURRENT_DATE) as new_today,
    (SELECT COUNT(*) FROM leads WHERE DATE(quiz_completed_at) = CURRENT_DATE) as quiz_complete_today,
    (SELECT COUNT(*) FROM appointments WHERE DATE(scheduled_at) = CURRENT_DATE) as appointments_today,
    (SELECT COUNT(*) FROM leads WHERE DATE(appointment_scheduled_at) = CURRENT_DATE) as booked_today,
    (SELECT COUNT(*) FROM leads WHERE stage = 'sold' AND DATE(closed_at) = CURRENT_DATE) as sold_today,
    (SELECT COALESCE(SUM(deal_value), 0) FROM leads WHERE stage = 'sold' AND DATE(closed_at) = CURRENT_DATE) as revenue_today,
    (SELECT COUNT(*) FROM leads WHERE stage = 'recovery') as recovery_count,
    (SELECT COUNT(*) FROM leads WHERE next_action_at BETWEEN NOW() AND NOW() + INTERVAL '2 hours') as follow_up_due;
EOF
echo "Schema saved to /workspace/comfortiq-supabase-schema.sql"
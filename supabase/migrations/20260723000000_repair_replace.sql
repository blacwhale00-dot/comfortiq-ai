-- Cora Repair-vs-Replace: repair history capture, calculator runs, and the
-- rebate lookup. Per the July 23 handoff: rebates/thresholds live in DATA, not
-- code — every dollar figure and rule in these tables is editable from the
-- dashboard without a deploy.
--
-- FK note: the spec's "assessments" is this project's quiz_sessions (the
-- operative funnel record). homeowners exists in this DB but is an unused
-- blueprint table (0 rows) — homeowner_id kept nullable for forward-compat.

-- ============================================================
-- Repair events reported by the homeowner during Cora's exchange
-- ============================================================
CREATE TABLE public.repair_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  homeowner_id UUID REFERENCES public.homeowners(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- What happened
  repair_within_24mo BOOLEAN NOT NULL,
  repair_date_approx DATE,
  repair_cost_usd NUMERIC(8,2),
  repair_component TEXT,
  repair_count_24mo SMALLINT,
  was_financed BOOLEAN,
  monthly_payment_usd NUMERIC(7,2),
  contractor_name TEXT,
  still_having_issues BOOLEAN,

  -- Derived
  repair_regret_score SMALLINT,
  regret_formula_version TEXT,
  raw_conversation_extract JSONB
);

CREATE INDEX idx_repair_history_session ON public.repair_history (quiz_session_id);
CREATE INDEX idx_repair_history_regret ON public.repair_history (repair_regret_score);

-- RLS mirrors cora_reminders (holds costs + contractor names): the anon client
-- may only INSERT during the assessment; reads go through the service role.
ALTER TABLE public.repair_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a repair history record"
  ON public.repair_history FOR INSERT WITH CHECK (true);

-- ============================================================
-- Calculator runs (one per assessment; re-runnable)
-- ============================================================
CREATE TABLE public.repair_replace_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Inputs snapshot
  system_age_years NUMERIC(4,1),
  system_type TEXT,
  guzzler_band TEXT,
  est_monthly_energy_waste_usd NUMERIC(7,2),
  cumulative_repair_cost_24mo NUMERIC(8,2),
  active_repair_payment_usd NUMERIC(7,2),
  est_replacement_cost_usd NUMERIC(8,2),
  est_replacement_monthly_usd NUMERIC(7,2),
  applicable_rebates JSONB,

  -- Outputs
  repair_cost_pct_of_replacement NUMERIC(5,2),
  five_year_keep_cost_usd NUMERIC(9,2),
  five_year_replace_cost_usd NUMERIC(9,2),
  recommendation TEXT NOT NULL
    CHECK (recommendation IN ('repair','replace','monitor','needs_inspection')),
  recommendation_confidence TEXT
    CHECK (recommendation_confidence IN ('high','moderate','low')),
  reasoning_summary TEXT
);

CREATE INDEX idx_rra_session ON public.repair_replace_analysis (quiz_session_id, created_at);

-- Anon INSERT (client computes + persists) and SELECT (no PII — dollar
-- estimates only; enables resume on a return visit, funnel_events pattern).
ALTER TABLE public.repair_replace_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a repair analysis"
  ON public.repair_replace_analysis FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read repair analyses"
  ON public.repair_replace_analysis FOR SELECT USING (true);

-- ============================================================
-- Rebate lookup — the ONLY place incentive data lives
-- ============================================================
CREATE TABLE public.rebate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  admin_agency TEXT,
  state CHAR(2) NOT NULL,
  utility_or_emc TEXT,
  max_amount_usd NUMERIC(8,2),
  income_qualified BOOLEAN NOT NULL DEFAULT false,
  income_tier TEXT,
  eligible_measures TEXT[],
  fuel_switching_allowed BOOLEAN,
  -- Date after which the fuel-switching pathway is gone (HEAR: 2026-08-10).
  -- The resolver excludes fuel-switch-dependent applications past this date.
  fuel_switching_ends_on DATE,
  point_of_sale BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','exhausted','ended')),
  deadline_notes TEXT,
  last_verified DATE NOT NULL,
  source_url TEXT
);

CREATE INDEX idx_rebates_state_status ON public.rebate_programs (state, status);

-- Public info: anon may read. All writes via service role / dashboard only.
ALTER TABLE public.rebate_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rebate programs"
  ON public.rebate_programs FOR SELECT USING (true);

-- ============================================================
-- Calculator config — thresholds live here, not in code
-- ============================================================
CREATE TABLE public.repair_calc_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.repair_calc_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read calc config"
  ON public.repair_calc_config FOR SELECT USING (true);

-- ============================================================
-- Seed: config defaults (see src/lib/repair-replace.ts for the shape)
-- ============================================================
INSERT INTO public.repair_calc_config (key, value, notes) VALUES
('thresholds', '{
  "fifty_pct_rule": 0.5,
  "thirty_pct_rule": 0.3,
  "old_age_years": 10,
  "very_old_age_years": 12,
  "young_age_years": 8
}', 'Recommendation-ladder thresholds (spec section 4)'),
('replacement_cost_bands', '{
  "gas_furnace_ac":      {"low": 9000,  "high": 16000},
  "heat_pump":           {"low": 9500,  "high": 16000},
  "electric_resistance": {"low": 9000,  "high": 15000},
  "straight_cool":       {"low": 7500,  "high": 13000},
  "unknown":             {"low": 9000,  "high": 16000}
}', 'ESTIMATE bands, never presented as quotes'),
('financing', '{"apr": 0.0899, "term_months": 120}', 'Replacement financing estimate assumptions'),
('projection', '{
  "deferral_multiplier_old": 1.5,
  "annual_repair_base_usd": {"lt8": 150, "8to12": 350, "gte12": 650},
  "waste_recovery_pct": 0.75
}', 'Conservative, defensible values — industry deferred-maintenance research'),
('regret_weights', '{
  "version": "v1",
  "financed": 25, "cost_gte_1200": 20, "still_having_issues": 20,
  "two_plus_repairs": 15, "age_gte_12": 10, "band_drinking_bleeding": 10
}', 'Repair regret score weighting (0-100 cap)');

-- ============================================================
-- Seed: Georgia rebate programs
-- Figures from the July 23 2026 product handoff; live-verify flagged for Will.
-- ============================================================
INSERT INTO public.rebate_programs
(program_name, admin_agency, state, utility_or_emc, max_amount_usd, income_qualified, income_tier, eligible_measures, fuel_switching_allowed, fuel_switching_ends_on, point_of_sale, status, deadline_notes, last_verified, source_url) VALUES
('GA HEAR', 'Georgia Environmental Finance Authority (GEFA)', 'GA', NULL, 8000.00, true, '<=80_ami',
 '{heat_pump_hvac}', true, '2026-08-10', true, 'active',
 'Fuel-switching pathway ends 2026-08-10 10:00 ET; heat-pump-to-heat-pump replacements continue. Income-qualified (100% up to 80% AMI, 50% for 80-150% AMI).',
 '2026-07-23', 'https://gefa.georgia.gov'),
('Georgia Power HEIP', 'Georgia Power', 'GA', 'Georgia Power', 1000.00, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active',
 'Air-source heat pump rebate; no income limit.',
 '2026-07-23', 'https://www.georgiapower.com'),
('Jackson EMC member rebate', 'Jackson EMC', 'GA', 'Jackson EMC', NULL, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active', 'Amount to be confirmed.', '2026-07-23', 'https://www.jacksonemc.com'),
('Cobb EMC member rebate', 'Cobb EMC', 'GA', 'Cobb EMC', NULL, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active', 'Amount to be confirmed.', '2026-07-23', 'https://www.cobbemc.com'),
('Walton EMC member rebate', 'Walton EMC', 'GA', 'Walton EMC', NULL, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active', 'Amount to be confirmed.', '2026-07-23', 'https://www.waltonemc.com'),
('GreyStone Power member rebate', 'GreyStone Power', 'GA', 'GreyStone Power', NULL, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active', 'Amount to be confirmed.', '2026-07-23', 'https://www.greystonepower.com'),
('Snapping Shoals EMC member rebate', 'Snapping Shoals EMC', 'GA', 'Snapping Shoals EMC', NULL, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active', 'Amount to be confirmed.', '2026-07-23', 'https://www.ssemc.com'),
('Coweta-Fayette EMC member rebate', 'Coweta-Fayette EMC', 'GA', 'Coweta-Fayette EMC', NULL, false, 'none',
 '{heat_pump_hvac}', NULL, NULL, false, 'active', 'Amount to be confirmed.', '2026-07-23', 'https://utility.org');

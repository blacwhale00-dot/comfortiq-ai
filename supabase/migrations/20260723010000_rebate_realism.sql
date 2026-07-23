-- Addendum 1: Rebate Realism Corrections (July 23 handoff addendum).
-- Rebates are not free money — qualifying scopes carry conversion adders, the
-- post-8/10 HEAR rule is disputed, and HER/HOMES is excluded by product
-- decision. Everything here is data: correcting any rule later is a row edit.

-- ---------- schema additions ----------
ALTER TABLE public.rebate_programs
  ADD COLUMN IF NOT EXISTS scope_requirements JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS friction_level TEXT DEFAULT 'medium'
    CHECK (friction_level IN ('low','medium','high')),
  ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'conditional'
    CHECK (display_mode IN ('headline','conditional','hidden'));

-- ---------- HER/HOMES: excluded by product decision, never surface ----------
-- (No such row was ever seeded; this is an idempotent guard + audit trail.)
UPDATE public.rebate_programs
SET status = 'ended',
    deadline_notes = 'Excluded by product decision 2026-07-23 — do not surface'
WHERE program_name ILIKE '%HOMES%' OR program_name ILIKE '%HER %'
   OR program_name ILIKE '%Home Efficiency Rebate%';

-- ---------- GA HEAR: disputed post-8/10 rule encoded as UNVERIFIED data ----------
UPDATE public.rebate_programs
SET scope_requirements = '{
      "full_conversion_required": true,
      "components": ["heat_pump","air_handler"],
      "typical_adders": ["plenum_rework","electrical_panel_possible"],
      "post_2026_08_10_eligibility": "electric_to_electric_only",
      "eligibility_rule_verified": false,
      "tier_coverage": {"<=80_ami": 1.0, "80_150_ami": 0.5}
    }'::jsonb,
    friction_level = 'high',
    display_mode = 'conditional',
    deadline_notes = 'Fuel-switching scopes must be submitted by 2026-08-10 10:00 ET per GEFA. Field reports conflicting interpretation of post-deadline eligibility — VERIFY with GEFA/participating contractor desk before relying on resolver output for gas homes. Rule is data-driven; correcting it is a row edit.'
WHERE program_name = 'GA HEAR';

-- ---------- HEIP: reliable, low-friction, headline-worthy ----------
UPDATE public.rebate_programs
SET friction_level = 'low',
    display_mode = 'headline',
    deadline_notes = 'Air-source heat pump: 50% of installed cost up to $1,000. Ground-source variant capped at $300. Application within 60 days of paid invoice. Georgia Power residential service required.'
WHERE program_name = 'Georgia Power HEIP';

-- ---------- EMC placeholders: typical $100-$600 member rebates ----------
UPDATE public.rebate_programs
SET max_amount_usd = 600.00,
    friction_level = 'low',
    display_mode = 'conditional',
    deadline_notes = 'Member-only; typical range $100-$600 — verify amount with the EMC.',
    last_verified = '2026-07-23'
WHERE utility_or_emc LIKE '%EMC%' OR utility_or_emc = 'GreyStone Power';

-- ---------- conversion-cost adders + demotion threshold (config) ----------
-- PLACEHOLDER DEFAULTS — Will (20 years of Atlanta job costing) reviews these
-- before merge; tune by editing this row, no deploy.
INSERT INTO public.repair_calc_config (key, value, notes) VALUES
('conversion_adders', '{
  "plenum_usd": {"low": 1200, "high": 2500},
  "air_handler_incremental_usd": {"low": 800, "high": 1800},
  "panel_possible_usd": {"low": 0, "high": 3000, "note": "possible, site-dependent"},
  "marginal_net_rebate_threshold_usd": 1000
}', 'Full-conversion adders (Addendum 1 §3). PLACEHOLDERS pending Will''s Atlanta market review.')
ON CONFLICT (key) DO NOTHING;

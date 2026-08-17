// ═══════════════════════════════════════════════════════════════════════════
// THE ONLY FILE THAT CHANGES WHEN WILL DELIVERS THE MASCOT ASSETS.
// ═══════════════════════════════════════════════════════════════════════════
//
// Cora is a gauge-character mascot (Recraft V4.1 vector), not a human. Brand
// law from the 17-08 brief: no human-Cora imagery anywhere in the app. The old
// human avatar (src/assets/comfort-avatar.png) has been removed; until Will's
// approved artwork lands, CoraMascotFallback renders a neutral inline-SVG gauge
// so every surface still shows a mascot rather than a blank box.
//
// ── STEP 1 · when the approved neutral PNG (transparent bg) arrives ─────────
//   1. Save it to  src/assets/cora-mascot.png
//   2. Uncomment the import below and set CORA_MASCOT_PNG = coraMascotPng
//   Nothing else changes — every surface picks it up.
//
// ── STEP 2 · when the .riv arrives ─────────────────────────────────────────
//   1. Save it to  public/cora/cora-mascot.riv   (Rive loads it by URL, so it
//      belongs in public/, not src/assets/)
//   2. Set CORA_MASCOT_RIV = "/cora/cora-mascot.riv"
//   3. Verify the state machine name + input names against
//      src/components/cora/cora-states.ts — per Will's rule, the file wins.
//   The Rive runtime stays out of the main bundle until this is non-null.

// import coraMascotPng from "@/assets/cora-mascot.png";

/**
 * Static mascot artwork. `null` until Will delivers the approved neutral PNG —
 * CoraMascotFallback draws a placeholder gauge in the meantime.
 */
export const CORA_MASCOT_PNG: string | null = null;

/**
 * Public URL of the animated `.riv`. `null` until Will delivers it; while null
 * CoraMascot never imports the Rive runtime at all, so there is no WASM cost.
 */
export const CORA_MASCOT_RIV: string | null = null;

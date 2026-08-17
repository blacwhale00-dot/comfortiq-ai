import type { Page, Route } from "@playwright/test";

// Shared plumbing for the responsive QA specs.
//
// The funnel screens are gated on a persisted quiz session, so every route past
// /quiz needs both a session id in localStorage and a Supabase reply. We stub
// PostgREST rather than talk to a real project: layout QA must be hermetic and
// must not write rows into D.A.V.E.

export const SESSION_ID = "00000000-0000-4000-8000-000000000001";

/** A GOLD session — all five uploads present. Drives /trophy. */
export const GOLD_SESSION = {
  id: SESSION_ID,
  email: "a.very.long.homeowner.address@averylongdomainname.example.com",
  first_name: "Dana",
  last_name: "Whitfield",
  guzzler_score: 78,
  quiz_completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  upload_outdoor: "https://example.test/outdoor.jpg",
  upload_breaker: "https://example.test/breaker.jpg",
  upload_thermostat: "https://example.test/thermostat.jpg",
  upload_air_handler: "https://example.test/air-handler.jpg",
  upload_bill: "https://example.test/bill.pdf",
};

/** A partial session — used by /unlock and /incomplete, which reject GOLD. */
export const PARTIAL_SESSION = {
  ...GOLD_SESSION,
  upload_thermostat: null,
  upload_air_handler: null,
  upload_bill: null,
};

/**
 * Intercept every Supabase call the funnel makes and answer it locally.
 *
 * PostgREST returns a bare object (not an array) when the client asks for one
 * via the `pgrst.object` Accept header — which is what `.single()` /
 * `.maybeSingle()` do — so mirror that or supabase-js mis-parses the reply.
 */
export async function stubSupabase(page: Page, row: Record<string, unknown>) {
  const reply = (route: Route, body: unknown) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/rest/v1/**", (route) => {
    const wantsObject = (route.request().headers()["accept"] ?? "").includes("pgrst.object");
    return reply(route, wantsObject ? row : [row]);
  });

  // Photo uploads and the send-report handoff must never leave the machine.
  await page.route("**/storage/v1/**", (route) => reply(route, { Key: "audit-uploads/stub" }));
  await page.route("**/functions/v1/**", (route) => reply(route, { status: "sent" }));
}

export interface BrowserState {
  /** Seed the quiz session id the post-quiz screens read from localStorage. */
  session?: boolean;
  /** Mark the three-door entry gate as already seen, so `/` renders the dashboard. */
  gateSeen?: boolean;
}

/**
 * Put the browser into the state a given screen expects.
 *
 * The landing page is deliberately stateful: a fresh visitor gets the intent
 * gate, and a visitor with a scored-but-incomplete session is redirected to
 * /incomplete. Both are correct behaviour, so each spec says which visitor it
 * is testing rather than seeding one blanket state.
 */
export async function primeBrowser(page: Page, state: BrowserState = {}) {
  await page.addInitScript(
    ({ id, session, gateSeen }) => {
      if (session) window.localStorage.setItem("comfortiq_session", id);
      else window.localStorage.removeItem("comfortiq_session");
      if (gateSeen) window.sessionStorage.setItem("comfortiq_intent_seen", "1");
    },
    { id: SESSION_ID, session: state.session ?? false, gateSeen: state.gateSeen ?? false },
  );
}

export interface OverflowReport {
  scrollWidth: number;
  clientWidth: number;
  offenders: string[];
}

/**
 * Measure horizontal overflow and name the elements responsible, so a failure
 * points at the culprit instead of just "wider than the viewport".
 */
export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const limit = doc.clientWidth;
    const offenders: string[] = [];

    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      // Fixed/sticky chrome is measured against the viewport too, so a single
      // tolerance of 1px covers sub-pixel rounding everywhere.
      if (rect.right > limit + 1 || rect.left < -1) {
        const cls = (el.getAttribute("class") ?? "").slice(0, 80);
        offenders.push(`<${el.tagName.toLowerCase()} class="${cls}"> right=${Math.round(rect.right)}`);
      }
    }

    return { scrollWidth: doc.scrollWidth, clientWidth: limit, offenders: offenders.slice(0, 6) };
  });
}

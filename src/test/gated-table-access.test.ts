import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Structural guard, not a behavior test.
//
// Four tables have been closed to the anon role and put behind SECURITY DEFINER
// RPCs: quiz_sessions, consent_records, funnel_events and property_intelligence
// (plus repair_replace_analysis, repair_history and cora_reminders, where only
// reads were revoked). Each lockdown migration says some version of "everything
// funnels through here so no screen can quietly reintroduce a supabase.from()
// call" — this is what actually enforces that.
//
// It matters because the failure is silent in both directions. supabase-js
// resolves with `{ error }` rather than throwing, so a reintroduced direct call
// looks like working code and fails only at runtime, in production, with the
// funnel swallowing the error. And a table that quietly regains a public read
// policy leaks quiz_session_id, which the gateway treats as a capability —
// exactly how funnel_events exposed every homeowner's contact record.
//
// If you need a new access path to one of these tables, add it to the RPC and
// route it through the lib wrapper. Do not add an exemption here.

const SRC = join(process.cwd(), "src");

// table -> the module that is allowed to be its single entry point
const GATED_TABLES: Record<string, string> = {
  quiz_sessions: "src/lib/quiz-session.ts",
  consent_records: "src/pages/QuizPage.tsx",
  funnel_events: "src/lib/funnel-events.ts",
  property_intelligence: "src/lib/property-intelligence.ts",
};

// Direct writes here are still legitimate; only reads were revoked.
const WRITE_ONLY_TABLES = ["repair_replace_analysis", "repair_history", "cora_reminders"];

// Both internal dashboards still query gated tables directly. Neither is an
// exposure today because both are offline — deliberately not imported or routed
// in App.tsx — and their queries would fail anyway now that anon has no grant.
// The files are kept intact so they can be rebuilt behind Supabase Auth, reading
// through an edge function under the service role.
//
// The exemption is conditional, and the test below enforces the condition: the
// moment anyone re-routes one of these, it stops being exempt and its direct
// queries have to be fixed first. Do not make the exemption unconditional —
// screens that list every lead are exactly where a silent read failure would be
// least noticed and most costly.
const OFFLINE_PAGES = [
  { file: "src/pages/CommandCenterPage.tsx", component: "CommandCenterPage", path: "/command-center" },
  { file: "src/pages/IntelligencePage.tsx", component: "IntelligencePage", path: "/intelligence" },
];
const OFFLINE_EXEMPT = OFFLINE_PAGES.map((p) => p.file);

// Good enough for this job: these files have no regex literals or string
// contents that look like comment delimiters, and a false positive here can
// only ever loosen a check that has a second, code-level assertion behind it.
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    // The generated types file names every table; it issues no queries.
    if (entry === "types.ts" && full.includes("integrations")) continue;
    out.push(full);
  }
  return out;
}

const FILES = sourceFiles(SRC).map((f) => ({
  path: relative(process.cwd(), f).replace(/\\/g, "/"),
  text: readFileSync(f, "utf8"),
}));

describe("gated table access", () => {
  for (const page of OFFLINE_PAGES) {
    it(`${page.path} is still offline, which is what exempts ${page.component} below`, () => {
      const app = FILES.find((f) => f.path === "src/App.tsx");
      expect(app, "src/App.tsx not found").toBeDefined();

      // App.tsx documents both takedowns in prose, and that prose names the
      // component and the path — so this has to read code, not text.
      const code = stripComments(app!.text);

      // Both halves matter: an import without a route is dead code, but a route
      // without an import doesn't compile — so either one appearing means the
      // page is on its way back and must be fixed first.
      expect(
        new RegExp(page.component).test(code),
        `${page.component} is referenced in App.tsx again — it reads a gated table ` +
          "directly, which anon can no longer do. Route it through an edge function " +
          "under the service role, behind auth, before restoring it.",
      ).toBe(false);

      expect(new RegExp(`["'\`]${page.path}["'\`]`).test(code)).toBe(false);
    });
  }

  for (const [table, gateway] of Object.entries(GATED_TABLES)) {
    it(`only ${gateway} touches ${table} directly`, () => {
      const pattern = new RegExp(`\\.from\\(\\s*["'\`]${table}["'\`]`);
      const offenders = FILES.filter(
        (f) =>
          f.path !== gateway &&
          !OFFLINE_EXEMPT.includes(f.path) &&
          !f.path.startsWith("src/test/") &&
          pattern.test(f.text),
      ).map((f) => f.path);

      expect(
        offenders,
        `${table} is revoked for anon — these must go through the RPC wrapper instead`,
      ).toEqual([]);
    });
  }

  for (const table of WRITE_ONLY_TABLES) {
    it(`never reads ${table} from the browser`, () => {
      // `.from("t").select(` — the read that RLS now refuses. Insert-only usage
      // is fine and is what these files legitimately do.
      const pattern = new RegExp(`\\.from\\(\\s*["'\`]${table}["'\`]\\s*\\)\\s*\\.select\\(`);
      const offenders = FILES.filter(
        (f) =>
          !OFFLINE_EXEMPT.includes(f.path) &&
          !f.path.startsWith("src/test/") &&
          pattern.test(f.text),
      ).map((f) => f.path);

      expect(
        offenders,
        `${table} reads are revoked for anon — this query returns nothing in production`,
      ).toEqual([]);
    });
  }
});

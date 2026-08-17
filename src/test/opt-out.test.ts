import { describe, it, expect } from "vitest";
// The opt-out classifier is pure TS (no Deno APIs), so it's testable here even
// though it lives in the edge-function shared dir. It's compliance-critical —
// it decides who gets unsubscribed — so pin its behavior.
import { classifyInbound } from "../../supabase/functions/_shared/opt-out";

describe("classifyInbound", () => {
  it("treats the carrier-standard keywords as opt-out, case/space/punctuation-insensitive", () => {
    for (const body of ["STOP", "stop", " Stop ", "STOP.", "stopall", "STOP ALL", "unsubscribe", "CANCEL", "quit", "END"]) {
      expect(classifyInbound(body)).toBe("opt_out");
    }
  });

  it("catches reasonable natural opt-out phrasing", () => {
    for (const body of ["please stop", "stop texting me", "remove me", "leave me alone", "do not text me"]) {
      expect(classifyInbound(body)).toBe("opt_out");
    }
  });

  it("treats START/YES/UNSTOP as opt-in", () => {
    for (const body of ["START", "start", "yes", "UNSTOP", "resume"]) {
      expect(classifyInbound(body)).toBe("opt_in");
    }
  });

  it("does NOT unsubscribe someone answering 'no' to a question", () => {
    expect(classifyInbound("no")).toBe("other");
    expect(classifyInbound("no thanks")).toBe("other");
  });

  it("leaves ordinary replies as 'other'", () => {
    for (const body of ["Sounds good", "What's my score?", "Tuesday works", ""]) {
      expect(classifyInbound(body)).toBe("other");
    }
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CoraMascot from "@/components/cora/CoraMascot";
import CoraMascotFallback from "@/components/cora/CoraMascotFallback";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import { CORA_MASCOT_PNG, CORA_MASCOT_RIV } from "@/components/cora/cora-mascot-asset";
import { BAND_ORDER } from "@/lib/guzzler-band";

describe("Cora mascot — never a blank box", () => {
  it("renders the static fallback while no .riv is configured", () => {
    render(<CoraMascot />);
    expect(screen.getByTestId("cora-mascot")).toBeInTheDocument();
    // With CORA_MASCOT_RIV null the Rive runtime is never even imported.
    expect(CORA_MASCOT_RIV).toBeNull();
    expect(screen.getByTestId("cora-mascot-fallback")).toBeInTheDocument();
  });

  it("renders something for every state, with no band supplied", () => {
    for (const state of ["idle", "listening", "scanning", "score_reveal"] as const) {
      const { unmount } = render(<CoraMascot state={state} />);
      expect(screen.getByTestId("cora-mascot")).toBeInTheDocument();
      unmount();
    }
  });

  it("gives each of the four bands a needle angle and an arc color", () => {
    const seen = new Map<string, string>();
    for (const band of BAND_ORDER) {
      const { container, unmount } = render(<CoraMascotFallback band={band} />);
      const arc = container.querySelector("path");
      const needle = container.querySelector("g");
      expect(arc).not.toBeNull();
      expect(needle?.getAttribute("transform")).toMatch(/^rotate\(-?\d/);
      seen.set(band, arc!.getAttribute("stroke")!);
      unmount();
    }
    expect(seen.size).toBe(4);
    // Severity ramp: sipping is the only "good" color, bleeding the only alarm.
    expect(seen.get("sipping")).not.toBe(seen.get("bleeding"));
    expect(seen.get("steady")).toBe(seen.get("drinking")); // both amber, as in TIER_PRESENTATION
  });

  it("is always labelled for screen readers", () => {
    render(<CoraMascot alt="Cora" />);
    expect(screen.getByRole("img", { name: "Cora" })).toBeInTheDocument();
  });
});

describe("brand law — no human-Cora imagery", () => {
  it("ships no static avatar bitmap until Will's approved PNG lands", () => {
    expect(CORA_MASCOT_PNG).toBeNull();
  });

  it("ConciergeMessage renders the mascot, not the retired human avatar", () => {
    const { container } = render(<ConciergeMessage message="Hello" />);
    expect(screen.getByTestId("cora-mascot")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("ConciergeMessage state wiring", () => {
  it("treats a typing indicator as Cora scanning", () => {
    render(<ConciergeMessage message="Hello" isTyping />);
    // The message is suppressed while the dots animate — the mascot still shows.
    expect(screen.queryByText("Hello")).toBeNull();
    expect(screen.getByTestId("cora-mascot")).toBeInTheDocument();
  });

  it("passes the reveal band through to the mascot", () => {
    const { container } = render(
      <ConciergeMessage message="Your score" coraState="score_reveal" coraBand="bleeding" />,
    );
    const arc = container.querySelector("path");
    expect(arc?.getAttribute("stroke")).toBe("hsl(var(--destructive))");
  });
});

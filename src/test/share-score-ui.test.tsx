import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, cleanup, waitFor } from "@testing-library/react";
import ShareScore from "@/components/quiz/ShareScore";
import { buildShareMessage, buildShareText, type ShareableScore } from "@/lib/share-score";

// UI-level cover for the share card. The copy and URL rules are pinned in
// share-score.test.ts; this file pins the wiring — that each button reaches the
// destination it claims to, and that nothing identifying is rendered even if a
// caller hands the component a wider object than the type allows.

const result: ShareableScore = { score: 78, grade: "D", tier: "High" };

const originalWidth = window.innerWidth;

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

let writeText: ReturnType<typeof vi.fn>;
let openSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // jsdom's getContext throws and logs through its virtual console. The throw
  // path itself is covered in share-card.test.ts; stub it to the quieter
  // "no 2D context" shape so this file's output stays readable.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  openSpy = vi.spyOn(window, "open").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setViewportWidth(originalWidth);
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
});

describe("ShareScore", () => {
  it("shows the homeowner exactly what will be posted", () => {
    render(<ShareScore result={result} />);
    expect(screen.getByText(buildShareText(result))).toBeInTheDocument();
  });

  it("offers X, Facebook, SMS and copy link", () => {
    render(<ShareScore result={result} />);
    for (const name of [/post on x/i, /facebook/i, /text it/i, /copy link/i]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("opens the X intent with the score copy and the public link", () => {
    render(<ShareScore result={result} />);
    screen.getByRole("button", { name: /post on x/i }).click();

    expect(openSpy).toHaveBeenCalledOnce();
    const url = new URL(openSpy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe("https://x.com/intent/post");
    expect(url.searchParams.get("text")).toBe(buildShareText(result));
    // Opened in a new tab without handing the opener over.
    expect(openSpy.mock.calls[0][2]).toContain("noopener");
  });

  it("copies the message and confirms it", async () => {
    render(<ShareScore result={result} />);
    // The handler is async, so let its promise chain settle inside act() —
    // otherwise the confirmation state lands after the test and React warns.
    await act(async () => {
      screen.getByRole("button", { name: /copy link/i }).click();
    });

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(buildShareMessage(result, window.location.origin, "copy"));
    });
    await screen.findByText(/copied to your clipboard/i);
  });

  it("copies the caption before opening Facebook, which ignores passed captions", async () => {
    render(<ShareScore result={result} />);
    await act(async () => {
      screen.getByRole("button", { name: /facebook/i }).click();
    });

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(buildShareText(result)));
    await waitFor(() => expect(openSpy).toHaveBeenCalledOnce());
    expect(openSpy.mock.calls[0][0]).toContain("facebook.com/sharer");
    await screen.findByText(/paste it into your Facebook post/i);
  });

  it("offers the OS share sheet on a phone that supports it", async () => {
    setViewportWidth(390);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });

    render(<ShareScore result={result} />);
    const button = await screen.findByRole("button", { name: /^share$/i });
    await act(async () => {
      button.click();
    });

    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(share.mock.calls[0][0].text).toBe(
      buildShareMessage(result, window.location.origin, "copy"),
    );
  });

  it("falls back to the channel buttons when the OS sheet is unavailable", () => {
    setViewportWidth(390);
    render(<ShareScore result={result} />);
    expect(screen.queryByRole("button", { name: /^share$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /post on x/i })).toBeInTheDocument();
  });

  it("hides the score card download when the canvas can't render one", async () => {
    // jsdom has no 2D context, so renderScoreCard resolves null — the download
    // affordance must simply not appear rather than fail on tap.
    render(<ShareScore result={result} />);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /save score card/i })).not.toBeInTheDocument(),
    );
  });

  it("renders nothing identifying, even when handed a wider object", () => {
    const contaminated = {
      ...result,
      email: "dana.whitfield@example.com",
      streetAddress: "1428 Magnolia Ridge Dr",
    } as ShareableScore;

    const { container } = render(<ShareScore result={contaminated} />);
    expect(container.textContent).not.toContain("dana.whitfield@example.com");
    expect(container.textContent).not.toContain("1428 Magnolia Ridge Dr");
  });
});

import { expect, test, type Page } from "@playwright/test";
import {
  GOLD_SESSION,
  PARTIAL_SESSION,
  measureOverflow,
  primeBrowser,
  stubSupabase,
  type BrowserState,
} from "./helpers";

// Phase 3 — Mobile Responsiveness QA.
//
// Walks the whole homeowner funnel at 320 / 412 / 820 / 1440 (see
// playwright.responsive.config.ts) and asserts the things the ticket actually
// cares about: nothing spills past the viewport, every primary CTA stays visible
// and tappable, the camera picker is wired up on phones, and motion preferences
// are honoured.

// Minimum comfortable touch target (iOS HIG / WCAG 2.5.8 AAA).
const MIN_TAP_PX = 44;

const isMobileProject = (name: string) => name.startsWith("mobile");

interface Screen {
  path: string;
  name: string;
  /** Primary call to action. Doubles as the readiness signal for the screen. */
  cta: RegExp;
  session: Record<string, unknown>;
  state: BrowserState;
}

// The funnel, in the order a homeowner walks it. `state` matters: `/` renders
// the intent gate to a fresh visitor and redirects a scored-but-incomplete
// session to /incomplete, so each screen declares the visitor it represents.
const FUNNEL: Screen[] = [
  {
    path: "/",
    name: "entry gate",
    cta: /I'm ready to replace now/i,
    session: PARTIAL_SESSION,
    state: { session: false, gateSeen: false },
  },
  {
    path: "/",
    name: "landing",
    cta: /BEGIN HVAC HEALTH ASSESSMENT HERE/i,
    session: PARTIAL_SESSION,
    state: { session: false, gateSeen: true },
  },
  {
    path: "/quiz",
    name: "quiz",
    cta: /Let's Get Started/i,
    session: PARTIAL_SESSION,
    state: { session: false, gateSeen: true },
  },
  {
    path: "/unlock",
    name: "unlock",
    cta: /Take Photo|Take \/ Upload Photo/i,
    session: PARTIAL_SESSION,
    state: { session: true, gateSeen: true },
  },
  {
    path: "/incomplete",
    name: "incomplete",
    cta: /Book Your Free Audit/i,
    session: PARTIAL_SESSION,
    state: { session: true, gateSeen: true },
  },
  {
    path: "/trophy",
    name: "trophy",
    cta: /Send My Report/i,
    session: GOLD_SESSION,
    state: { session: true, gateSeen: true },
  },
];

async function openScreen(page: Page, screen: Screen) {
  await primeBrowser(page, screen.state);
  await stubSupabase(page, screen.session);
  await page.goto(screen.path);
}

function ctaLocator(page: Page, name: RegExp) {
  return page
    .getByRole("button", { name })
    .or(page.getByRole("link", { name }))
    .first();
}

test.describe("funnel layout", () => {
  // Reduced motion makes framer-motion settle instantly (see MotionConfig in
  // App.tsx), so geometry assertions measure the resting layout rather than a
  // mid-flight transform.
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  for (const screen of FUNNEL) {
    test(`${screen.name} keeps every element inside the viewport`, async ({ page }) => {
      await openScreen(page, screen);
      await expect(ctaLocator(page, screen.cta)).toBeVisible();

      // html/body carry `overflow-x: clip`, which suppresses the scrollbar but
      // not the underlying overflow — so assert on the offending elements
      // themselves rather than on scrollWidth, which clip would always satisfy.
      const report = await measureOverflow(page);
      expect(
        report.offenders,
        `elements spilling past the ${report.clientWidth}px viewport`,
      ).toEqual([]);
    });

    test(`${screen.name} keeps its primary CTA visible and tappable`, async ({ page }, testInfo) => {
      await openScreen(page, screen);

      const cta = ctaLocator(page, screen.cta);
      await expect(cta).toBeVisible();

      const box = (await cta.boundingBox())!;
      expect(box).not.toBeNull();
      if (isMobileProject(testInfo.project.name)) {
        expect(box.height).toBeGreaterThanOrEqual(MIN_TAP_PX);
      }
      // A CTA running past the right edge is unreachable however tall it is.
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    });
  }

  test("the quiz stays within the viewport through the first questions", async ({ page }) => {
    await openScreen(page, FUNNEL.find((s) => s.name === "quiz")!);
    await page.getByRole("button", { name: /Let's Get Started/i }).click();

    for (let round = 1; round <= 3; round++) {
      // The question heading only exists in the "question" phase, so waiting on
      // it pins the click to a real option rather than to the intro CTA that
      // AnimatePresence may still be unmounting.
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      // The option buttons are the first controls inside <main>; Cora's floating
      // launcher renders after them.
      await page.locator("main button").first().click();

      // Cora deliberately pauses ~1.75s before her response and the Next button
      // fade in (CORA_RESPONSE_DELAY_MS), so this wait is generous on purpose.
      const next = page.getByRole("button", { name: /Next →|Continue →/ });
      await expect(next).toBeVisible({ timeout: 10_000 });

      const report = await measureOverflow(page);
      expect(report.offenders, `question ${round} overflows`).toEqual([]);

      await next.click();
      await expect(next).toHaveCount(0);
    }
  });

  test("Cora's floating bubble never covers the quiz CTA", async ({ page }, testInfo) => {
    test.skip(!isMobileProject(testInfo.project.name), "bubble overlap only bites on phones");

    await openScreen(page, FUNNEL.find((s) => s.name === "quiz")!);

    const cta = page.getByRole("button", { name: /Let's Get Started/i });
    await expect(cta).toBeVisible();
    await page.mouse.wheel(0, 2000); // settle at the bottom of the intro

    const ctaBox = (await cta.boundingBox())!;
    const bubbleBox = (await page
      .getByRole("button", { name: /Hide Cora|Show Cora/ })
      .boundingBox())!;

    const overlaps =
      ctaBox.x < bubbleBox.x + bubbleBox.width &&
      ctaBox.x + ctaBox.width > bubbleBox.x &&
      ctaBox.y < bubbleBox.y + bubbleBox.height &&
      ctaBox.y + ctaBox.height > bubbleBox.y;
    expect(overlaps, "Cora's launcher is sitting on top of the primary CTA").toBe(false);
  });
});

test.describe("upload slots", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  const unlock = () => FUNNEL.find((s) => s.name === "unlock")!;

  test("offer a direct camera picker on phones and a library picker everywhere", async ({
    page,
  }, testInfo) => {
    await openScreen(page, unlock());
    await expect(page.getByRole("heading", { name: /Reveal Your TRUE Guzzler Score/i })).toBeVisible();

    const cameraInputs = page.locator('input[type="file"][capture="environment"]');
    const libraryInputs = page.locator('input[type="file"]:not([capture])');

    // The library picker exists on every device — it's what keeps the gallery
    // (and the bill's PDF option) reachable.
    expect(await libraryInputs.count()).toBeGreaterThan(0);

    if (isMobileProject(testInfo.project.name)) {
      await expect(page.getByRole("button", { name: /Take Photo/ }).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Choose Photo/ }).first()).toBeVisible();
      expect(await cameraInputs.count()).toBeGreaterThan(0);
    } else {
      await expect(page.getByRole("button", { name: /Take \/ Upload Photo/ }).first()).toBeVisible();
    }
  });

  test("the bill slot keeps its PDF option", async ({ page }) => {
    await openScreen(page, unlock());
    await expect(page.getByRole("heading", { name: /Reveal Your TRUE Guzzler Score/i })).toBeVisible();

    // A capture-only picker would hide application/pdf, so the trophy slot must
    // still expose a non-capture picker that accepts it.
    await expect(page.locator('input[type="file"][accept*=".pdf"]:not([capture])')).toHaveCount(1);
  });
});

test.describe("motion preferences", () => {
  test("the score dial renders at rest when reduce-motion is on", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openScreen(page, FUNNEL.find((s) => s.name === "incomplete")!);

    // With MotionConfig reducedMotion="user" the gauge lands on its final value
    // immediately instead of sweeping — the number is readable on first paint.
    await expect(
      page.getByText(String(PARTIAL_SESSION.guzzler_score), { exact: true }),
    ).toBeVisible({ timeout: 5_000 });

    const report = await measureOverflow(page);
    expect(report.offenders).toEqual([]);
  });
});

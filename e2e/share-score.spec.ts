import { expect, test, type BrowserContext } from "@playwright/test";
import { PARTIAL_SESSION, GOLD_SESSION, primeBrowser, stubSupabase } from "./helpers";

// Phase 3 — Social Share.
//
// Runs in the same viewport matrix as the responsiveness suite (see
// playwright.responsive.config.ts), so the share card is checked for layout at
// 320–1440 as well as for behaviour. The rules about what the copy says live in
// src/test/share-score.test.ts; this file proves the buttons in a real browser
// reach the destination they claim, and that nothing identifying goes with them.

test.use({ contextOptions: { reducedMotion: "reduce" } });

const isChromium = (project: string) => !project.includes("safari");

// Neither share dialog should ever actually load during a test run.
async function stubShareDestinations(context: BrowserContext) {
  for (const pattern of ["**://x.com/**", "**://*.facebook.com/**"]) {
    await context.route(pattern, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>stub</body></html>" }),
    );
  }
}

async function openIncomplete(page: import("@playwright/test").Page) {
  await primeBrowser(page, { session: true, gateSeen: true });
  await stubSupabase(page, PARTIAL_SESSION);
  await page.goto("/incomplete");
  await expect(page.getByRole("heading", { name: /Share Your Score/i })).toBeVisible();
}

test.describe("share card", () => {
  test("appears after the score reveal with all four channels", async ({ page }) => {
    await openIncomplete(page);

    for (const name of [/post on x/i, /facebook/i, /text it/i, /copy link/i]) {
      await expect(page.getByRole("button", { name })).toBeVisible();
    }

    // The homeowner sees the exact wording before they send it.
    await expect(page.getByText(/on the Guzzler Score \(Grade/i)).toBeVisible();
  });

  test("also appears on the GOLD trophy screen", async ({ page }) => {
    await primeBrowser(page, { session: true, gateSeen: true });
    await stubSupabase(page, GOLD_SESSION);
    await page.goto("/trophy");

    await expect(page.getByRole("heading", { name: /Share Your Score/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /post on x/i })).toBeVisible();
  });

  test("opens an X post carrying the score and the public link", async ({ page, context }) => {
    await stubShareDestinations(context);
    await openIncomplete(page);

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /post on x/i }).click(),
    ]);

    const url = new URL(popup.url());
    expect(url.hostname).toBe("x.com");
    expect(url.pathname).toBe("/intent/post");
    expect(url.searchParams.get("text")).toMatch(/on the Guzzler Score \(Grade/);

    const shared = new URL(url.searchParams.get("url")!);
    expect(shared.pathname).toBe("/quiz");
    expect(shared.searchParams.get("via")).toBe("x");
  });

  test("opens the Facebook sharer with the link only", async ({ page, context }) => {
    await stubShareDestinations(context);
    await openIncomplete(page);

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /facebook/i }).click(),
    ]);

    const url = new URL(popup.url());
    expect(url.hostname).toBe("www.facebook.com");
    expect([...url.searchParams.keys()]).toEqual(["u"]);
  });

  test("copies the message to the clipboard", async ({ page, context }, testInfo) => {
    test.skip(!isChromium(testInfo.project.name), "clipboard permissions are Chromium-only here");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openIncomplete(page);

    await page.getByRole("button", { name: /copy link/i }).click();
    await expect(page.getByText(/copied to your clipboard/i)).toBeVisible();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/on the Guzzler Score \(Grade/);
    expect(clipboard).toContain("/quiz?ref=share&via=copy");
  });

  // jsdom has no canvas, so this is the only place the card is proven to render
  // at all. The button only exists once the probe in ShareScore has produced a
  // blob, so its presence is already half the assertion.
  test("renders a downloadable score card", async ({ page }) => {
    await openIncomplete(page);

    const save = page.getByRole("button", { name: /save score card/i });
    await expect(save).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent("download"), save.click()]);
    expect(download.suggestedFilename()).toBe("guzzler-score.png");

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const png = Buffer.concat(chunks);

    // PNG magic number, then the IHDR width/height at bytes 16–23.
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);

    await expect(page.getByText(/saved to your downloads/i)).toBeVisible();
  });

  // The end-to-end version of the guarantee that share-score.ts is built around.
  test("never puts session or contact data into a share destination", async ({ page, context }) => {
    await stubShareDestinations(context);
    await openIncomplete(page);

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /post on x/i }).click(),
    ]);

    const decoded = decodeURIComponent(popup.url());
    // The stubbed session deliberately carries a long email and a uuid.
    expect(decoded).not.toContain(String(PARTIAL_SESSION.email));
    expect(decoded).not.toContain(String(PARTIAL_SESSION.id));
    expect(decoded).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);

    // Nothing identifying is rendered on the page's share card either.
    const cardText = await page.getByText(/on the Guzzler Score \(Grade/i).innerText();
    expect(cardText).not.toContain(String(PARTIAL_SESSION.email));
  });
});

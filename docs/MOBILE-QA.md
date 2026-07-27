# Mobile Responsiveness QA — Phase 3

Ticket: *QA the full funnel across mobile/tablet/desktop, especially camera
uploads, CTAs, animations, and no horizontal scroll.*

This document is the standing QA record: the viewport matrix, what each pass
checks, what the first pass found and fixed, and how to re-run it. Treat it as
the checklist for any future change to a funnel screen.

---

## 1. Viewport matrix

Defined in [`playwright.responsive.config.ts`](../playwright.responsive.config.ts).

| Project         | Viewport   | Engine   | Why it's in the matrix                                                    |
| --------------- | ---------- | -------- | ------------------------------------------------------------------------- |
| `mobile-small`  | 320 × 568  | Chromium | Narrowest viewport still in real use. The canary for horizontal overflow. |
| `mobile`        | 412 × 915  | Chromium | Pixel 7 — the modern Android median.                                      |
| `tablet`        | 820 × 1180 | Chromium | Between `md` and `lg`; catches layouts that only work at the extremes.    |
| `desktop`       | 1440 × 900 | Chromium | Baseline desktop.                                                         |
| `mobile-safari` | iPhone 13  | WebKit   | Opt-in (`PW_WEBKIT=1`). Safe-area insets and `100vh` differ from Chrome.  |
| `tablet-safari` | iPad Mini  | WebKit   | Opt-in (`PW_WEBKIT=1`).                                                   |

Chromium covers the default run so the only prerequisite is
`npx playwright install chromium`.

## 2. Running the pass

```bash
npm run test:responsive                       # whole matrix
npm run test:responsive -- --project=mobile-small
PW_WEBKIT=1 npm run test:responsive           # adds real iOS/iPadOS Safari
npm test                                      # unit-level camera/upload contract
```

The suite boots its own Vite dev server and stubs every Supabase call
([`e2e/helpers.ts`](../e2e/helpers.ts)) — it is hermetic and never writes rows to
D.A.V.E.

## 3. What each pass asserts

Covered in [`e2e/funnel-responsive.spec.ts`](../e2e/funnel-responsive.spec.ts) —
17 tests per viewport, 68 in the default matrix — across the entry gate,
landing, `/quiz`, `/unlock`, `/incomplete` and `/trophy`. The landing route is
tested in both of its real states: a fresh visitor (three-door intent gate) and
a returning one who has already dismissed it.

- **No horizontal scroll.** Every rendered element is measured against the
  viewport; any element whose box spills past the right edge fails the test *by
  name*. Asserting on the offending elements rather than on `scrollWidth` is
  deliberate — `overflow-x: clip` (see below) hides the scrollbar, so
  `scrollWidth` alone would always pass.
- **CTA reachability.** Each screen's primary call to action must be visible,
  fully inside the viewport, and at least **44 px** tall on phones
  (iOS HIG / WCAG 2.5.8 AAA).
- **Cora's bubble never covers a CTA.** The floating assistant is `position:
  fixed`; the test asserts its launcher and the quiz CTA don't intersect.
- **Camera uploads.** On phones both a rear-camera picker and a gallery picker
  are present; on desktop only the library picker is offered. The electric-bill
  slot keeps a non-`capture` picker that accepts PDF.
- **Motion preferences.** With reduce-motion on, the score gauge renders at its
  final value on first paint instead of sweeping.

Specs typecheck under [`e2e/tsconfig.json`](../e2e/tsconfig.json)
(`npx tsc --noEmit -p e2e/tsconfig.json`) — separate from the app config, which
declares vitest globals the Playwright specs must not inherit.

Unit-level coverage of the camera contract lives in
[`src/test/upload-slot-responsive.test.tsx`](../src/test/upload-slot-responsive.test.tsx)
and runs in the normal `npm test` suite — no browser download required.

Geometry is measured with reduce-motion emulated (`contextOptions.reducedMotion`
— it is *not* a top-level Playwright test option), so assertions see the resting
layout rather than a mid-flight framer-motion transform.

**The suite was verified against the pre-fix code**: stashing this ticket's
source changes and re-running turns 4 of the 17 `mobile-small` tests red — the
entry gate and landing overflow checks, the `/unlock` tap-target check (36 px vs
the 44 px minimum), and the camera-picker check. The assertions catch real
regressions, not just today's markup.

## 4. Findings from the first pass, and the fixes

### Camera uploads

`UploadSlot` previously exposed a single `accept="image/*"` picker with no
`capture` attribute, so tapping "Take Photo" opened the OS file chooser rather
than the camera. The naive fix — adding `capture="environment"` to that one
input — would have removed the gallery route entirely and hidden the PDF option
on the electric-bill slot.

**Fix:** two pickers behind one `onFile` callback.

- **camera** — `accept="image/*"` + `capture="environment"`, opens the rear
  camera directly.
- **library** — `accept={slot.accept}`, keeps the gallery/Files route and the
  bill's PDF option.

Phones get both buttons ("Take Photo" / "Choose Photo", "Photograph Bill" /
"Upload File"); desktop gets the library picker only, since `capture` there is
either ignored or opens a webcam.

### Horizontal scroll

At 320 px the landing page and the entry gate both reported overflow before this
pass (the offender surfaced as the toast viewport `<ol>`, which sizes to an
over-wide layout viewport). Fixes:

- `html` and `body` now carry `overflow-x: clip`. `clip` and not `hidden`: the
  latter turns the root into a scroll container and breaks the sticky Navbar.
- `<main>` carries `w-full max-w-full overflow-x-clip` as a second line of
  defence.
- `GuzzlerScoreGauge` held a hard-coded `220 × 220` SVG. At 320 px it was within
  ~2 px of the content box. Now fluid (`w-full max-w-[220px] aspect-square`).
- `size="xl"` buttons carry `px-10`; "Analyzing Your Home…" and "View My
  Estimate" on `/audit` overflowed 320 px. Now `w-full sm:w-auto`.
- Cora's bubble was `max-w-[280px]` at `right-4`; now capped at
  `min(280px, 100vw - 2rem)`.
- Long homeowner strings (the report email on `/trophy`) now wrap
  (`break-all` there, `overflow-wrap: break-word` globally on headings and body
  copy).

### CTAs and touch targets

- New `.tap-target` utility (44 × 44 minimum) applied to the Navbar menu toggle
  (was 36 px), the upload pickers (also 36 px — `size="sm"` is `h-9`), the quiz
  option buttons, and the "I'll finish this later" link on `/unlock`.
- `size="xl"` CTAs on `/audit` and `/missions` are now `w-full sm:w-auto`.
- `/quiz` reserves `pb-28` so Cora's fixed launcher can never sit on the
  Next/Continue button.
- The quiz progress bar is `sticky` under the Navbar on phones (`top-[90px]`,
  the Navbar's mobile height) and static from `md` up.

### Animations

- `<MotionConfig reducedMotion="user">` in `App.tsx` — every framer-motion
  animation in the funnel collapses to an instant state change when the visitor
  has reduce-motion enabled.
- A matching `@media (prefers-reduced-motion: reduce)` block in `index.css`
  covers the CSS-driven ones (`animate-pulse` on the timer and the booking CTA,
  `animate-spin` loaders, the `urgency-pulse` keyframes) that JS can't reach.

### Safe areas

`Layout.tsx` already padded for `env(safe-area-inset-top)`, but `index.html`
lacked `viewport-fit=cover`, so the inset always resolved to `0` and the padding
silently did nothing on notched devices. Added, plus a `.pb-safe` utility on the
footer and a bottom inset on Cora's bubble for the home indicator.

## 5. Known gaps / follow-ups

- **`/missions`** is a legacy screen outside the primary funnel (its upload
  handler ignores the selected file) and was left alone apart from CTA width.
  Fold it into `UploadSlot` or delete it before it reaches homeowners.
- **No client-side file-size or type guard** on uploads
  (`useAuditUpload.handleFile`). A modern phone photo is 3–12 MB and a failed
  upload currently only logs to the console. Worth a ticket — it's an upload
  reliability concern rather than a layout one, so it was left out of this pass.
- **WebKit projects are opt-in.** Run `PW_WEBKIT=1 npm run test:responsive`
  before any release that touches layout; Safari is where safe-area and
  viewport-unit differences show up.
- **Visual regression** (screenshot diffing) is not part of this suite. The
  assertions are geometric, which is what the ticket asked for; add
  `toHaveScreenshot()` baselines if pixel drift becomes a concern.

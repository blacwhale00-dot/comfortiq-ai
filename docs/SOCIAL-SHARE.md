# Social Share — Phase 3

Ticket: *Add "Share Your Score" after score reveal with safe share cards/copy for
X, Facebook, SMS, and copy link.*

---

## 1. Where it appears

`ShareScore` renders on every screen that shows a homeowner their score:

| Screen                                                                   | Placement                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Post-quiz reveal ([`GuzzlerResults.tsx`](../src/components/quiz/GuzzlerResults.tsx)) | Below the "Unlock More Value" CTA                     |
| GOLD trophy ([`TrophyPage.tsx`](../src/pages/TrophyPage.tsx))             | Below the report + booking actions                              |
| Closed window ([`IncompletePage.tsx`](../src/pages/IncompletePage.tsx))   | Below "Book Your Free Audit"                                    |

Share always sits **below** the screen's primary CTA. The funnel's job is still
to move the homeowner into the photo upload or the booking; bragging must not
outrank it.

`TrophyPage` now also selects `guzzler_score` (it previously fetched only the
email and upload columns) and derives grade/tier through the same
`gradeForScore` / `tierForScore` helpers the score screens use, so the shared
grade can never disagree with the one on screen.

## 2. What "safe" means here

The scope of work is explicit that homeowner data is never shared publicly
(`docs/scope-of-work.md`, Privacy). Four things enforce that:

1. **A narrow input type.** [`share-score.ts`](../src/lib/share-score.ts) accepts
   `ShareableScore` — `{ score, grade, tier }` — and deliberately *not*
   `GuzzlerRevealData`, which also carries `yearBuilt`, `lastPermitDate` and
   permit-silence years. A caller physically cannot hand the share layer a
   property fingerprint.
2. **No per-homeowner URL.** The share link is the public funnel entry with
   channel attribution only (`/quiz?ref=share&via=<channel>`). There is no share
   token and no session id, so a shared link can never be replayed to read
   someone's results — and no new public-read policy was needed on the database.
3. **The waste estimate is left out.** It's an inference about their energy
   bills; the score is the braggable number on its own.
4. **The homeowner sees the exact wording first.** The card renders the outgoing
   text above the buttons — no surprises about what gets posted.

Both a unit test and a browser test assert this: a deliberately contaminated
object (email, street address, phone, ZIP, session uuid) is passed in, and every
destination URL and the rendered card are checked to contain none of it.

## 3. Per-channel behaviour

| Channel     | Endpoint                                | Carries                                    |
| ----------- | --------------------------------------- | ------------------------------------------- |
| X           | `x.com/intent/post`                     | `text` + `url` as separate params           |
| Facebook    | `facebook.com/sharer/sharer.php`        | `u` only — see below                        |
| SMS         | `sms:?&body=`                           | Brag line + link in one message             |
| Copy link   | Clipboard                               | Brag line + link                            |
| OS sheet    | `navigator.share`                       | Text, plus the PNG card when supported      |

Three constraints worth knowing, because they look like bugs otherwise:

- **Facebook ignores captions.** The `quote` parameter has been dead since 2017;
  the dialog builds its preview purely from the destination's Open Graph tags.
  So the button copies the brag line to the clipboard and tells the homeowner to
  paste it. That is the honest workaround, not an oversight.
- **`sms:?&body=` is the one spelling both platforms accept** — iOS wants
  `&body`, Android wants `?body`. It is also navigated to rather than opened in
  a popup, because popup handlers block `sms:` on some browsers.
- **X counts every link as 23 characters** regardless of length (t.co wrapping),
  so `fitForX` budgets 256 characters for the text and cuts on a word boundary.
  Current copy fits comfortably at every tier; the guard is for future edits.

## 4. The score card image

[`share-card.ts`](../src/lib/share-card.ts) draws a 1200 × 630 PNG on a canvas —
no server, no image service, no external request, following the same
"engine supplies the values, this module only lays them out" split as the GOLD
report PDF. It powers both "Save score card" and the image attached to the OS
share sheet where the platform accepts files.

1200 × 630 is the Open Graph / `summary_large_image` ratio, so the same output
also works as an `og:image` if you ever want to host a static one.

It degrades silently: if there's no 2D context (or `getContext` throws, which is
what jsdom does), `renderScoreCard` resolves `null`, the download button never
appears, and the text share is unaffected. The card is a bonus, never the thing
that makes sharing work.

## 5. Tests

```bash
npm test                                    # 28 share tests (copy, URLs, PII, UI wiring)
npm run test:responsive -- share-score      # 7 browser tests × 4 viewports
```

- [`share-score.test.ts`](../src/test/share-score.test.ts) — copy per tier, score
  clamping, every destination URL, the X length budget, and the PII guarantee.
- [`share-score-ui.test.tsx`](../src/test/share-score-ui.test.tsx) — button
  wiring, clipboard, the Facebook caption workaround, the OS sheet on mobile,
  and graceful absence of the card download.
- [`share-card.test.ts`](../src/test/share-card.test.ts) — the failure contract.
- [`share-score.spec.ts`](../e2e/share-score.spec.ts) — real browser: intent URLs
  from actual popups, real clipboard round-trip, and the PNG download decoded
  and checked for its magic number and 1200 × 630 IHDR dimensions. jsdom has no
  canvas, so this is the only place the card is proven to render at all.

The share card is also covered by the existing responsiveness matrix — the
`/trophy` and `/incomplete` overflow and CTA tests now include it.

## 6. Still needed — see the handoff notes

The share **links** work today. The **unfurl preview** that Facebook, X, iMessage
and WhatsApp show for those links depends on assets and a domain that only you
can supply; `index.html` is wired for them and currently points at
`https://guzzlerscore.ai/og-card.png`, which does not exist yet.

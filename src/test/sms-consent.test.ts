import { describe, expect, it } from "vitest";
import {
  SMS_CONSENT_BODY,
  SMS_CONSENT_LABEL,
  SMS_CONSENT_VERSION,
  smsConsentDisclosureText,
} from "@/lib/sms-consent";

// The TCPA disclosure is a legal artifact, so it's pinned rather than merely
// exercised. The same wording exists in TWO places by design:
//
//   • here, rendered to the homeowner at the quiz gate
//   • public.sms_consent_disclosure() in the database, which is what actually
//     gets written into consent_records
//
// The server owns the stored copy so a client can't fabricate a record for a
// disclosure we never published — but that means the two must stay identical.
// This test fails the moment the copy changes, as the reminder to bump
// SMS_CONSENT_VERSION and add the new text to a migration IN THE SAME COMMIT.
// Old records keep their own version and text; that's the point.
const PINNED = {
  version: "2026-08-03.v1",
  text:
    "Yes, text me my results and reminders. By checking this box, you agree to " +
    "receive automated marketing text messages from ComfortIQ at the mobile " +
    "number provided — about 5 messages over 48 hours. Consent is not a " +
    "condition of purchase. Message frequency varies and message and data " +
    "rates may apply. Reply STOP to cancel or HELP for help. See our Privacy " +
    "Policy at /privacy.",
};

describe("SMS consent disclosure", () => {
  it("matches the text stored by public.sms_consent_disclosure()", () => {
    expect(smsConsentDisclosureText()).toBe(PINNED.text);
  });

  it("still carries the version those records were written under", () => {
    expect(SMS_CONSENT_VERSION).toBe(PINNED.version);
  });

  it("contains every element TCPA and A2P 10DLC review require", () => {
    const text = smsConsentDisclosureText();
    // Named sender — a generic "we" isn't sufficient identification.
    expect(text).toContain("ComfortIQ");
    // Automated + marketing, stated plainly.
    expect(text).toMatch(/automated/i);
    expect(text).toMatch(/marketing/i);
    // Message frequency.
    expect(text).toMatch(/5 messages|frequency/i);
    // Consent cannot be a condition of purchase.
    expect(text).toMatch(/not a\s+condition of purchase/i);
    // Rates disclosure.
    expect(text).toMatch(/rates may apply/i);
    // Opt-out and help instructions.
    expect(text).toContain("STOP");
    expect(text).toContain("HELP");
    // Privacy policy reference.
    expect(text).toMatch(/privacy/i);
  });

  it("builds the full disclosure from its label and body", () => {
    const text = smsConsentDisclosureText();
    expect(text.startsWith(SMS_CONSENT_LABEL)).toBe(true);
    expect(text).toContain(SMS_CONSENT_BODY);
  });
});

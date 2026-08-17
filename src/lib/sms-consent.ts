// The SMS consent disclosure — single source of truth.
//
// TCPA requires *prior express written consent* before a marketing text, and if
// it's ever challenged the thing that matters is being able to show the exact
// words the homeowner agreed to, on the date they agreed to them. So the copy
// lives here and nowhere else: ResultsGate renders it, and QuizPage stores this
// same string verbatim into consent_records. They cannot drift, because they
// are literally the same constant.
//
// If you change the wording, BUMP THE VERSION. Old records keep their old text
// and version, which is the whole point — a consent record has to describe what
// that person saw, not what the current build says.
//
// Required elements (TCPA + Twilio's A2P 10DLC campaign review, which asks for
// a screenshot of this exact flow):
//   • identifies the sender by name
//   • says the messages are automated marketing
//   • states message frequency
//   • "consent is not a condition of purchase"
//   • msg & data rates disclosure
//   • STOP / HELP instructions
//   • link to the privacy policy

export const SMS_CONSENT_VERSION = "2026-08-03.v1";

// The bold line next to the checkbox.
export const SMS_CONSENT_LABEL = "Yes, text me my results and reminders.";

// The fine print underneath it.
export const SMS_CONSENT_BODY =
  "By checking this box, you agree to receive automated marketing text messages " +
  "from ComfortIQ at the mobile number provided — about 5 messages over 48 hours. " +
  "Consent is not a condition of purchase. Message frequency varies and message " +
  "and data rates may apply. Reply STOP to cancel or HELP for help.";

// Where the privacy policy lives (route exists in App.tsx).
export const PRIVACY_PATH = "/privacy";

/**
 * The complete disclosure exactly as presented, including the privacy-policy
 * reference that renders as a link. THIS is what gets persisted — reconstructing
 * it later from fragments would defeat the purpose.
 */
export function smsConsentDisclosureText(): string {
  return `${SMS_CONSENT_LABEL} ${SMS_CONSENT_BODY} See our Privacy Policy at ${PRIVACY_PATH}.`;
}

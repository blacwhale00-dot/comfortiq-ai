// ============================================================
// Comfort AI — SMS Follow-Up Sequences
// Built by Tandem AI for ComfortIQ.AI
// 7-Touch Recovery Sequence
// ============================================================

export type TouchType =
  | "welcome"
  | "report_ready"
  | "2hr_followup"
  | "24hr_checkin"
  | "48hr_recovery"
  | "72hr_final"
  | "objection_financial"
  | "objection_timing"
  | "objection_contractor_trust"
  | "appointment_booked"
  | "post_appointment_thanks"
  | "shield_offer"
  | "referral_request";

export interface SMSTouch {
  type: TouchType;
  delay_hours: number;
  subject: string; // For log readability
  getMessage: (context: SMSContext) => string;
}

export interface SMSContext {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  systemAge?: string;
  readinessTier?: "hot" | "warm" | "cool" | "cold";
  readinessScore?: number;
  powerTaxMonthly?: number;
  powerTaxAnnual?: number;
  discountUnlocked?: number;
  reportLink?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentBooked?: boolean;
  quizCompleted?: boolean;
  reportViewed?: boolean;
  quoteAmount?: number;
  monthlyPayment?: number;
  contractorName?: string;
}

// ──────────────────────────────────────────────────────────────
// WELCOME SEQUENCE (Quiz completed, report ready)
// ──────────────────────────────────────────────────────────────

const welcome: SMSTouch = {
  type: "welcome",
  delay_hours: 0,
  subject: "Welcome — Report ready",
  getMessage: (c) =>
    `Hey ${c.firstName} — Comfort here from ComfortIQ.AI. Your home assessment report is ready. We found your Power Tax: $${c.powerTaxMonthly ?? "?"}/month. Tap the link to see your full report and what to do next → ${c.reportLink ?? "comfortiq.ai/report"}`,
};

const reportReady: SMSTouch = {
  type: "report_ready",
  delay_hours: 0,
  subject: "Report ready — Full breakdown",
  getMessage: (c) =>
    `${c.firstName} — your personalized HVAC readiness report is complete. Here's what we found: your system is likely losing $${c.powerTaxAnnual ?? "??"}/year in wasted energy. The full breakdown with pricing tiers is ready → ${c.reportLink ?? "comfortiq.ai/report"} No pressure — just want you to have the information.`,
};

// ──────────────────────────────────────────────────────────────
// FOLLOW-UP SEQUENCE (7-touch recovery)
// ──────────────────────────────────────────────────────────────

const touch2hr: SMSTouch = {
  type: "2hr_followup",
  delay_hours: 2,
  subject: "2hr — Did you see the report?",
  getMessage: (c) =>
    `Hey ${c.firstName} — just checking in. Did you get a chance to look at the report? I know it's a lot of information. The short version: your system is probably costing you $${c.powerTaxMonthly ?? "??"}/month more than it should. Want me to walk you through it? I'm here.`,
};

const touch24hr: SMSTouch = {
  type: "24hr_checkin",
  delay_hours: 24,
  subject: "24hr — Question for you",
  getMessage: (c) =>
    `${c.firstName} — real question for you. That $${c.powerTaxAnnual ?? "??"}/year number — if even half of that came back as savings, that's $${Math.round(((c.powerTaxAnnual ?? 0) / 2) / 12)}/month in your pocket. Forever. Is that worth a 20-minute conversation with William? I'm here if you want to talk through it.`,
};

const touch48hr: SMSTouch = {
  type: "48hr_recovery",
  delay_hours: 48,
  subject: "48hr — The math doesn't lie",
  getMessage: (c) => {
    const tierMessages = {
      hot: `Hey ${c.firstName} — I'll keep this short. Your assessment says your system needs attention in the next few months. That doesn't mean run out today — but it does mean you should get your options ready before it's urgent. When you're ready, William can come out and give you a straight answer on whether to repair or replace. No cost, no obligation.`,
      warm: `Hey ${c.firstName} — here's what I tell everyone in your situation: the homeowners who act in the next 30-60 days almost always come out ahead of the ones who wait. You're not in crisis yet — you've got time to make a smart decision. Want to book a free consultation with William? Takes 2 minutes to set up.`,
      cool: `Hey ${c.firstName} — I wanted to check back in. Your home is in decent shape — nothing urgent. But if you're even a little curious about what a new system would look like for your home, I'd love to show you the numbers. No pressure. Just information.`,
      cold: `Hey ${c.firstName} — hope all is well! Just following up — if you ever want to do an annual inspection just to keep things running smoothly, William's available. No rush at all. Just here if you need anything.`,
    };
    return tierMessages[c.readinessTier ?? "cool"];
  },
};

const touch72hr: SMSTouch = {
  type: "72hr_final",
  delay_hours: 72,
  subject: "72hr — Final check-in",
  getMessage: (c) =>
    `${c.firstName} — I'll stop reaching out after this, I promise. But I did want to leave you with this: doing nothing is also a decision. Your ${c.systemAge === ">15" ? "old system isn't getting any younger" : "system will start showing its age sooner than you think"}. When you're ready to get a straight answer on what to do, William is here. No pressure, no obligation. Just a real conversation. Take care. — Comfort`,
};

// ──────────────────────────────────────────────────────────────
// OBJECTION HANDLERS
// ──────────────────────────────────────────────────────────────

const objectionFinancial: SMSTouch = {
  type: "objection_financial",
  delay_hours: 0,
  subject: "Objection — Can't afford it",
  getMessage: (c) =>
    `${c.firstName} — I hear you. Here's the thing most people don't know: there are HVAC systems that come with $0 down financing, and the monthly payment is often less than what you're currently losing in excess electric bills. That means the new system can sometimes pay for itself from month one. Want me to show you what that looks like for your specific situation?`,
};

const objectionTiming: SMSTouch = {
  type: "objection_timing",
  delay_hours: 0,
  subject: "Objection — Not the right time",
  getMessage: (c) =>
    `${c.firstName} — that's a completely fair thought. Here's what I'd say though: the best time to make this decision is before you have an emergency breakdown. Emergency calls cost 2-3x more, you're at the mercy of availability, and you have to decide fast. Planning it out when you have time is always the smarter move. Want to at least get the information so you're ready when the time comes?`,
};

const objectionTrust: SMSTouch = {
  type: "objection_contractor_trust",
  delay_hours: 0,
  subject: "Objection — Don't trust contractors",
  getMessage: (c) =>
    `${c.firstName} — I completely get it. The HVAC industry has a trust problem and you've probably heard horror stories. Here's what I'll tell you about William: he's not a typical contractor. He's been doing this for 15 years in Atlanta, he's personally warranty-backed, and his whole model is built on transparency — no upsells, no games. That's why I work for him. Want to see what others have said about him?`,
};

// ──────────────────────────────────────────────────────────────
// APPOINTMENT MESSAGES
// ──────────────────────────────────────────────────────────────

const appointmentBooked: SMSTouch = {
  type: "appointment_booked",
  delay_hours: 0,
  subject: "Appointment confirmed",
  getMessage: (c) =>
    `${c.firstName} — you're confirmed! William will be at your home ${c.appointmentDate ? `on ${c.appointmentDate}` : "soon"}${(c as any).appointmentTime ? ` at ${(c as any).appointmentTime}` : ""}. He'll do a full assessment and give you a straight, honest answer on what you need — repair or replace, what it should cost, and how to think about financing. See you then! — Comfort`,
};

const postAppointment: SMSTouch = {
  type: "post_appointment_thanks",
  delay_hours: 2,
  subject: "Thanks for meeting with William",
  getMessage: (c) =>
    `${c.firstName} — thank you for your time today. I know William gave you a lot to think about. If you have any questions as you're making your decision, I'm here. Don't hesitate to reach out — I don't sleep and I don't pressure. Just here to help. — Comfort`,
};

// ──────────────────────────────────────────────────────────────
// SHIELD SUBSCRIPTION OFFER
// ──────────────────────────────────────────────────────────────

const shieldOffer: SMSTouch = {
  type: "shield_offer",
  delay_hours: 0,
  subject: "Shield offer — $49/month",
  getMessage: (c) =>
    `${c.firstName} — one more thing. Since you took the assessment, I wanted to tell you about Shield — our home coverage program. For $49/month, we cover your HVAC, water heater, electrical, plumbing, and appliances. No co-pays on covered repairs. William's vetted contractor network handles everything. Most homeowners tell me it's worth it just for the peace of mind. Want to learn more?`,
};

const referralRequest: SMSTouch = {
  type: "referral_request",
  delay_hours: 0,
  subject: "Referral — Help a neighbor",
  getMessage: (c) =>
    `${c.firstName} — I hope the report was helpful. If you know anyone else in the neighborhood who's been putting off an HVAC decision, I'd love for them to have the same information. If it makes sense, feel free to share the quiz link — it's free and takes 60 seconds. And if you ever have questions about your home, I'm always here. — Comfort`,
};

// ──────────────────────────────────────────────────────────────
// FULL SEQUENCE REGISTRY
// ──────────────────────────────────────────────────────────────

export const SMS_SEQUENCE: SMSTouch[] = [
  welcome,
  reportReady,
  touch2hr,
  touch24hr,
  touch48hr,
  touch72hr,
  objectionFinancial,
  objectionTiming,
  objectionTrust,
  appointmentBooked,
  postAppointment,
  shieldOffer,
  referralRequest,
];

// ──────────────────────────────────────────────────────────────
// SCHEDULE HELPER
// ──────────────────────────────────────────────────────────────

export function getTouchForType(type: TouchType): SMSTouch | undefined {
  return SMS_SEQUENCE.find((t) => t.type === type);
}

export function getSequenceForTier(
  tier: "hot" | "warm" | "cool" | "cold",
  context: SMSContext
): { touch: SMSTouch; scheduled_at: Date }[] {
  const sequences: Record<string, { touch: SMSTouch; offset_hours: number }[]> = {
    hot: [
      { touch: welcome, offset_hours: 0 },
      { touch: touch2hr, offset_hours: 2 },
      { touch: touch24hr, offset_hours: 24 },
      { touch: touch48hr, offset_hours: 48 },
      { touch: objectionFinancial, offset_hours: 52 },
      { touch: objectionTiming, offset_hours: 60 },
      { touch: touch72hr, offset_hours: 72 },
      { touch: appointmentBooked, offset_hours: 0 },
      { touch: shieldOffer, offset_hours: 96 },
      { touch: referralRequest, offset_hours: 120 },
    ],
    warm: [
      { touch: welcome, offset_hours: 0 },
      { touch: touch24hr, offset_hours: 24 },
      { touch: touch48hr, offset_hours: 48 },
      { touch: objectionFinancial, offset_hours: 52 },
      { touch: touch72hr, offset_hours: 72 },
      { touch: objectionTrust, offset_hours: 80 },
      { touch: shieldOffer, offset_hours: 96 },
      { touch: referralRequest, offset_hours: 120 },
    ],
    cool: [
      { touch: welcome, offset_hours: 0 },
      { touch: touch24hr, offset_hours: 24 },
      { touch: touch48hr, offset_hours: 48 },
      { touch: touch72hr, offset_hours: 72 },
      { touch: referralRequest, offset_hours: 96 },
    ],
    cold: [
      { touch: welcome, offset_hours: 0 },
      { touch: touch48hr, offset_hours: 48 },
      { touch: referralRequest, offset_hours: 96 },
    ],
  };

  const now = new Date();
  return sequences[tier].map(({ touch, offset_hours }) => ({
    touch,
    scheduled_at: new Date(now.getTime() + offset_hours * 60 * 60 * 1000),
  }));
}

export function formatPhoneForTwilio(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits[0] === "1") return `+${digits}`;
  return phone;
}

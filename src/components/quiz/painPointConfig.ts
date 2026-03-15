export interface PainPoint {
  key: string;
  question: string;
  labels: [string, string];
}

export const painPoints: PainPoint[] = [
  { key: "pain_temperature", question: "How often is your home too hot or too cold?", labels: ["Never", "Constantly"] },
  { key: "pain_bills", question: "Have your energy bills jumped recently?", labels: ["No change", "Major spike"] },
  { key: "pain_system_age", question: "How old is your current system?", labels: ["Under 5 yrs", "Over 20 yrs"] },
  { key: "pain_emergencies", question: "How many breakdowns have you had?", labels: ["Never", "3+ times"] },
  { key: "pain_confusion", question: "Is it clear whether to repair or replace?", labels: ["Very clear", "Totally lost"] },
  { key: "pain_health", question: "Any allergies or breathing issues in your home?", labels: ["None", "Severe"] },
  { key: "pain_trust", question: "How confusing has dealing with contractors been?", labels: ["Always clear", "Never trust"] },
  { key: "pain_moisture", question: "Do you notice musty smells or moisture?", labels: ["Never", "Always"] },
  { key: "pain_financial", question: "How stressful is the expense of HVAC?", labels: ["Prepared", "Crisis mode"] },
  { key: "pain_confidence", question: "How confident are you about choosing the right system?", labels: ["Very confident", "No idea"] },
];

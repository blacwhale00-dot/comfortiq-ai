// The 5-slot visual-audit upload model: which photos unlock how much value, the
// BRONZE/SILVER/GOLD DataTier, and the running unlock total.
//
// Re: "re-call the engine with an updated DataTier" — the scoring engine
// (guzzler-score.ts) is fixed once the quiz is done; photos don't change the
// preliminary score in this repo. What *does* change as uploads progress is the
// unlocked value and the DataTier, so this module is the local stand-in for
// re-scoring: recompute it after every successful upload.

import { QUIZ_COMPLETE_VALUE, MAX_UNLOCK_VALUE } from "./guzzler-reveal";

export type DataTier = "BRONZE" | "SILVER" | "GOLD";

export type UploadSlotId = "outdoor" | "breaker" | "thermostat" | "air_handler" | "bill";

export interface UploadSlot {
  id: UploadSlotId;
  title: string;
  instruction: string;
  value: number;
  uploadKey:
    | "upload_outdoor"
    | "upload_breaker"
    | "upload_thermostat"
    | "upload_air_handler"
    | "upload_bill";
  accept: string;
  trophy?: boolean;
}

// Order matters — this is the order the slots are presented in.
export const UPLOAD_SLOTS: UploadSlot[] = [
  {
    id: "outdoor",
    title: "Outdoor AC Unit",
    instruction: "The condenser outside your home — grab the data plate if you can.",
    value: 50,
    uploadKey: "upload_outdoor",
    accept: "image/*",
  },
  {
    id: "breaker",
    title: "Breaker Panel",
    instruction: "Open the panel door and capture the labeled breakers.",
    value: 50,
    uploadKey: "upload_breaker",
    accept: "image/*",
  },
  {
    id: "thermostat",
    title: "Thermostat",
    instruction: "A clear shot of the thermostat on your wall.",
    value: 50,
    uploadKey: "upload_thermostat",
    accept: "image/*",
  },
  {
    id: "air_handler",
    title: "Indoor Air Handler",
    instruction: "The indoor unit — usually in a closet, attic, or basement.",
    value: 50,
    uploadKey: "upload_air_handler",
    accept: "image/*",
  },
  {
    id: "bill",
    title: "Electric Bill",
    instruction: "Your most recent bill — photo or PDF. This is the big one.",
    value: 500,
    uploadKey: "upload_bill",
    accept: "image/*,.pdf",
    trophy: true,
  },
];

const PHOTO_SLOT_IDS = UPLOAD_SLOTS.filter((s) => s.id !== "bill").map((s) => s.id);

export interface UploadProgress {
  unlockedValue: number; // base ($200) + value of every uploaded slot
  maxValue: number; // $900
  dataTier: DataTier;
  uploadedCount: number;
  total: number;
  isComplete: boolean;
}

// Base quiz value plus the value of each uploaded slot.
function unlockedValueFor(uploaded: Set<UploadSlotId>): number {
  const extra = UPLOAD_SLOTS.filter((s) => uploaded.has(s.id)).reduce((sum, s) => sum + s.value, 0);
  return QUIZ_COMPLETE_VALUE + extra;
}

// Quiz only → BRONZE; all 4 equipment photos → SILVER; + electric bill → GOLD.
function dataTierFor(uploaded: Set<UploadSlotId>): DataTier {
  const allPhotos = PHOTO_SLOT_IDS.every((id) => uploaded.has(id));
  if (allPhotos && uploaded.has("bill")) return "GOLD";
  if (allPhotos) return "SILVER";
  return "BRONZE";
}

export function computeUploadProgress(uploaded: Set<UploadSlotId>): UploadProgress {
  const unlockedValue = unlockedValueFor(uploaded);
  const uploadedCount = UPLOAD_SLOTS.filter((s) => uploaded.has(s.id)).length;
  return {
    unlockedValue,
    maxValue: MAX_UNLOCK_VALUE,
    dataTier: dataTierFor(uploaded),
    uploadedCount,
    total: UPLOAD_SLOTS.length,
    isComplete: uploadedCount === UPLOAD_SLOTS.length,
  };
}

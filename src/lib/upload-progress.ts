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

// --- Upload validation -----------------------------------------------------
// The `accept` attribute on a file input is a hint, not a control — it filters
// the picker's default view and nothing more. A user can switch the picker to
// "All Files", and a script can post anything at all. So the real check lives
// here: pure, shared by every upload path, and unit-tested.

// 15 MB comfortably fits a modern phone photo (typically 2–8 MB) while ruling
// out video and multi-hundred-MB junk.
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

// Only what a homeowner could legitimately be photographing or exporting. HEIC
// is listed explicitly — iPhones still produce it and browsers report it
// inconsistently, so leaving it out would reject genuine uploads.
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const PDF_TYPE = "application/pdf";

// `reason?: undefined` on the success arm is deliberate: this project compiles
// with `strict: false`, where narrowing a union by `!result.ok` doesn't reliably
// expose the failure arm's fields. Declaring the key on both arms keeps
// `result.reason` accessible without callers resorting to casts.
export type UploadValidation =
  | { ok: true; reason?: undefined }
  | { ok: false; reason: string };

/**
 * Is this file acceptable for this slot?
 *
 * Only the electric-bill slot takes a PDF — the equipment slots are photos, and
 * `slot.accept` is the single source of truth for which is which, so the rule
 * can't drift from what the UI advertises.
 *
 * Messages are written to be shown to a homeowner as-is.
 */
export function validateUploadFile(slot: UploadSlot, file: File): UploadValidation {
  if (file.size === 0) {
    return { ok: false, reason: "That file looks empty. Try taking the photo again." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = Math.round(file.size / (1024 * 1024));
    return {
      ok: false,
      reason: `That file is ${mb} MB — please keep it under ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    };
  }

  const pdfAllowed = slot.accept.includes("pdf");
  const type = file.type.toLowerCase();

  if (IMAGE_TYPES.has(type)) return { ok: true };
  if (pdfAllowed && type === PDF_TYPE) return { ok: true };

  return {
    ok: false,
    reason: pdfAllowed
      ? "Please upload a photo (JPG, PNG or HEIC) or a PDF."
      : "Please upload a photo — JPG, PNG or HEIC.",
  };
}

// Storage object keys must be predictable and safe. Derive the extension from
// the file's TYPE rather than its name: a name is attacker-controlled and can
// carry path separators, double extensions or nothing at all.
export function extensionForUpload(file: File): string {
  switch (file.type.toLowerCase()) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    case PDF_TYPE:
      return "pdf";
    default:
      return "jpg";
  }
}

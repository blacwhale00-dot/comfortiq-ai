// Helpers for the field-sales screenshot-to-lead pipeline (New Leads tab).

import type { Tables } from "@/integrations/supabase/types";

export type FieldLead = Tables<"field_leads">;

export interface EquipmentItem {
  type: string | null;
  brand: string | null;
  model: string | null;
  serial: string | null;
  install_year: number | null;
}

export interface ExtractedLead {
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  job_number: string | null;
  job_type: string | null;
  equipment: EquipmentItem[];
  notes_visible: string | null;
}

export interface ExtractionResult {
  lead: ExtractedLead;
  low_confidence_fields: string[];
  model: string;
}

export const EMPTY_LEAD: ExtractedLead = {
  customer_name: null,
  phone: null,
  email: null,
  street_address: null,
  city: null,
  state: null,
  zip: null,
  job_number: null,
  job_type: null,
  equipment: [],
  notes_visible: null,
};

/** Digits-only phone, mirroring the DB's generated phone_normalized column. */
export function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

const MAX_DIMENSION = 1568; // Anthropic vision sweet spot; also caps upload size.

// Screenshots arrive as PNG (iOS screenshots) or occasionally HEIC (camera
// roll). Anthropic doesn't accept HEIC, so anything that isn't already
// PNG/JPEG/WebP — plus anything oversized — is re-encoded to JPEG via canvas.
// Safari decodes HEIC natively, which is exactly where HEIC uploads come from.
export async function prepareImageForUpload(
  file: File,
): Promise<{ blob: Blob; ext: string }> {
  const passthrough = ["image/png", "image/jpeg", "image/webp"];

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (passthrough.includes(file.type)) {
      // Undecodable here but a format the extractor accepts — upload as-is.
      return { blob: file, ext: file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg" };
    }
    throw new Error(
      `Couldn't read "${file.name}" in this browser — take the screenshot as PNG/JPG and retry.`,
    );
  }

  const needsResize = Math.max(bitmap.width, bitmap.height) > MAX_DIMENSION;
  if (!needsResize && passthrough.includes(file.type)) {
    bitmap.close();
    return { blob: file, ext: file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg" };
  }

  const scale = needsResize ? MAX_DIMENSION / Math.max(bitmap.width, bitmap.height) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable in this browser");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error(`Couldn't convert "${file.name}" — try a PNG/JPG screenshot.`);
  return { blob, ext: "jpg" };
}

export const OUTCOME_LABELS: Record<string, string> = {
  sold: "Sold 🏆",
  no_sale: "No sale",
  follow_up_needed: "Follow-up needed",
  pending_decision: "Pending decision",
};

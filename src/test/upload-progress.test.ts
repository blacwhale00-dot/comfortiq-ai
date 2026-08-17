import { describe, expect, it } from "vitest";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_SLOTS,
  computeUploadProgress,
  extensionForUpload,
  validateUploadFile,
  type UploadSlotId,
} from "@/lib/upload-progress";

// upload-progress owns two things worth pinning: the BRONZE/SILVER/GOLD ladder
// (which three separate GOLD guards must agree with — see send-report and
// send-due-reminders), and the upload validation that stands between an
// anonymous visitor and our storage bucket.

const slotFor = (id: UploadSlotId) => UPLOAD_SLOTS.find((s) => s.id === id)!;
const PHOTO_IDS: UploadSlotId[] = ["outdoor", "breaker", "thermostat", "air_handler"];

// Build a File without allocating real bytes — size is what we're asserting on.
function fileOf(type: string, size = 1024, name = "upload.bin"): File {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("computeUploadProgress — the tier ladder", () => {
  it("is BRONZE with nothing uploaded", () => {
    const p = computeUploadProgress(new Set());
    expect(p.dataTier).toBe("BRONZE");
    expect(p.uploadedCount).toBe(0);
    expect(p.isComplete).toBe(false);
  });

  it("is SILVER with all four equipment photos but no bill", () => {
    expect(computeUploadProgress(new Set(PHOTO_IDS)).dataTier).toBe("SILVER");
  });

  it("is still BRONZE with the bill but a missing photo", () => {
    expect(computeUploadProgress(new Set(["bill", "outdoor"])).dataTier).toBe("BRONZE");
  });

  it("reaches GOLD only with all five", () => {
    const p = computeUploadProgress(new Set([...PHOTO_IDS, "bill"]));
    expect(p.dataTier).toBe("GOLD");
    expect(p.isComplete).toBe(true);
    expect(p.uploadedCount).toBe(UPLOAD_SLOTS.length);
  });

  it("does NOT reach GOLD when only the air handler is missing", () => {
    // Regression guard: send-due-reminders once omitted upload_air_handler from
    // its GOLD check, so a lead in exactly this state stopped receiving nudges
    // while still failing send-report's guard — no reminders, no report.
    const almost = new Set<UploadSlotId>(["outdoor", "breaker", "thermostat", "bill"]);
    const p = computeUploadProgress(almost);
    expect(p.dataTier).not.toBe("GOLD");
    expect(p.isComplete).toBe(false);
  });

  it("increases unlocked value with each upload and caps at the maximum", () => {
    const none = computeUploadProgress(new Set());
    const some = computeUploadProgress(new Set(["outdoor"]));
    const all = computeUploadProgress(new Set([...PHOTO_IDS, "bill"]));
    expect(some.unlockedValue).toBeGreaterThan(none.unlockedValue);
    expect(all.unlockedValue).toBe(all.maxValue);
  });
});

describe("validateUploadFile", () => {
  it("accepts the common phone photo formats", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]) {
      expect(validateUploadFile(slotFor("outdoor"), fileOf(type)).ok).toBe(true);
    }
  });

  it("accepts a PDF for the bill slot only", () => {
    expect(validateUploadFile(slotFor("bill"), fileOf("application/pdf")).ok).toBe(true);
    expect(validateUploadFile(slotFor("outdoor"), fileOf("application/pdf")).ok).toBe(false);
  });

  it("rejects executables and scripts regardless of filename", () => {
    for (const type of ["application/x-msdownload", "text/html", "application/javascript", ""]) {
      const result = validateUploadFile(slotFor("bill"), fileOf(type, 1024, "invoice.pdf"));
      expect(result.ok).toBe(false);
    }
  });

  it("rejects an empty file", () => {
    expect(validateUploadFile(slotFor("outdoor"), fileOf("image/jpeg", 0)).ok).toBe(false);
  });

  it("rejects anything over the size ceiling but allows the ceiling itself", () => {
    expect(validateUploadFile(slotFor("outdoor"), fileOf("image/jpeg", MAX_UPLOAD_BYTES)).ok).toBe(
      true,
    );
    expect(
      validateUploadFile(slotFor("outdoor"), fileOf("image/jpeg", MAX_UPLOAD_BYTES + 1)).ok,
    ).toBe(false);
  });

  it("gives a homeowner-readable reason on every rejection", () => {
    const result = validateUploadFile(slotFor("outdoor"), fileOf("video/mp4"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(10);
  });
});

describe("extensionForUpload", () => {
  it("derives the extension from the file type, never the filename", () => {
    // A name is attacker-controlled; the type is what we actually stored.
    expect(extensionForUpload(fileOf("image/png", 10, "evil.php"))).toBe("png");
    expect(extensionForUpload(fileOf("application/pdf", 10, "../../escape"))).toBe("pdf");
    expect(extensionForUpload(fileOf("image/heic", 10, "IMG_0001"))).toBe("heic");
  });

  it("falls back to jpg for anything unrecognised", () => {
    expect(extensionForUpload(fileOf("image/jpeg"))).toBe("jpg");
    expect(extensionForUpload(fileOf("", 10, "no-type"))).toBe("jpg");
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import UploadSlot from "@/components/quiz/UploadSlot";
import { UPLOAD_SLOTS } from "@/lib/upload-progress";

// Mobile-camera contract for the visual-audit slots.
//
// The Phase 3 QA ticket calls out camera uploads specifically: on a phone the
// homeowner is standing in front of their condenser and should get the rear
// camera in one tap, without losing the gallery / Files route (the electric-bill
// slot accepts a PDF, which a capture-only picker would hide). These tests pin
// both halves of that contract so a future refactor can't quietly drop either.

const BILL_SLOT = UPLOAD_SLOTS.find((s) => s.id === "bill")!;
const PHOTO_SLOT = UPLOAD_SLOTS[0];

// useIsMobile reads window.innerWidth (breakpoint 768) inside an effect.
function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

function renderSlot(slot: typeof PHOTO_SLOT, overrides: Partial<Parameters<typeof UploadSlot>[0]> = {}) {
  return render(
    <UploadSlot
      index={0}
      id={slot.id}
      title={slot.title}
      instruction={slot.instruction}
      value={slot.value}
      accept={slot.accept}
      trophy={slot.trophy}
      uploaded={false}
      uploading={false}
      onFile={vi.fn()}
      {...overrides}
    />,
  );
}

const fileInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));

const originalWidth = window.innerWidth;

afterEach(() => {
  cleanup();
  setViewportWidth(originalWidth);
});

describe("UploadSlot on a phone", () => {
  beforeEach(() => setViewportWidth(390));

  it("offers a rear-camera picker alongside the gallery picker", () => {
    const { container } = renderSlot(PHOTO_SLOT);

    const camera = fileInputs(container).filter((i) => i.getAttribute("capture") === "environment");
    const library = fileInputs(container).filter((i) => !i.hasAttribute("capture"));

    expect(camera).toHaveLength(1);
    expect(camera[0].accept).toBe("image/*");
    expect(library).toHaveLength(1);

    expect(screen.getByRole("button", { name: /take photo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose photo/i })).toBeInTheDocument();
  });

  it("opens the camera when the homeowner taps Take Photo", () => {
    const { container } = renderSlot(PHOTO_SLOT);
    const camera = fileInputs(container).find((i) => i.getAttribute("capture") === "environment")!;
    const click = vi.spyOn(camera, "click");

    screen.getByRole("button", { name: /take photo/i }).click();

    expect(click).toHaveBeenCalledOnce();
  });

  it("keeps the PDF route open for the electric-bill slot", () => {
    const { container } = renderSlot(BILL_SLOT);

    const library = fileInputs(container).find((i) => !i.hasAttribute("capture"))!;
    expect(library.accept).toContain(".pdf");

    // The camera picker stays images-only — a picker that also advertised PDF
    // while forcing capture would offer the homeowner a dead end.
    const camera = fileInputs(container).find((i) => i.getAttribute("capture") === "environment")!;
    expect(camera.accept).toBe("image/*");

    expect(screen.getByRole("button", { name: /photograph bill/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload file/i })).toBeInTheDocument();
  });

  it("gives both pickers a comfortable touch target", () => {
    renderSlot(PHOTO_SLOT);
    for (const name of [/take photo/i, /choose photo/i]) {
      expect(screen.getByRole("button", { name })).toHaveClass("tap-target");
    }
  });
});

describe("UploadSlot on desktop", () => {
  beforeEach(() => setViewportWidth(1280));

  it("shows a single picker and never forces the webcam", () => {
    const { container } = renderSlot(PHOTO_SLOT);

    // Both inputs are still in the DOM (the component doesn't branch on markup),
    // but only the library one is reachable — desktop browsers either ignore
    // `capture` or open a webcam, neither of which is useful here.
    expect(screen.getByRole("button", { name: /take \/ upload photo/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choose photo/i })).not.toBeInTheDocument();

    const library = fileInputs(container).find((i) => !i.hasAttribute("capture"))!;
    const click = vi.spyOn(library, "click");
    screen.getByRole("button", { name: /take \/ upload photo/i }).click();
    expect(click).toHaveBeenCalledOnce();
  });
});

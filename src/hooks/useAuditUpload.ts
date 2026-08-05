import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  UPLOAD_SLOTS,
  computeUploadProgress,
  extensionForUpload,
  validateUploadFile,
  type UploadProgress,
  type UploadSlotId,
} from "@/lib/upload-progress";
import { trackFunnelEvent } from "@/lib/funnel-events";
import { toast } from "@/hooks/use-toast";
import { getQuizSession, updateQuizSession } from "@/lib/quiz-session";

export type SlotState = { uploaded: boolean; uploading: boolean };

export interface AuditUpload {
  slots: Record<UploadSlotId, SlotState>;
  progress: UploadProgress;
  handleFile: (slotId: UploadSlotId, file: File) => Promise<void>;
  // When the 48h upload window opened (quiz completion), for the countdown timer.
  // null until resolved. See guzzler-timer.ts.
  startedAt: string | null;
}

// Shared photo-upload engine for the visual-audit flows (/unlock and /audit).
// Owns slot state, DB rehydration (resume support), the running unlock progress,
// and the upload itself. Pages layer their own post-upload behavior — trophy
// hand-off, ROI report — on top of the returned `progress`.
export function useAuditUpload(sessionId: string | null): AuditUpload {
  const [slots, setSlots] = useState<Record<UploadSlotId, SlotState>>(() =>
    Object.fromEntries(
      UPLOAD_SLOTS.map((s) => [s.id, { uploaded: false, uploading: false }]),
    ) as Record<UploadSlotId, SlotState>,
  );

  // Rehydrate already-uploaded slots so a returning homeowner sees real progress
  // instead of an empty reset.
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void (async () => {
      const data = await getQuizSession(sessionId);
      if (!active || !data) return;
      setSlots((prev) => {
        const next = { ...prev };
        for (const slot of UPLOAD_SLOTS) {
          if (data[slot.uploadKey]) next[slot.id] = { uploaded: true, uploading: false };
        }
        return next;
      });
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  // Resolve the 48h window anchor: the precise quiz-completion stamp when
  // available, else created_at. This used to need a second query as a fallback
  // in case quiz_completed_at hadn't been migrated yet; the gateway returns the
  // whole row in one call, so the column is either present or simply null.
  const [startedAt, setStartedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void (async () => {
      const session = await getQuizSession(sessionId);
      if (!active || !session) return;
      setStartedAt(session.quiz_completed_at ?? session.created_at);
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const uploadedIds = useMemo(
    () => new Set((Object.keys(slots) as UploadSlotId[]).filter((id) => slots[id].uploaded)),
    [slots],
  );

  // Recompute unlock value + DataTier after every change (the local "re-score").
  const progress = computeUploadProgress(uploadedIds);

  const handleFile = async (slotId: UploadSlotId, file: File) => {
    if (!sessionId) return;
    const slot = UPLOAD_SLOTS.find((s) => s.id === slotId);
    if (!slot) return;

    // Validate before touching the network. The input's `accept` attribute only
    // filters the file picker's default view; it stops nothing.
    const check = validateUploadFile(slot, file);
    if (!check.ok) {
      toast({
        variant: "destructive",
        title: "That file won't work",
        description: check.reason,
      });
      return;
    }

    setSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], uploading: true } }));

    try {
      // Extension comes from the file's type, never its name — see
      // extensionForUpload. Date.now() keeps re-uploads of the same slot from
      // colliding, so a retry never silently overwrites the previous attempt.
      const path = `${sessionId}/${slotId}-${Date.now()}.${extensionForUpload(file)}`;

      const { error: uploadError } = await supabase.storage
        .from("audit-uploads")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const progressAfter = computeUploadProgress(new Set([...uploadedIds, slotId]));
      const tier = progressAfter.dataTier;
      const update: TablesUpdate<"quiz_sessions"> = {
        funnel_status: `audit_${tier.toLowerCase()}`,
      };
      // Store the STORAGE PATH, not a public URL. The bucket is private, so a
      // URL would 404 anyway — and a public URL sitting in a readable column is
      // exactly how these photos (including the electric bill) leaked before.
      // Anything that needs to display one signs it on demand, server-side.
      update[slot.uploadKey] = path;
      await updateQuizSession(sessionId, update);

      trackFunnelEvent(sessionId, "photo_uploaded", slotId, { tier });
      if (progressAfter.isComplete) trackFunnelEvent(sessionId, "audit_complete");

      setSlots((prev) => ({ ...prev, [slotId]: { uploaded: true, uploading: false } }));
    } catch (err) {
      // Tell the homeowner. Silently resetting the tile to "not uploaded" looks
      // like the tap didn't register, so they retry the same failing file.
      console.error("Upload failed:", err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "That didn't go through. Check your connection and try again.",
      });
      setSlots((prev) => ({ ...prev, [slotId]: { uploaded: false, uploading: false } }));
    }
  };

  return { slots, progress, handleFile, startedAt };
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  UPLOAD_SLOTS,
  computeUploadProgress,
  type UploadProgress,
  type UploadSlotId,
} from "@/lib/upload-progress";

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
      const { data, error } = await supabase
        .from("quiz_sessions")
        .select("upload_outdoor, upload_breaker, upload_thermostat, upload_air_handler, upload_bill")
        .eq("id", sessionId)
        .maybeSingle();
      if (!active || error || !data) return;
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
  // available, else created_at — so the timer works even before the
  // quiz_completed_at migration is applied (a missing column errors the first
  // query, and we fall back rather than break).
  const [startedAt, setStartedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    void (async () => {
      const primary = await supabase
        .from("quiz_sessions")
        .select("quiz_completed_at, created_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (!active) return;
      if (!primary.error && primary.data) {
        setStartedAt(primary.data.quiz_completed_at ?? primary.data.created_at);
        return;
      }
      const fallback = await supabase
        .from("quiz_sessions")
        .select("created_at")
        .eq("id", sessionId)
        .maybeSingle();
      if (active && !fallback.error && fallback.data) {
        setStartedAt(fallback.data.created_at);
      }
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

    setSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], uploading: true } }));

    try {
      const ext = file.name.split(".").pop();
      const path = `${sessionId}/${slotId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("audit-uploads").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("audit-uploads").getPublicUrl(path);

      const tier = computeUploadProgress(new Set([...uploadedIds, slotId])).dataTier;
      const update: TablesUpdate<"quiz_sessions"> = {
        funnel_status: `audit_${tier.toLowerCase()}`,
      };
      update[slot.uploadKey] = urlData.publicUrl;
      await supabase.from("quiz_sessions").update(update).eq("id", sessionId);

      setSlots((prev) => ({ ...prev, [slotId]: { uploaded: true, uploading: false } }));
    } catch (err) {
      console.error("Upload failed:", err);
      setSlots((prev) => ({ ...prev, [slotId]: { uploaded: false, uploading: false } }));
    }
  };

  return { slots, progress, handleFile, startedAt };
}

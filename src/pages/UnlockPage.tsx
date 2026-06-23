import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import UnlockProgress from "@/components/quiz/UnlockProgress";
import UploadSlot from "@/components/quiz/UploadSlot";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import {
  UPLOAD_SLOTS,
  computeUploadProgress,
  type UploadSlotId,
} from "@/lib/upload-progress";

type SlotState = { uploaded: boolean; uploading: boolean };

// Cora stays encouraging at every stage — never punitive about what's left.
function coraMessage(uploadedCount: number, billUploaded: boolean, isComplete: boolean): string {
  if (isComplete) return "Incredible — that's GOLD status! 🏆 Every photo's in. Let's reveal your TRUE Guzzler Score.";
  if (billUploaded) return "The bill's in — that's the big one done. Round out the equipment photos whenever you're ready. 💚";
  if (uploadedCount === 0) return "Let's find your TRUE Guzzler Score. Snap whichever's easiest first — no rush, you can always come back.";
  return `Love it — ${uploadedCount} down! Each photo sharpens your numbers. The electric bill is the big $500 unlock when you're ready. 📸`;
}

export default function UnlockPage() {
  const navigate = useNavigate();
  const sessionId = useMemo(() => localStorage.getItem("comfortiq_session"), []);

  const [slots, setSlots] = useState<Record<UploadSlotId, SlotState>>(() =>
    Object.fromEntries(
      UPLOAD_SLOTS.map((s) => [s.id, { uploaded: false, uploading: false }]),
    ) as Record<UploadSlotId, SlotState>,
  );
  const hasRouted = useRef(false);

  // No session means they skipped the quiz — send them back to start it.
  useEffect(() => {
    if (!sessionId) navigate("/quiz", { replace: true });
  }, [sessionId, navigate]);

  // Resume support: rehydrate already-uploaded slots from the DB so a returning
  // homeowner sees their real progress instead of a reset, empty page.
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

  const uploadedIds = useMemo(
    () => new Set((Object.keys(slots) as UploadSlotId[]).filter((id) => slots[id].uploaded)),
    [slots],
  );

  // Recompute unlock value + DataTier after every change (the local "re-score").
  const progress = computeUploadProgress(uploadedIds);
  const billUploaded = slots.bill.uploaded;

  // All five in → hand off to the Trophy Screen (which owns the celebration).
  // Brief pause lets the final "Uploaded" state and the full bar register.
  useEffect(() => {
    if (progress.isComplete && !hasRouted.current) {
      hasRouted.current = true;
      const t = setTimeout(() => navigate("/trophy"), 800);
      return () => clearTimeout(t);
    }
  }, [progress.isComplete, navigate]);

  const handleFile = async (slotId: UploadSlotId, file: File) => {
    if (!sessionId) return;
    const slot = UPLOAD_SLOTS.find((s) => s.id === slotId);
    if (!slot) return;

    setSlots((prev) => ({ ...prev, [slotId]: { ...prev[slotId], uploading: true } }));

    try {
      const ext = file.name.split(".").pop();
      const path = `${sessionId}/${slotId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("audit-uploads")
        .upload(path, file);
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

  return (
    <Layout>
      <div className="container py-8 max-w-xl space-y-6">
        {/* Intro */}
        <div className="text-center">
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-foreground">
            Reveal Your TRUE Guzzler Score
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your score is only as accurate as your memory. A few photos let us read your actual
            equipment — and unlock up to ${progress.maxValue} in savings.
          </p>
        </div>

        <ConciergeMessage
          message={coraMessage(progress.uploadedCount, billUploaded, progress.isComplete)}
        />

        <UnlockProgress
          unlocked={progress.unlockedValue}
          max={progress.maxValue}
          caption={`${progress.uploadedCount} of ${progress.total} unlocked — ${progress.dataTier} tier`}
        />

        {/* Upload slots, in order */}
        <div className="space-y-3">
          {UPLOAD_SLOTS.map((slot, i) => (
            <UploadSlot
              key={slot.id}
              index={i}
              id={slot.id}
              title={slot.title}
              instruction={slot.instruction}
              value={slot.value}
              accept={slot.accept}
              trophy={slot.trophy}
              uploaded={slots[slot.id].uploaded}
              uploading={slots[slot.id].uploading}
              onFile={(file) => handleFile(slot.id, file)}
            />
          ))}
        </div>

        {/* Skip / return — encouraging, never punitive */}
        {!progress.isComplete && (
          <div className="text-center pt-2">
            <button
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              I'll finish this later
            </button>
            <p className="mt-1 text-xs text-muted-foreground">
              Your progress is saved — come back anytime to unlock the rest.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

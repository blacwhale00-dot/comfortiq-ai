import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SlotIllustration from "./SlotIllustration";
import type { UploadSlotId } from "@/lib/upload-progress";

interface UploadSlotProps {
  index: number;
  id: UploadSlotId;
  title: string;
  instruction: string;
  value: number;
  accept: string;
  trophy?: boolean;
  uploaded: boolean;
  uploading: boolean;
  onFile: (file: File) => void;
}

export default function UploadSlot({
  index,
  id,
  title,
  instruction,
  value,
  accept,
  trophy,
  uploaded,
  uploading,
  onFile,
}: UploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`relative rounded-2xl border-2 p-5 transition-all duration-300 ${
        uploaded
          ? "border-primary bg-primary/5 shadow-card"
          : trophy
            ? "border-accent bg-accent/5 shadow-card-hover"
            : "border-border bg-background shadow-card hover:shadow-card-hover"
      }`}
    >
      {trophy && !uploaded && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-amber text-primary-foreground text-xs font-bold whitespace-nowrap">
          🏆 THE TROPHY — WORTH $500
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Reference illustration of what to photograph */}
        <div
          className={`inline-flex items-center justify-center w-14 h-14 rounded-xl shrink-0 ${
            uploaded
              ? "bg-primary/10 text-primary"
              : trophy
                ? "bg-accent/10 text-accent"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {uploaded ? <Check className="w-7 h-7" /> : <SlotIllustration id={id} className="w-9 h-9" />}
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-foreground text-sm">
              {index + 1}. {title}
            </h3>
            <span
              className={`text-sm font-display font-extrabold shrink-0 ${
                uploaded ? "text-primary" : trophy ? "text-accent" : "text-muted-foreground"
              }`}
            >
              +${value}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{instruction}</p>

          {/* Hidden picker — image/* (and PDF for the bill). On phones the OS
              offers Camera or Photo Library; no `capture` so gallery stays available. */}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />

          <div className="mt-3">
            {uploaded ? (
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <Check className="w-4 h-4" /> Uploaded
              </div>
            ) : uploading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </div>
            ) : (
              <Button
                variant={trophy ? "amber" : "outline"}
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
                {trophy ? "Upload Bill" : "Take / Upload Photo"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

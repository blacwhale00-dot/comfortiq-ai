import { useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Both pickers hand the file to the same callback and reset themselves so
  // re-picking the same file still fires a change event.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`relative rounded-2xl border-2 p-4 sm:p-5 transition-all duration-300 ${
        uploaded
          ? "border-primary bg-primary/5 shadow-card"
          : trophy
            ? "border-accent bg-accent/5 shadow-card-hover"
            : "border-border bg-background shadow-card hover:shadow-card-hover"
      }`}
    >
      {trophy && !uploaded && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 max-w-[calc(100%-1rem)] px-2.5 sm:px-3 py-1 rounded-full gradient-amber text-primary-foreground text-[10px] sm:text-xs font-bold whitespace-nowrap">
          🏆 THE TROPHY — WORTH $500
        </div>
      )}

      <div className="flex items-start gap-3 sm:gap-4">
        {/* Reference illustration of what to photograph */}
        <div
          className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 ${
            uploaded
              ? "bg-primary/10 text-primary"
              : trophy
                ? "bg-accent/10 text-accent"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {uploaded ? (
            <Check className="w-6 h-6 sm:w-7 sm:h-7" />
          ) : (
            <SlotIllustration id={id} className="w-8 h-8 sm:w-9 sm:h-9" />
          )}
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

          {/* Two pickers, one file callback.
              · camera  — `capture="environment"` opens the rear camera straight
                away, which is what a homeowner standing in front of their
                condenser actually wants. Images only: `capture` on a picker that
                also accepts PDF would hide the bill's PDF option.
              · library — no `capture`, so the gallery / Files stays reachable and
                the bill slot keeps its PDF option.
              Only the library picker is offered on desktop, where `capture` is
              either ignored or opens a webcam. */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleChange}
          />
          <input
            ref={libraryRef}
            type="file"
            accept={accept}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={handleChange}
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
            ) : isMobile ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={trophy ? "amber" : "default"}
                  size="sm"
                  className="tap-target flex-1 min-w-[8.5rem]"
                  onClick={() => cameraRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                  {trophy ? "Photograph Bill" : "Take Photo"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="tap-target flex-1 min-w-[8.5rem]"
                  onClick={() => libraryRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4" />
                  {trophy ? "Upload File" : "Choose Photo"}
                </Button>
              </div>
            ) : (
              <Button
                variant={trophy ? "amber" : "outline"}
                size="sm"
                onClick={() => libraryRef.current?.click()}
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

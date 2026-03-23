import { useState } from "react";
import { MapPin, Award, ShieldCheck, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import willMacon from "@/assets/will-macon.png";

const trustBadges = [
  { icon: MapPin, label: "Metro Atlanta" },
  { icon: Award, label: "20+ Years" },
  { icon: ShieldCheck, label: "Verified Pro" },
];

export default function ExpertBillboard() {
  const [bioOpen, setBioOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
        className="container py-6"
      >
        <div className="max-w-2xl mx-auto bg-background rounded-2xl border border-border shadow-card overflow-hidden">
          {/* Banner Image */}
          <div className="w-full h-[200px] overflow-hidden">
            <img
              src={willMacon}
              alt="Will Macon — Metro Atlanta HVAC Architect"
              className="w-full h-full object-cover object-center"
            />
          </div>

          <div className="p-6 sm:p-8">
            <div className="text-center sm:text-left">
              <h2 className="font-display font-extrabold text-lg text-foreground leading-snug">
                Meet Will Macon — Your Metro Atlanta HVAC Architect
              </h2>
              <p className="text-xs font-semibold text-primary mt-1">
                20 Years Experience · RS Andrews Senior Pro
              </p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                I've analyzed 1,000+ homes in Atlanta. My AI and I built this
                tool to give you a transparent Engineering Blueprint that
                standard sales guys won't show you.
              </p>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-4">
                {trustBadges.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-surface px-2.5 py-1 rounded-full"
                  >
                    <b.icon className="w-3.5 h-3.5 text-primary" />
                    {b.label}
                  </span>
                ))}
              </div>

              {/* Segue Link */}
              <button
                onClick={() => setBioOpen(true)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 mt-4 transition-colors duration-200 group"
              >
                Why I built ComfortIQ
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bio Modal */}
      <Dialog open={bioOpen} onOpenChange={setBioOpen}>
        <DialogContent className="max-w-lg mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              Why I Built ComfortIQ
            </DialogTitle>
            <DialogDescription className="sr-only">
              Will Macon's story behind ComfortIQ
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-4 mt-2">
            <img
              src={willMacon}
              alt="Will Macon"
              className="w-16 h-16 rounded-full object-cover object-top border-2 border-primary/20"
            />
            <div>
              <p className="font-display font-bold text-foreground">Will Macon</p>
              <p className="text-xs text-muted-foreground">
                RS Andrews Senior Pro · 20 Years in Metro Atlanta HVAC
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              After two decades of walking through Atlanta homes, I kept seeing
              the same problem: homeowners were making $8,000–$15,000 decisions
              based on a 20-minute sales pitch and zero data.
            </p>
            <p>
              I built ComfortIQ to flip the script. Instead of a salesperson
              showing up with a quote they pulled out of thin air, you get an{" "}
              <span className="font-semibold text-foreground">
                Engineering Blueprint
              </span>{" "}
              — a transparent breakdown of your home's comfort profile, pain
              points, and the exact ROI of every upgrade option.
            </p>
            <p>
              My AI co-pilot, Comfort, walks you through the same diagnostic
              process I use on every in-home visit. The difference? You get the
              insights{" "}
              <span className="font-semibold text-foreground">before</span>{" "}
              anyone sets foot in your door — for free.
            </p>
            <p>
              No pressure, no gimmicks. Just 20 years of pattern recognition
              packed into a tool that actually respects your time and your wallet.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

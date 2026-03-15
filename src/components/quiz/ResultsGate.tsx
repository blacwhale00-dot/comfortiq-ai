import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResultsGateProps {
  onSubmit: (data: { fullName: string; email: string; phone: string }) => void;
  isSubmitting?: boolean;
}

export default function ResultsGate({ onSubmit, isSubmitting }: ResultsGateProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const isValid = fullName.trim().length >= 2 && email.includes("@") && phone.trim().length >= 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onSubmit({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header card */}
      <div className="relative overflow-hidden rounded-2xl gradient-teal p-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-foreground/15 backdrop-blur-sm mb-3">
            <Lock className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase text-primary-foreground/70 mb-1">
            Final Step
          </p>
          <h2 className="text-xl md:text-2xl font-display font-extrabold text-primary-foreground leading-tight">
            Unlock My Results
          </h2>
          <p className="text-sm text-primary-foreground/80 mt-2 max-w-xs mx-auto">
            Your diagnostic is complete. Enter your details to reveal your Readiness Score &amp; claim your <strong>$900 discount</strong>.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-background rounded-2xl shadow-elevated p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="gate-name" className="text-foreground font-semibold text-sm">
            Full Name
          </Label>
          <Input
            id="gate-name"
            type="text"
            placeholder="John Smith"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-12 rounded-xl border-border bg-surface text-foreground placeholder:text-muted-foreground"
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gate-email" className="text-foreground font-semibold text-sm">
            Email
          </Label>
          <Input
            id="gate-email"
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border-border bg-surface text-foreground placeholder:text-muted-foreground"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gate-phone" className="text-foreground font-semibold text-sm">
            Mobile Number
          </Label>
          <Input
            id="gate-phone"
            type="tel"
            placeholder="(404) 555-1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-12 rounded-xl border-border bg-surface text-foreground placeholder:text-muted-foreground"
            autoComplete="tel"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full py-4 rounded-xl gradient-teal text-primary-foreground font-display font-bold text-base hover:opacity-90 transition-opacity shadow-elevated disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <motion.div
              className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Reveal My Results
            </>
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          We'll never spam you. Your info is used only to deliver your personalized report.
        </p>
      </form>
    </motion.div>
  );
}

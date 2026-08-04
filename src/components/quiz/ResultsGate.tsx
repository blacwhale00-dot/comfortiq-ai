import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PRIVACY_PATH,
  SMS_CONSENT_BODY,
  SMS_CONSENT_LABEL,
} from "@/lib/sms-consent";

export interface ResultsGateData {
  fullName: string;
  email: string;
  phone: string;
  streetAddress: string;
  zipCode: string;
  // Did they tick the SMS box? Drives whether Cora's reminders are scheduled at
  // all, and is recorded either way as consent evidence.
  smsConsent: boolean;
}

interface ResultsGateProps {
  onSubmit: (data: ResultsGateData) => void;
  isSubmitting?: boolean;
}

export default function ResultsGate({ onSubmit, isSubmitting }: ResultsGateProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  // Unchecked by default and deliberately NOT part of `isValid` — under TCPA
  // consent to marketing texts cannot be a condition of getting the service, so
  // declining must still let you through to your results.
  const [smsConsent, setSmsConsent] = useState(false);

  const isValid =
    fullName.trim().length >= 2 &&
    email.includes("@") &&
    phone.trim().length >= 7 &&
    streetAddress.trim().length >= 4 &&
    zipCode.trim().length >= 5;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid)
      onSubmit({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        streetAddress: streetAddress.trim(),
        zipCode: zipCode.trim(),
        smsConsent,
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 flex flex-col justify-center min-h-[60vh]"
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
            Your diagnostic is complete. We'll cross-check your address against County records to build your evidence brief.
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

        <div className="space-y-2">
          <Label htmlFor="gate-address" className="text-foreground font-semibold text-sm">
            Street Address
          </Label>
          <Input
            id="gate-address"
            type="text"
            placeholder="1428 Magnolia Ridge Dr"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="h-12 rounded-xl border-border bg-surface text-foreground placeholder:text-muted-foreground"
            autoComplete="street-address"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gate-zip" className="text-foreground font-semibold text-sm">
            ZIP Code
          </Label>
          <Input
            id="gate-zip"
            type="text"
            inputMode="numeric"
            placeholder="30062"
            maxLength={10}
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="h-12 rounded-xl border-border bg-surface text-foreground placeholder:text-muted-foreground"
            autoComplete="postal-code"
            required
          />
        </div>

        {/* SMS consent. Optional by law — see the note on `smsConsent` above.
            The copy is imported, not written inline, because the exact string
            shown here is what gets stored as the consent record. */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="gate-sms-consent"
              checked={smsConsent}
              onCheckedChange={(checked) => setSmsConsent(checked === true)}
              className="mt-0.5 shrink-0"
            />
            <div className="space-y-1.5">
              <Label
                htmlFor="gate-sms-consent"
                className="text-foreground font-semibold text-sm leading-snug cursor-pointer"
              >
                {SMS_CONSENT_LABEL}
              </Label>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {SMS_CONSENT_BODY}{" "}
                <a
                  href={PRIVACY_PATH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pl-7">
            Optional — you'll get your results either way.
          </p>
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
          We'll never spam you. Your address is used only to verify public property records.
        </p>
      </form>
    </motion.div>
  );
}

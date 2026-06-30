import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import guzzlerLogo from "@/assets/guzzler-score-logo.png";
import { storeEntryIntent } from "@/lib/entry-intent";

// Door 3 of the entry chooser: "The Guzzler Score" newsletter. Captures an email
// for the not-ready-yet visitor. Stored as a quiz_sessions row tagged
// funnel_status = 'newsletter' (no dedicated subscribers table yet), consistent
// with how ExpressAuditGate tags its sessions.
export default function NewsletterPage() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    setError(null);
    try {
      const record: TablesInsert<"quiz_sessions"> = {
        first_name: firstName.trim() || null,
        email: email.trim(),
        funnel_status: "newsletter",
      };
      const { error: insertError } = await supabase.from("quiz_sessions").insert(record);
      if (insertError) throw insertError;

      storeEntryIntent("newsletter");
      setDone(true);
    } catch (err) {
      console.error("Newsletter signup error:", err);
      setError("Something went wrong on our end. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="bg-background">
        <div className="container max-w-xl py-12 md:py-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-3xl border border-border bg-background shadow-card px-5 py-8 md:px-8 md:py-10 text-center"
          >
            <img
              src={guzzlerLogo}
              alt="The Guzzler Score — HVAC efficiency rating"
              className="mx-auto w-full max-w-[260px] h-auto object-contain"
            />

            {done ? (
              <div className="mt-6 flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <h1 className="mt-4 font-display font-extrabold text-xl md:text-2xl text-foreground">
                  You're on the list.
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We'll send The Guzzler Score straight to your inbox. When you're ready to see your
                  home's score, it only takes 60 seconds.
                </p>
                <Button asChild variant="hero" size="lg" className="mt-6 w-full sm:w-auto">
                  <Link to="/quiz">Get my Guzzler Score</Link>
                </Button>
              </div>
            ) : (
              <>
                <h1 className="mt-5 font-display font-extrabold text-xl md:text-3xl text-foreground tracking-tight">
                  The Guzzler Score
                </h1>
                <p className="mt-2 text-sm md:text-base text-muted-foreground">
                  No-pressure tips on keeping your home comfortable and your energy bills honest.
                  When you're ready to know your score, we'll be here.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
                  <div className="space-y-2">
                    <Label htmlFor="newsletter-name">First name (optional)</Label>
                    <Input
                      id="newsletter-name"
                      placeholder="Your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newsletter-email">Email</Label>
                    <Input
                      id="newsletter-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                    <Mail className="w-4 h-4" />
                    {submitting ? "Subscribing…" : "Send me The Guzzler Score"}
                  </Button>
                </form>

                <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  No spam. Unsubscribe anytime.
                </p>
              </>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}

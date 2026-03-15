import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ExpressAuditGateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExpressAuditGate({ open, onOpenChange }: ExpressAuditGateProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email || !phone) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("quiz_sessions")
        .insert({
          first_name: firstName,
          email,
          phone,
          funnel_status: "express_audit",
        })
        .select("id")
        .single();

      if (error) throw error;

      localStorage.setItem("comfortiq_session", data.id);
      localStorage.setItem("comfortiq_express", "true");
      onOpenChange(false);
      navigate("/audit");
    } catch (err) {
      console.error("Express gate error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full gradient-amber flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-foreground" />
            </div>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              Express Visual Audit
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your details to start your Express Visual Audit & Lock In your $900 Credit.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="express-name">First Name</Label>
            <Input
              id="express-name"
              placeholder="Your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="express-email">Email</Label>
            <Input
              id="express-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="express-phone">Mobile Phone</Label>
            <Input
              id="express-phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "⚡ Start Express Audit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

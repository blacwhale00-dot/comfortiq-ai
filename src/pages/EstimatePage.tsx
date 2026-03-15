import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Check, Calendar } from "lucide-react";

const tiers = [
  {
    name: "Good",
    range: "$8,500 – $11,500",
    features: ["Standard efficiency system", "Basic thermostat", "1-year labor warranty", "Standard installation"],
    recommended: false,
  },
  {
    name: "Better",
    range: "$11,500 – $14,500",
    features: ["High efficiency system", "Smart thermostat included", "5-year labor warranty", "Air quality upgrade", "Priority service"],
    recommended: true,
  },
  {
    name: "Best",
    range: "$14,500 – $18,500",
    features: ["Premium variable-speed system", "Smart home integration", "10-year labor warranty", "Complete air quality suite", "Lifetime priority service", "Annual maintenance included"],
    recommended: false,
  },
];

export default function EstimatePage() {
  return (
    <Layout>
      <div className="container py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
            Your ComfortIQ Estimate
          </h1>
          <p className="text-muted-foreground">Personalized pricing based on your home assessment</p>
        </div>

        {/* Savings Banner */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="gradient-amber rounded-2xl p-5 text-center">
            <p className="text-primary-foreground font-display font-bold text-lg">
              🎉 You've Unlocked $900 in Discounts
            </p>
            <p className="text-primary-foreground/80 text-sm mt-1">Applied automatically to your final quote</p>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl p-6 md:p-8 border-2 transition-all ${
                t.recommended
                  ? "border-primary shadow-elevated scale-[1.02] bg-background"
                  : "border-border shadow-card bg-background"
              }`}
            >
              {t.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-teal text-primary-foreground text-xs font-bold">
                  Recommended
                </div>
              )}
              <h3 className="font-display font-bold text-lg text-foreground mb-1">{t.name}</h3>
              <p className="text-2xl font-display font-extrabold text-primary mb-6">{t.range}</p>
              <ul className="space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button variant={t.recommended ? "hero" : "outline"} className="w-full" size="lg">
                  Select {t.name}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Professional Engineering Disclaimer */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="bg-amber/10 border border-amber/30 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-xl bg-amber/20 flex items-center justify-center mt-0.5">
                <Info className="w-5 h-5 text-amber" />
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-display font-bold text-foreground">
                  Professional Engineering Disclaimer
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This rough estimate is based on your quiz responses and typical system sizing for your home profile. Final pricing may vary based on <strong className="text-foreground">ductwork modifications, plenum requirements, electrical upgrades, and code compliance</strong> — factors that can only be confirmed during an in-home engineering assessment. Our process goes far beyond a standard "box swap."
                </p>
                <div className="bg-amber/10 rounded-xl p-4 border border-amber/20">
                  <p className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber shrink-0" />
                    Manufacturer &amp; Utility Rebates Not Yet Applied
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    You may qualify for <strong className="text-foreground">$500 – $3,200+</strong> in additional rebates and tax credits. These can only be confirmed after your in-home assessment — don't leave money on the table.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Booking CTA */}
        <div className="text-center">
          <Button
            variant="hero"
            size="xl"
            className="w-full max-w-lg animate-pulse hover:animate-none text-lg"
            onClick={() => window.open("https://api.leadconnectorhq.com/widget/booking/YOUR_CALENDAR_ID", "_blank")}
          >
            <Calendar className="w-6 h-6" />
            BOOK APPOINTMENT NOW
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Free • No obligation • 15-minute technical verification • Same-week availability
          </p>
        </div>
      </div>
    </Layout>
  );
}

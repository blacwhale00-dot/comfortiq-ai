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

        {/* Disclaimer */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="bg-surface rounded-2xl p-6 border border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Note:</strong> This is a starting estimate. Final pricing depends on available rebates, in-home site inspection, and system sizing requirements. Your ComfortIQ advisor will provide a detailed, locked-in quote during your free in-home assessment.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="xl">
            <Calendar className="w-5 h-5" />
            Book Your Free In-Home Assessment
          </Button>
          <p className="text-xs text-muted-foreground mt-3">No obligation • 30-minute visit • Same-week availability</p>
        </div>
      </div>
    </Layout>
  );
}

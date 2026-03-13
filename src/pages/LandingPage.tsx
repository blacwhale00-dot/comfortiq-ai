import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { DollarSign, Users, FileText } from "lucide-react";
import heroPattern from "@/assets/hero-pattern.png";

const benefits = [
  { icon: DollarSign, title: "Save Money", desc: "Identify inefficiencies costing you hundreds per year" },
  { icon: Users, title: "Expert Guidance", desc: "AI trained by 15-year HVAC professionals" },
  { icon: FileText, title: "Free Estimate", desc: "Get transparent pricing in under 2 minutes" },
];

export default function LandingPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={heroPattern} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="container relative py-24 md:py-36 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Home Comfort Assessment
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-extrabold text-foreground leading-tight max-w-3xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Is Your HVAC System <span className="text-primary">Costing You</span> Too Much?
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Take our free 60-second assessment and discover how much you could save with smarter home comfort.
          </p>
          <div className="mt-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Button asChild variant="hero" size="xl">
              <Link to="/quiz">Take the Free 60-Second Assessment</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-surface">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((b, i) => (
              <div
                key={b.title}
                className="bg-background rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 text-center animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-2xl gradient-teal flex items-center justify-center mx-auto mb-5">
                  <b.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-20">
        <div className="container text-center max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
            Trusted by Atlanta Homeowners
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our AI-powered platform combines 15 years of HVAC expertise with cutting-edge technology to deliver personalized comfort recommendations — no pressure, no gimmicks.
          </p>
          <div className="mt-8">
            <Button asChild variant="outline" size="lg">
              <Link to="/education">Learn About HVAC Systems</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

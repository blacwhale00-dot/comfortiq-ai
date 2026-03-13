import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { DollarSign, Users, FileText, ShieldCheck, Clock, Heart, Camera, Zap } from "lucide-react";
import heroPattern from "@/assets/hero-pattern.png";

const benefits = [
  { icon: DollarSign, title: "Save Money", desc: "Identify inefficiencies costing you hundreds per year" },
  { icon: Users, title: "Expert Guidance", desc: "AI trained by 15-year HVAC professionals" },
  { icon: FileText, title: "Free Estimate", desc: "Get transparent pricing in under 2 minutes" },
];

const trustItems = [
  { icon: ShieldCheck, text: "15 Years HVAC Expertise" },
  { icon: Clock, text: "Free Assessment" },
  { icon: Heart, text: "No Commitment Required" },
];

const steps = [
  { num: 1, title: "Tell Us About Your Home", desc: "Complete our 60-second quiz so we understand your comfort needs." },
  { num: 2, title: "Upload Photos, Unlock Discounts", desc: "Snap photos of your equipment to unlock up to $900 off." },
  { num: 3, title: "Get Your Personalized Estimate", desc: "Receive transparent pricing & book your free in-home consultation." },
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

          {/* Trust Bar */}
          <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 sm:gap-10 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-muted-foreground text-sm">
                <item.icon className="w-5 h-5 text-primary" />
                <span>{item.text}</span>
              </div>
            ))}
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

      {/* How It Works */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-12">
            How It Works
          </h2>
          <div className="space-y-10">
            {steps.map((s, i) => (
              <div key={s.num} className="flex gap-5 items-start animate-fade-in" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="flex-shrink-0 w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg">{s.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Savings Teaser */}
      <section className="py-16 gradient-amber">
        <div className="container text-center max-w-2xl">
          <p className="text-5xl md:text-6xl font-display font-extrabold text-accent-foreground mb-4">
            Up to $900 in Discounts
          </p>
          <p className="text-accent-foreground/80 leading-relaxed">
            Upload photos of your outdoor unit, breaker panel, thermostat, and electric bill to unlock your full savings.
          </p>
          <div className="mt-8">
            <Button asChild variant="default" size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/quiz">Start Unlocking Savings</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Solar Bonus Callout */}
      <section className="bg-primary">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
          <Zap className="w-5 h-5 text-primary-foreground" />
          <p className="text-primary-foreground text-sm font-medium">
            Upload your electric bill and receive a <span className="font-bold">FREE Solar Savings Report</span> — see how to eliminate your electric bill entirely.
          </p>
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

      {/* Bottom CTA */}
      <section className="py-16 bg-surface">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
            Ready to Take Control of Your Comfort?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            It only takes 60 seconds. No commitment, no pressure — just smarter home comfort.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/quiz">Take the Free 60-Second Assessment</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
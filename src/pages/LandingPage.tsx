import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";
import { DollarSign, Users, FileText, ShieldCheck, Clock, Heart, Zap } from "lucide-react";
import { motion } from "framer-motion";
import heroPattern from "@/assets/hero-pattern.png";
import HomeComfortCard from "@/components/HomeComfortCard";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

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

const Section = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <motion.section
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.2 }}
    variants={fadeUp}
    className={className}
  >
    {children}
  </motion.section>
);

export default function LandingPage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={heroPattern} alt="" className="w-full h-full object-cover" />
        </div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="container relative py-24 md:py-36 flex flex-col items-center text-center"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            AI-Powered Home Comfort Assessment
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-display font-extrabold text-foreground leading-tight max-w-3xl">
            Is Your HVAC System <span className="text-primary">Costing You</span> Too Much?
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 text-lg text-muted-foreground max-w-xl">
            Take our free 60-second assessment and discover how much you could save with smarter home comfort.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-10">
            <Button asChild variant="hero" size="xl">
              <Link to="/quiz">Take the Free 60-Second Assessment</Link>
            </Button>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-12 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            {trustItems.map((item) => (
              <div key={item.text} className="flex items-center gap-2 text-muted-foreground text-sm">
                <item.icon className="w-5 h-5 text-primary" />
                <span>{item.text}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Benefits */}
      <Section className="py-20 bg-surface">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="container"
        >
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                className="bg-background rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-shadow duration-300 text-center"
              >
                <div className="w-14 h-14 rounded-2xl gradient-teal flex items-center justify-center mx-auto mb-5">
                  <b.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* How It Works */}
      <Section className="py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="container max-w-3xl"
        >
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-12">
            How It Works
          </motion.h2>
          <div className="space-y-10">
            {steps.map((s) => (
              <motion.div key={s.num} variants={fadeUp} className="flex gap-5 items-start">
                <div className="flex-shrink-0 w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
                  {s.num}
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg">{s.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* Savings Teaser */}
      <Section className="py-16 gradient-amber">
        <div className="container text-center max-w-2xl">
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-5xl md:text-6xl font-display font-extrabold text-accent-foreground mb-4"
          >
            Up to $900 in Discounts
          </motion.p>
          <p className="text-accent-foreground/80 leading-relaxed">
            Upload photos of your outdoor unit, breaker panel, thermostat, and electric bill to unlock your full savings.
          </p>
          <div className="mt-8">
            <Button asChild variant="default" size="lg" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to="/quiz">Start Unlocking Savings</Link>
            </Button>
          </div>
        </div>
      </Section>

      {/* Solar Bonus Callout */}
      <Section className="bg-primary">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left">
          <Zap className="w-5 h-5 text-primary-foreground" />
          <p className="text-primary-foreground text-sm font-medium">
            Upload your electric bill and receive a <span className="font-bold">FREE Solar Savings Report</span> — see how to eliminate your electric bill entirely.
          </p>
        </div>
      </Section>

      {/* Testimonials */}
      <Section className="py-20 bg-surface">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="container"
        >
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-12">
            What Atlanta Homeowners Are Saying
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "I had no idea my 12-year-old system was costing me an extra $180/month. The assessment took barely a minute and the team was zero pressure. Best home improvement decision we've made.",
                name: "Marcus T.",
                location: "Buckhead, GA",
                saved: "$900 saved",
              },
              {
                quote: "The photo upload for discounts was genius — I snapped a few pics and unlocked $650 off instantly. The whole experience felt like using a modern app, not dealing with an old-school HVAC company.",
                name: "Jennifer L.",
                location: "Marietta, GA",
                saved: "$650 saved",
              },
              {
                quote: "Comfort walked me through everything like a real advisor. I finally understand SEER ratings and why our upstairs was always 5 degrees hotter. New system is a game changer.",
                name: "David & Sarah R.",
                location: "Decatur, GA",
                saved: "$500 saved",
              },
            ].map((t) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                className="bg-background rounded-2xl p-8 shadow-card flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-foreground text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.location}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{t.saved}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Section>

      {/* Trust */}
      <Section className="py-20">
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
      </Section>

      {/* Bottom CTA */}
      <Section className="py-16 bg-surface">
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
      </Section>
    </Layout>
  );
}

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";

const chapters = [
  { num: 1, title: "The 3 Types of HVAC Systems", desc: "Central air, heat pumps, and ductless mini-splits — which one is right for your home?", emoji: "🏠" },
  { num: 2, title: "Understanding Your SEER Rating", desc: "What efficiency ratings mean for your wallet and how to compare systems fairly.", emoji: "📊" },
  { num: 3, title: "Brand Guide — The Honest Breakdown", desc: "Carrier, Trane, Lennox, and more — an unbiased look at what actually matters.", emoji: "🏷️" },
  { num: 4, title: "The Contractor Factor", desc: "Why the installer matters more than the brand. The most important chapter you'll read.", emoji: "🔧" },
  { num: 5, title: "Atlanta Homeowner's Buying Guide", desc: "Regional considerations, rebates, and what to expect from your HVAC purchase.", emoji: "📋" },
];

export default function EducationPage() {
  return (
    <Layout>
      <div className="container py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <BookOpen className="w-4 h-4" />
            Free Learning Resource
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
            HVAC Learning Center
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to know before investing in a new HVAC system — written by experts, not salespeople.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {chapters.map((c, i) => (
            <div
              key={c.num}
              className={`bg-background rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 border border-border group cursor-pointer ${
                c.num === 4 ? "md:col-span-2 lg:col-span-1 border-primary/30" : ""
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-3xl mb-4">{c.emoji}</div>
              <p className="text-xs font-medium text-primary mb-2">Chapter {c.num}</p>
              <h3 className="font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{c.desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                Read More <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

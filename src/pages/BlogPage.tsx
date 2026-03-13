import Layout from "@/components/Layout";
import { ArrowRight } from "lucide-react";

const articles = [
  { title: "5 Signs Your HVAC System Is Failing", category: "Maintenance", date: "Mar 10, 2026", excerpt: "Don't wait for a breakdown. Learn the early warning signs that your system needs attention." },
  { title: "Heat Pump vs. Central Air: 2026 Guide", category: "Buying Guide", date: "Mar 8, 2026", excerpt: "The definitive comparison for Atlanta homeowners weighing their options." },
  { title: "How to Cut Your Energy Bill by 40%", category: "Savings", date: "Mar 5, 2026", excerpt: "Practical tips from our HVAC experts that go beyond adjusting your thermostat." },
  { title: "Understanding HVAC Rebates in Georgia", category: "Rebates", date: "Mar 1, 2026", excerpt: "Federal, state, and utility rebates you might be missing out on." },
  { title: "The Truth About HVAC Extended Warranties", category: "Buying Guide", date: "Feb 28, 2026", excerpt: "Are they worth it? Our experts break down the math." },
  { title: "Indoor Air Quality: What You Need to Know", category: "Health", date: "Feb 25, 2026", excerpt: "How your HVAC system impacts your family's health and what you can do about it." },
];

const categoryColors: Record<string, string> = {
  Maintenance: "bg-primary/10 text-primary",
  "Buying Guide": "bg-accent/20 text-accent-foreground",
  Savings: "bg-green-100 text-green-700",
  Rebates: "bg-blue-100 text-blue-700",
  Health: "bg-rose-100 text-rose-700",
};

export default function BlogPage() {
  return (
    <Layout>
      <div className="container py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
            HVAC Insights
          </h1>
          <p className="text-muted-foreground">Expert advice and tips for smarter home comfort</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {articles.map((a, i) => (
            <article
              key={i}
              className="bg-background rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden border border-border group cursor-pointer"
            >
              <div className="h-40 bg-surface flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl gradient-teal opacity-20" />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[a.category] || "bg-muted text-muted-foreground"}`}>
                    {a.category}
                  </span>
                  <span className="text-xs text-muted-foreground">{a.date}</span>
                </div>
                <h3 className="font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">
                  {a.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{a.excerpt}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Read Article <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}

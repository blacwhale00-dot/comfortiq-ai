import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TrendingDown, AlertTriangle, Calendar, DollarSign, ArrowRight, Zap } from "lucide-react";

const currentCost = 287;
const newCost = 142;
const monthlyPayment = 189;
const monthlySavings = 145;
const realImpact = monthlyPayment - monthlySavings;
const yearlyWaste = (currentCost - newCost) * 12;

export default function CashFlowCloserPage() {
  const savingsPercent = Math.round(((currentCost - newCost) / currentCost) * 100);

  return (
    <Layout>
      <div className="container py-10 max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <DollarSign className="w-3.5 h-3.5" />
            Cash-Flow Closer
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-foreground">
            The Real Numbers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">See what your upgrade actually costs month-to-month</p>
        </motion.div>

        {/* 1. Comparison Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background rounded-2xl shadow-elevated p-6 mb-5"
        >
          <h2 className="text-sm font-display font-bold text-foreground mb-5 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Monthly Cost Comparison
          </h2>

          {/* Current Cost Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Current System</span>
              <span className="text-lg font-display font-extrabold text-destructive">${currentCost}/mo</span>
            </div>
            <div className="h-8 rounded-xl bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-xl bg-destructive/80"
              />
            </div>
          </div>

          {/* New Cost Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Variable Speed System</span>
              <span className="text-lg font-display font-extrabold text-primary">${newCost}/mo</span>
            </div>
            <div className="h-8 rounded-xl bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(newCost / currentCost) * 100}%` }}
                transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-xl gradient-teal"
              />
            </div>
          </div>

          {/* Savings Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0 }}
            className="flex items-center justify-center gap-2 bg-primary/10 rounded-xl py-3 px-4"
          >
            <TrendingDown className="w-5 h-5 text-primary" />
            <span className="text-sm font-display font-bold text-primary">
              Save {savingsPercent}% — That's ${currentCost - newCost}/mo back in your pocket
            </span>
          </motion.div>
        </motion.div>

        {/* 2. Net-Payment Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-background rounded-2xl shadow-card border border-border p-6 mb-5"
        >
          <h2 className="text-sm font-display font-bold text-foreground mb-5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Net Payment Breakdown
          </h2>

          <div className="space-y-4">
            {/* Monthly Payment */}
            <div className="flex items-center justify-between bg-surface rounded-xl p-4 border border-border">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Monthly Finance Payment</p>
                <p className="text-xs text-muted-foreground mt-0.5">0% for 60 months</p>
              </div>
              <span className="text-xl font-display font-extrabold text-foreground">${monthlyPayment}</span>
            </div>

            {/* Minus */}
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">−</span>
              </div>
            </div>

            {/* Monthly Savings */}
            <div className="flex items-center justify-between bg-primary/5 rounded-xl p-4 border border-primary/20">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Estimated Monthly Savings</p>
                <p className="text-xs text-muted-foreground mt-0.5">Based on your usage profile</p>
              </div>
              <span className="text-xl font-display font-extrabold text-primary">−${monthlySavings}</span>
            </div>

            {/* Equals */}
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold text-lg">=</span>
              </div>
            </div>

            {/* Real Monthly Impact */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="gradient-teal rounded-xl p-5 text-center"
            >
              <p className="text-xs font-semibold text-primary-foreground/70 uppercase tracking-wider mb-1">
                Real Monthly Impact
              </p>
              <p className="text-4xl font-display font-extrabold text-primary-foreground">
                ${realImpact}
              </p>
              <p className="text-xs text-primary-foreground/70 mt-1">
                That's less than a daily coffee ☕
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* 3. Cost of Inaction Alert */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-6 mb-8"
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mt-0.5">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="text-sm font-display font-bold text-foreground mb-1">
                The Cost of Waiting
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Waiting 12 months to replace will cost you an additional{" "}
                <span className="text-destructive font-display font-extrabold text-lg">
                  ${yearlyWaste.toLocaleString()}
                </span>{" "}
                in utility overpayments — money you'll never get back.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Plus rising repair costs and the risk of a mid-summer breakdown.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 4. Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center space-y-3"
        >
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={() => window.open("https://api.leadconnectorhq.com/widget/booking/YOUR_CALENDAR_ID", "_blank")}
          >
            <Calendar className="w-5 h-5" />
            Schedule My 15-Minute Technical Verification
            <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Free • No obligation • We verify sizing, ductwork & rebates on-site
          </p>
        </motion.div>
      </div>
    </Layout>
  );
}

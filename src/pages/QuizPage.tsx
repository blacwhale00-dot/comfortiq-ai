import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import comfortAvatar from "@/assets/comfort-avatar.png";

const stageLabels = ["Your Home Profile", "Home Details", "Comfort Issues", "Priorities"];
const squareFootageOptions = ["Under 1,000", "1,000–1,500", "1,500–2,000", "2,000–2,500", "2,500–3,000", "3,000–4,000", "4,000+"];
const comfortChallenges = ["High Energy Bills", "Uneven Temperatures", "Poor Air Quality", "Too Noisy", "Unreliable System"];
const priorityCards = [
  { id: "budget", title: "Budget Focused", desc: "Get reliable comfort at the best price", emoji: "💰" },
  { id: "efficiency", title: "Efficiency & Value", desc: "Balance performance with long-term savings", emoji: "⚡" },
  { id: "ultimate", title: "Ultimate Comfort", desc: "The best technology for total home comfort", emoji: "✨" },
];
const usStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const comfortMessages = [
  "Hi! I'm Comfort 👋 — your AI home advisor, trained by a 15-year HVAC expert. Fill in your details above and I'll guide you every step of the way!",
  "Great progress! Now tell me about your home — this helps me understand your comfort needs and find the right system.",
  "What comfort challenges are you experiencing? Select all that apply — the more I know, the better I can help!",
  "Almost done! What matters most to you? This helps me tailor your personalized estimate.",
];

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const inputClass =
  "w-full px-4 py-3.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all";
const labelClass = "text-sm font-medium text-foreground mb-1.5 block";

export default function QuizPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", age: "",
    street: "", city: "", state: "GA", zip: "",
    systemAge: 10, sqft: "", numSystems: "1", healthConditions: false,
    challenges: [] as string[],
    priority: "",
  });

  const update = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));
  const toggleChallenge = (c: string) =>
    setForm((f) => ({
      ...f,
      challenges: f.challenges.includes(c) ? f.challenges.filter((x) => x !== c) : [...f.challenges, c],
    }));

  const saveSession = useCallback(async (nextStage: number) => {
    setSaving(true);
    try {
      const data = {
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        email: form.email || null,
        phone: form.phone || null,
        age: form.age ? parseInt(form.age) : null,
        street_address: form.street || null,
        city: form.city || null,
        state: form.state,
        zip_code: form.zip || null,
        system_age: form.systemAge,
        square_footage: form.sqft || null,
        num_systems: form.numSystems,
        health_conditions: form.healthConditions,
        challenges: form.challenges,
        project_tier: form.priority || null,
        funnel_status: nextStage >= 4 ? "quiz_complete" : `stage_${nextStage}`,
      };
      if (sessionId) {
        await supabase.from("quiz_sessions").update(data).eq("id", sessionId);
      } else {
        const { data: inserted } = await supabase.from("quiz_sessions").insert(data).select("id").single();
        if (inserted) setSessionId(inserted.id);
      }
    } catch (err) {
      console.error("Failed to save session:", err);
    } finally {
      setSaving(false);
    }
  }, [form, sessionId]);

  const next = async () => {
    if (stage < 3) {
      await saveSession(stage + 1);
      setStage(stage + 1);
    } else {
      await saveSession(4);
      if (sessionId) localStorage.setItem("comfortiq_session", sessionId);
      navigate("/missions");
    }
  };
  const prev = () => stage > 0 && setStage(stage - 1);

  const progress = ((stage + 1) / 4) * 100;

  return (
    <Layout>
      {/* Progress bar */}
      <div className="bg-surface border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              Step {stage + 1} of 4
            </p>
            <p className="text-xs font-medium text-primary">{Math.round(progress)}%</p>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="h-2 rounded-full gradient-teal transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-2xl">
        {/* Title */}
        <motion.h1
          key={`title-${stage}`}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="text-2xl md:text-3xl font-display font-bold text-foreground mb-8"
        >
          Step {stage + 1}: {stageLabels[stage]}
        </motion.h1>

        {/* Form card */}
        <motion.div
          key={`form-${stage}`}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="bg-background rounded-2xl shadow-card p-6 md:p-8"
        >
          {stage === 0 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input className={inputClass} placeholder="John" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input className={inputClass} placeholder="Smith" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input className={inputClass} type="email" placeholder="john@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input className={inputClass} type="tel" placeholder="(404) 555-0123" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Age</label>
                <input className={inputClass} type="number" placeholder="35" value={form.age} onChange={(e) => update("age", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Street Address</label>
                <input className={inputClass} placeholder="123 Peachtree St" value={form.street} onChange={(e) => update("street", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City</label>
                  <input className={inputClass} placeholder="Atlanta" value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <select className={inputClass} value={form.state} onChange={(e) => update("state", e.target.value)}>
                    {usStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>ZIP Code</label>
                <input className={inputClass} placeholder="30301" maxLength={5} value={form.zip} onChange={(e) => update("zip", e.target.value)} />
              </div>
            </div>
          )}

          {stage === 1 && (
            <div className="space-y-6">
              <div>
                <label className={labelClass}>System Age: {form.systemAge} years</label>
                <input type="range" min={0} max={30} value={form.systemAge} onChange={(e) => update("systemAge", +e.target.value)}
                  className="w-full h-2 rounded-full bg-border appearance-none cursor-pointer mt-2" style={{ accentColor: "hsl(181, 82%, 25%)" }} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0 years</span><span>30 years</span></div>
              </div>
              <div>
                <label className={labelClass}>Square Footage</label>
                <select className={inputClass} value={form.sqft} onChange={(e) => update("sqft", e.target.value)}>
                  <option value="">Select...</option>
                  {squareFootageOptions.map((o) => <option key={o} value={o}>{o} sq ft</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Number of Systems</label>
                <div className="flex gap-3">
                  {["1", "2", "3+"].map((n) => (
                    <button key={n} onClick={() => update("numSystems", n)}
                      className={`flex-1 py-3.5 rounded-xl text-sm font-medium border transition-all ${
                        form.numSystems === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary/30"
                      }`}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Health conditions in home?</label>
                <div className="flex gap-3">
                  {[true, false].map((v) => (
                    <button key={String(v)} onClick={() => update("healthConditions", v)}
                      className={`flex-1 py-3.5 rounded-xl text-sm font-medium border transition-all ${
                        form.healthConditions === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary/30"
                      }`}>{v ? "Yes" : "No"}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comfortChallenges.map((c) => (
                <button key={c} onClick={() => toggleChallenge(c)}
                  className={`p-4 rounded-xl text-left text-sm font-medium border transition-all ${
                    form.challenges.includes(c)
                      ? "border-primary bg-primary/10 text-primary shadow-card"
                      : "border-border bg-surface text-muted-foreground hover:border-primary/30"
                  }`}>
                  <span className="mr-2">{form.challenges.includes(c) ? "✅" : "⬜"}</span>
                  {c}
                </button>
              ))}
            </div>
          )}

          {stage === 3 && (
            <div className="grid sm:grid-cols-3 gap-4">
              {priorityCards.map((p) => (
                <button key={p.id} onClick={() => update("priority", p.id)}
                  className={`p-6 rounded-2xl text-center border-2 transition-all ${
                    form.priority === p.id
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border hover:border-primary/30"
                  }`}>
                  <div className="text-3xl mb-3">{p.emoji}</div>
                  <h4 className="font-display font-bold text-foreground text-sm mb-1">{p.title}</h4>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Comfort AI Chat Card */}
        <motion.div
          key={`chat-${stage}`}
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mt-6 rounded-2xl bg-primary/5 border border-primary/15 p-5"
        >
          <div className="flex gap-3 items-start">
            <img
              src={comfortAvatar}
              alt="Comfort AI"
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 flex-shrink-0"
            />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Comfort — Your AI Home Advisor</p>
              <p className="text-sm text-foreground leading-relaxed">
                {comfortMessages[stage]}
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Button */}
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={next} disabled={saving} variant="hero" size="xl" className="w-full">
            {saving ? "Saving..." : stage === 3 ? "Continue to Missions" : `Continue to Step ${stage + 2}`}
            <ChevronRight className="w-5 h-5" />
          </Button>
          {stage > 0 && (
            <Button variant="ghost" onClick={prev} className="w-full text-muted-foreground">
              <ChevronLeft className="w-4 h-4" /> Back to Step {stage}
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
}

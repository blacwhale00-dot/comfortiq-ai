import { useState } from "react";
import Layout from "@/components/Layout";
import ComfortAIChat from "@/components/ComfortAIChat";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";

const stages = ["Personal Info", "Home Details", "Comfort Issues", "Priorities"];

const squareFootageOptions = ["Under 1,000", "1,000–1,500", "1,500–2,000", "2,000–2,500", "2,500–3,000", "3,000–4,000", "4,000+"];

const comfortChallenges = [
  "High Energy Bills",
  "Uneven Temperatures",
  "Poor Air Quality",
  "Too Noisy",
  "Unreliable System",
];

const priorityCards = [
  { id: "budget", title: "Budget Focused", desc: "Get reliable comfort at the best price", emoji: "💰" },
  { id: "efficiency", title: "Efficiency & Value", desc: "Balance performance with long-term savings", emoji: "⚡" },
  { id: "ultimate", title: "Ultimate Comfort", desc: "The best technology for total home comfort", emoji: "✨" },
];

const usStates = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function QuizPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
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

  const next = () => {
    if (stage < 3) setStage(stage + 1);
    else navigate("/missions");
  };
  const prev = () => stage > 0 && setStage(stage - 1);

  const chatMessages: string[] = [];
  if (stage === 0) chatMessages.push("Let's start with your basic info so I can personalize your experience!");
  if (stage === 1) chatMessages.push("Great! Now tell me about your home. This helps me understand your comfort needs.");
  if (stage === 2) chatMessages.push("What comfort challenges are you experiencing? Select all that apply.");
  if (stage === 3) chatMessages.push("Almost done! What matters most to you? This helps me tailor your estimate.");

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all";
  const labelClass = "text-sm font-medium text-foreground mb-1.5 block";

  return (
    <Layout>
      {/* Progress */}
      <div className="bg-surface border-b border-border">
        <div className="container py-4">
          <div className="flex items-center gap-2 mb-3">
            {stages.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${i <= stage ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < stage ? "gradient-teal text-primary-foreground" : i === stage ? "border-2 border-primary text-primary" : "border border-border text-muted-foreground"
                  }`}>
                    {i < stage ? "✓" : i + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">{s}</span>
                </div>
                {i < 3 && <div className={`flex-1 h-0.5 ${i < stage ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
          <div className="w-full bg-border rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full gradient-teal transition-all duration-500 ease-out"
              style={{ width: `${((stage + 1) / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-background rounded-2xl shadow-card p-6 md:p-8">
              <h2 className="text-xl font-display font-bold text-foreground mb-6">{stages[stage]}</h2>

              <div className="animate-fade-in" key={stage}>
                {stage === 0 && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><label className={labelClass}>First Name</label><input className={inputClass} placeholder="John" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></div>
                    <div><label className={labelClass}>Last Name</label><input className={inputClass} placeholder="Smith" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} /></div>
                    <div><label className={labelClass}>Email</label><input className={inputClass} type="email" placeholder="john@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
                    <div><label className={labelClass}>Phone</label><input className={inputClass} type="tel" placeholder="(404) 555-0123" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
                    <div><label className={labelClass}>Age</label><input className={inputClass} type="number" placeholder="35" value={form.age} onChange={(e) => update("age", e.target.value)} /></div>
                    <div className="sm:col-span-2"><label className={labelClass}>Street Address</label><input className={inputClass} placeholder="123 Peachtree St" value={form.street} onChange={(e) => update("street", e.target.value)} /></div>
                    <div><label className={labelClass}>City</label><input className={inputClass} placeholder="Atlanta" value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
                    <div><label className={labelClass}>State</label>
                      <select className={inputClass} value={form.state} onChange={(e) => update("state", e.target.value)}>
                        {usStates.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label className={labelClass}>ZIP Code</label><input className={inputClass} placeholder="30301" value={form.zip} onChange={(e) => update("zip", e.target.value)} /></div>
                  </div>
                )}

                {stage === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>System Age: {form.systemAge} years</label>
                      <input type="range" min={0} max={30} value={form.systemAge} onChange={(e) => update("systemAge", +e.target.value)}
                        className="w-full h-2 rounded-full bg-border appearance-none cursor-pointer accent-primary mt-2" style={{ accentColor: "hsl(181, 82%, 25%)" }} />
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
                            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
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
                            className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                              form.healthConditions === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary/30"
                            }`}>{v ? "Yes" : "No"}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {stage === 2 && (
                  <div className="grid sm:grid-cols-2 gap-3">
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
                  <div className="space-y-6">
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
                  </div>
                )}
              </div>

              {/* Nav */}
              <div className="flex justify-between mt-8 pt-6 border-t border-border">
                {stage > 0 ? (
                  <Button variant="outline" onClick={prev}><ChevronLeft className="w-4 h-4" /> Back</Button>
                ) : <div />}
                <Button onClick={next}>
                  {stage === 3 ? "Continue to Missions" : "Next"} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* AI Chat */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <ComfortAIChat firstName={form.firstName} contextMessages={chatMessages} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useRef } from "react";
import Layout from "@/components/Layout";
import ComfortAIChat from "@/components/ComfortAIChat";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Upload, Check, Camera } from "lucide-react";
import confetti from "canvas-confetti";

interface Mission {
  id: string;
  emoji: string;
  title: string;
  discount: number;
  uploaded: boolean;
  highlight?: boolean;
}

const initialMissions: Mission[] = [
  { id: "outdoor", emoji: "📷", title: "Outdoor AC Unit", discount: 250, uploaded: false },
  { id: "breaker", emoji: "⚡", title: "Breaker Panel", discount: 100, uploaded: false },
  { id: "thermostat", emoji: "🌡", title: "Thermostat", discount: 50, uploaded: false },
  { id: "bill", emoji: "📄", title: "Electric Bill", discount: 500, uploaded: false, highlight: true },
];

export default function MissionsPage() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState(initialMissions);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const totalUnlocked = missions.filter((m) => m.uploaded).reduce((a, m) => a + m.discount, 0);
  const allComplete = missions.every((m) => m.uploaded);
  const anyUploaded = missions.some((m) => m.uploaded);

  const handleUpload = (id: string) => {
    setMissions((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, uploaded: true } : m));
      const nowComplete = next.every((m) => m.uploaded);
      if (nowComplete) {
        setTimeout(() => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#0D7377", "#F4A261", "#10B981"] });
        }, 300);
      }
      return next;
    });
  };

  const chatMessages = allComplete
    ? ["🎉 Amazing! You've unlocked all $900 in savings! Let's get your estimate!"]
    : anyUploaded
    ? ["Great job! Keep uploading to unlock more savings. The Electric Bill is worth $500 alone!"]
    : ["Upload photos of your equipment to unlock exclusive discounts. Start with any card!"];

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-extrabold text-foreground mb-2">
            Unlock Your Savings
          </h1>
          <p className="text-muted-foreground">Upload photos for exclusive discounts on your new system</p>
        </div>

        {/* Progress */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-background rounded-2xl shadow-card p-6">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-medium text-muted-foreground">Savings Unlocked</span>
              <span className="text-2xl font-display font-extrabold text-primary">${totalUnlocked} <span className="text-sm font-normal text-muted-foreground">of $900</span></span>
            </div>
            <div className="w-full bg-surface rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full gradient-teal transition-all duration-700 ease-out"
                style={{ width: `${(totalUnlocked / 900) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Mission Cards */}
          <div className="lg:col-span-3">
            <div className="grid sm:grid-cols-2 gap-4">
              {missions.map((m) => (
                <div
                  key={m.id}
                  className={`relative rounded-2xl border-2 p-6 transition-all duration-300 ${
                    m.uploaded
                      ? "border-primary bg-primary/5 shadow-card"
                      : m.highlight
                      ? "border-accent bg-accent/5 shadow-card-hover"
                      : "border-border bg-background shadow-card hover:shadow-card-hover"
                  }`}
                >
                  {m.highlight && !m.uploaded && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-amber text-primary-foreground text-xs font-bold">
                      THE BIG ONE
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-4xl mb-3">{m.uploaded ? "✅" : m.emoji}</div>
                    <h3 className="font-display font-bold text-foreground mb-1">{m.title}</h3>
                    <p className={`text-lg font-display font-extrabold mb-4 ${m.uploaded ? "text-primary" : m.highlight ? "text-accent" : "text-muted-foreground"}`}>
                      ${m.discount} off
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => { fileRefs.current[m.id] = el; }}
                      onChange={() => handleUpload(m.id)}
                    />
                    {m.uploaded ? (
                      <div className="flex items-center justify-center gap-2 text-primary text-sm font-medium">
                        <Check className="w-4 h-4" /> Uploaded
                      </div>
                    ) : (
                      <Button
                        variant={m.highlight ? "amber" : "outline"}
                        size="sm"
                        onClick={() => fileRefs.current[m.id]?.click()}
                      >
                        <Camera className="w-4 h-4" />
                        Upload Photo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button
                variant="hero"
                size="xl"
                disabled={!anyUploaded}
                onClick={() => navigate("/estimate")}
              >
                Get My Estimate
              </Button>
            </div>
          </div>

          {/* AI Chat */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <ComfortAIChat contextMessages={chatMessages} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

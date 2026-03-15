import { useState, useCallback, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { quizQuestions, getMirrorResponse, deriveVariables, calculateProfile } from "@/components/quiz/conciergeConfig";
import ConciergeQuestion from "@/components/quiz/ConciergeQuestion";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import ReadinessProfile from "@/components/quiz/ReadinessProfile";
import ResultsGate from "@/components/quiz/ResultsGate";

type Phase = "intro" | "question" | "mirror" | "gate" | "calculating" | "results";

export default function QuizPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>(() => {
    const defaults: Record<string, string | number> = {};
    quizQuestions.forEach((q) => {
      if (q.type === "slider") defaults[q.id] = 3;
    });
    return defaults;
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mirrorText, setMirrorText] = useState("");
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalQ = quizQuestions.length;
  const progress = phase === "results" || phase === "calculating"
    ? 100
    : phase === "gate"
    ? 95
    : phase === "intro"
    ? 0
    : ((currentQ + (phase === "mirror" ? 1 : 0)) / totalQ) * 100;

  // Save to DB
  const saveSession = useCallback(async (final = false) => {
    const vars = deriveVariables(answers);
    const data: Record<string, any> = {
      pain_temperature: Number(answers.temperature) || null,
      pain_bills: answers.bills === "high" ? 5 : answers.bills === "med" ? 3 : answers.bills === "low" ? 1 : null,
      pain_system_age: answers.system_age === ">15" ? 5 : answers.system_age === "12-15" ? 4 : answers.system_age === "8-12" ? 3 : answers.system_age === "<8" ? 1 : null,
      pain_emergencies: answers.emergencies === "true" ? 5 : answers.emergencies === "false" ? 1 : null,
      pain_confusion: Number(answers.confusion) || null,
      pain_health: answers.health === "true" ? 5 : answers.health === "false" ? 1 : null,
      pain_trust: Number(answers.trust) || null,
      pain_moisture: Number(answers.moisture) || null,
      pain_financial: answers.financial === "high" ? 5 : answers.financial === "med" ? 3 : answers.financial === "low" ? 1 : null,
      pain_confidence: Number(answers.confidence) || null,
      funnel_status: final ? "quiz_complete" : `question_${currentQ + 1}`,
    };

    try {
      if (sessionId) {
        await supabase.from("quiz_sessions").update(data).eq("id", sessionId);
      } else {
        const { data: inserted } = await supabase.from("quiz_sessions").insert(data).select("id").single();
        if (inserted) setSessionId(inserted.id);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    }
  }, [answers, currentQ, sessionId]);

  const startQuiz = () => {
    setPhase("question");
  };

  const handleAnswer = () => {
    const q = quizQuestions[currentQ];
    const val = answers[q.id];
    const mirror = getMirrorResponse(q.id, val ?? 3);
    setMirrorText(mirror);
    setPhase("mirror");
    saveSession();
  };

  useEffect(() => {
    if (phase === "mirror") {
      const timer = setTimeout(() => {
        if (currentQ < totalQ - 1) {
          setCurrentQ((c) => c + 1);
          setPhase("question");
        } else {
          // Last question → calculating
          setPhase("calculating");
          saveSession(true).then(() => {
            if (sessionId) localStorage.setItem("comfortiq_session", sessionId);
          });
          setTimeout(() => setPhase("results"), 2500);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, currentQ, totalQ]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase, currentQ]);

  const updateAnswer = (val: string | number) => {
    const q = quizQuestions[currentQ];
    setAnswers((a) => ({ ...a, [q.id]: val }));
  };

  const profile = phase === "results" ? calculateProfile(deriveVariables(answers), answers) : null;

  return (
    <Layout>
      {/* Progress bar */}
      <div className="bg-surface border-b border-border">
        <div className="container py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {phase === "intro" ? "Welcome" : phase === "calculating" || phase === "results" ? "Complete" : `Question ${currentQ + 1} of ${totalQ}`}
            </p>
            <p className="text-xs font-medium text-primary">{Math.round(progress)}%</p>
          </div>
          <div className="w-full bg-border rounded-full h-2">
            <div
              className="h-2 rounded-full gradient-teal transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="container py-8 max-w-xl">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <ConciergeMessage
                message="Hi! I'm Comfort 👋 — your AI home advisor, trained by a 15-year HVAC expert. I'm going to ask you 10 quick questions to understand your home's comfort needs. It takes about 2 minutes. Ready?"
              />
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={startQuiz}
                className="w-full py-4 rounded-xl gradient-teal text-primary-foreground font-display font-bold text-base hover:opacity-90 transition-opacity shadow-elevated"
              >
                Let's Get Started →
              </motion.button>
            </motion.div>
          )}

          {/* Question */}
          {phase === "question" && (
            <motion.div
              key={`q-${currentQ}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <ConciergeQuestion
                question={quizQuestions[currentQ]}
                value={answers[quizQuestions[currentQ].id] ?? ""}
                onChange={updateAnswer}
                onNext={handleAnswer}
              />
            </motion.div>
          )}

          {/* Mirror response */}
          {phase === "mirror" && (
            <motion.div
              key={`mirror-${currentQ}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <ConciergeMessage message={mirrorText} />
            </motion.div>
          )}

          {/* Calculating */}
          {phase === "calculating" && (
            <motion.div
              key="calculating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="text-center py-16 space-y-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <motion.div
                  className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="text-lg font-display font-bold text-foreground">
                Calculating Your Readiness Profile...
              </p>
              <p className="text-sm text-muted-foreground">
                Analyzing your responses against 15 years of field data
              </p>
            </motion.div>
          )}

          {/* Results */}
          {phase === "results" && profile && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ReadinessProfile profile={profile} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}

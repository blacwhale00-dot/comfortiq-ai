import { useState, useCallback, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { AnimatePresence, motion } from "framer-motion";
import { quizQuestions, getMirrorResponse } from "@/components/quiz/conciergeConfig";
import { getCoraReaction } from "@/components/quiz/coraReactions";
import ConciergeQuestion from "@/components/quiz/ConciergeQuestion";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import ResultsGate, { ResultsGateData } from "@/components/quiz/ResultsGate";
import CoraBubble from "@/components/quiz/CoraBubble";
import AnalyzingTransition from "@/components/quiz/AnalyzingTransition";
import GuzzlerResults, { GuzzlerResultsData } from "@/components/quiz/GuzzlerResults";
import { calculateGuzzlerScore } from "@/lib/guzzler-score";

type Phase = "intro" | "question" | "mirror" | "gate" | "analyzing" | "results";

// Helper: build the pain-score payload from raw answers.
function buildPainPayload(answers: Record<string, string | number>) {
  return {
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
    residents: answers.residents === "5+" ? 5 : answers.residents === "3-4" ? 4 : Number(answers.residents) || null,
  };
}

// Map system_age band to a homeowner-reported integer (years).
function systemAgeToYears(band: string | number | undefined): number | null {
  switch (String(band)) {
    case "<8": return 5;
    case "8-12": return 10;
    case "12-15": return 13;
    case ">15": return 18;
    default: return null;
  }
}

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
  const [coraComment, setCoraComment] = useState("Hi! I'm Cora — I'll comment on your answers as we go. Ready when you are.");
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [guzzlerData, setGuzzlerData] = useState<GuzzlerResultsData | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalQ = quizQuestions.length;
  const progress = phase === "results" || phase === "analyzing"
    ? 100
    : phase === "gate"
    ? 95
    : phase === "intro"
    ? 0
    : ((currentQ + (phase === "mirror" ? 1 : 0)) / totalQ) * 100;

  // Save partial progress to DB
  const saveSession = useCallback(async (final = false) => {
    const data: TablesUpdate<"quiz_sessions"> = {
      ...buildPainPayload(answers),
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
    setCoraComment("Let's start simple. I'll react as you answer.");
  };

  const handleAnswer = () => {
    const q = quizQuestions[currentQ];
    const val = answers[q.id];
    setMirrorText(getMirrorResponse(q.id, val ?? 3));
    const reaction = getCoraReaction(q.id, val ?? 3);
    if (reaction) setCoraComment(reaction);
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
          setPhase("gate");
          setCoraComment("Almost there. Add your address so I can pull your County records.");
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

  // Create or update the property_intelligence record linked to this session.
  const linkPropertyIntelligence = async (
    quizSessionId: string,
    gate: ResultsGateData,
  ) => {
    try {
      const reportedSqft = String(answers.square_footage ?? "").trim() || null;
      const reportedAge = systemAgeToYears(answers.system_age);

      // Upsert by quiz_session_id (one intelligence record per lead)
      const { data: existing } = await supabase
        .from("property_intelligence")
        .select("id")
        .eq("quiz_session_id", quizSessionId)
        .maybeSingle();

      const payload = {
        quiz_session_id: quizSessionId,
        street_address: gate.streetAddress,
        zip_code: gate.zipCode,
        state: "GA",
        homeowner_reported_sqft: reportedSqft,
        homeowner_reported_system_age: reportedAge,
      };

      if (existing) {
        await supabase
          .from("property_intelligence")
          .update(payload)
          .eq("id", existing.id);
      } else {
        await supabase.from("property_intelligence").insert(payload);
      }
    } catch (err) {
      console.error("Failed to link property intelligence:", err);
    }
  };

  const handleGateSubmit = async (data: ResultsGateData) => {
    setGateSubmitting(true);
    const [firstName, ...lastParts] = data.fullName.split(" ");
    const lastName = lastParts.join(" ");
    let activeId = sessionId;

    try {
      const baseRecord: TablesUpdate<"quiz_sessions"> = {
        first_name: firstName,
        last_name: lastName || null,
        email: data.email,
        phone: data.phone,
        street_address: data.streetAddress,
        zip_code: data.zipCode,
        funnel_status: "quiz_complete",
      };

      if (activeId) {
        await supabase.from("quiz_sessions").update(baseRecord).eq("id", activeId);
      } else {
        const insertData: TablesInsert<"quiz_sessions"> = {
          ...buildPainPayload(answers),
          ...baseRecord,
        };
        const { data: inserted } = await supabase
          .from("quiz_sessions")
          .insert(insertData)
          .select("id")
          .single();
        if (inserted) {
          activeId = inserted.id;
          setSessionId(inserted.id);
        }
      }

      if (activeId) {
        localStorage.setItem("comfortiq_session", activeId);
        await linkPropertyIntelligence(activeId, data);
      }
    } catch (err) {
      console.error("Failed to save lead:", err);
    }

    setCoraComment("Pulling your County records now. This is the part that makes everything else accurate.");
    setPhase("analyzing");
    setGateSubmitting(false);
  };

  // Fetch property intelligence + compute guzzler score after analyzing completes
  const finalizeResults = useCallback(async () => {
    let yearBuilt: number | null = null;
    let yearBuiltSource: "County" | "Homeowner" | "Unknown" = "Unknown";
    let silenceYears: number | null = null;
    let lastPermitDate: string | null = null;

    if (sessionId) {
      try {
        const { data } = await supabase
          .from("property_intelligence")
          .select("county_year_built, source_year_built, permit_silence_years, permit_last_hvac_date, homeowner_reported_system_age")
          .eq("quiz_session_id", sessionId)
          .maybeSingle();

        if (data) {
          if (data.county_year_built) {
            yearBuilt = data.county_year_built;
            yearBuiltSource = data.source_year_built === "County" ? "County" : "Homeowner";
          }
          silenceYears = data.permit_silence_years;
          lastPermitDate = data.permit_last_hvac_date;
        }
      } catch (err) {
        console.error("Failed to fetch property intelligence:", err);
      }
    }

    const result = calculateGuzzlerScore({
      bills: answers.bills,
      systemAgeBand: answers.system_age,
      emergencies: answers.emergencies,
      temperature: answers.temperature,
      yearBuilt,
      silenceYears,
      lastPermitDate,
      yearBuiltSource,
    });

    setGuzzlerData(result);
    setCoraComment(
      "The data is clear — your home is a perfect candidate for this upgrade. To finalize your credit and see your rough estimate, I just need a few photos of your current equipment.",
    );
    setPhase("results");
  }, [sessionId, answers]);

  return (
    <Layout>
      {/* Progress bar */}
      <div className="bg-surface border-b border-border mt-6">
        <div className="container py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {phase === "intro"
                ? "Welcome"
                : phase === "gate"
                ? "Almost there!"
                : phase === "analyzing"
                ? "Cross-checking records"
                : phase === "results"
                ? "Complete"
                : `Question ${currentQ + 1} of ${totalQ}`}
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
                message="Hi! I'm Comfort 👋 — your AI home advisor, trained by a 15-year HVAC expert. I'm going to ask you 11 quick questions to understand your home's comfort needs. It takes about 2 minutes. Ready?"
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

          {/* Results Gate */}
          {phase === "gate" && (
            <ResultsGate onSubmit={handleGateSubmit} isSubmitting={gateSubmitting} />
          )}

          {/* Analyzing transition */}
          {phase === "analyzing" && (
            <AnalyzingTransition
              key="analyzing"
              durationMs={4500}
              onComplete={finalizeResults}
            />
          )}

          {/* Results */}
          {phase === "results" && guzzlerData && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <GuzzlerResults data={guzzlerData} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Cora assistant */}
      <CoraBubble
        comment={coraComment}
        hint={
          phase === "question"
            ? `Question ${currentQ + 1} of ${totalQ}`
            : phase === "analyzing"
            ? "Cross-referencing County + Permits..."
            : undefined
        }
      />
    </Layout>
  );
}

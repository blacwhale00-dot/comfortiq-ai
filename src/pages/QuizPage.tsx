import { useState, useCallback, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  quizQuestions,
  getMirrorResponse,
  bridgedAnswersForScoring,
} from "@/components/quiz/conciergeConfig";
import { getCoraReaction } from "@/components/quiz/coraReactions";
import ConciergeQuestion from "@/components/quiz/ConciergeQuestion";
import ConciergeMessage from "@/components/quiz/ConciergeMessage";
import ResultsGate, { ResultsGateData } from "@/components/quiz/ResultsGate";
import CoraBubble from "@/components/quiz/CoraBubble";
import AnalyzingTransition from "@/components/quiz/AnalyzingTransition";
import GuzzlerResults, { GuzzlerResultsData } from "@/components/quiz/GuzzlerResults";
import { calculateGuzzlerScore } from "@/lib/guzzler-score";

type Phase = "intro" | "question" | "mirror" | "gate" | "analyzing" | "results";

// Look up the 0–1 weight of the option the user picked for a given question id.
function weightFor(answers: Record<string, string | number>, questionId: string): number | null {
  const q = quizQuestions.find((qq) => qq.id === questionId);
  if (!q) return null;
  const opt = q.options.find((o) => o.value === String(answers[questionId]));
  return opt?.weight ?? null;
}

// Convert a 0–1 weight to a legacy 1–5 pain score.
function toPain5(w: number | null): number | null {
  if (w == null) return null;
  return Math.max(1, Math.min(5, Math.round(w * 4) + 1));
}

// Helper: build the pain-score payload from the 12 new spec answers.
// Maps each spec question into the legacy pain_* DB columns so the existing
// quiz_sessions schema stays intact.
function buildPainPayload(answers: Record<string, string | number>) {
  return {
    pain_temperature: toPain5(weightFor(answers, "comfort_rooms")),
    pain_bills: toPain5(weightFor(answers, "bills")),
    pain_system_age: toPain5(weightFor(answers, "system_age")),
    pain_emergencies: toPain5(weightFor(answers, "repairs")),
    pain_confusion: toPain5(weightFor(answers, "seer_rating")),
    pain_health: toPain5(weightFor(answers, "noises")),
    pain_trust: toPain5(weightFor(answers, "tune_up")),
    pain_moisture: toPain5(weightFor(answers, "humidity")),
    pain_financial: toPain5(weightFor(answers, "repair_cost")),
    pain_confidence: toPain5(weightFor(answers, "intent")),
    residents: null,
  };
}

// Map the new system_age band to a homeowner-reported integer (years).
function systemAgeToYears(band: string | number | undefined): number | null {
  switch (String(band)) {
    case "<5":    return 3;
    case "5-9":   return 7;
    case "10-14": return 12;
    case "15-19": return 17;
    case "20+":   return 22;
    default:      return null;
  }
}

export default function QuizPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
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

    // Bridge the 12 new spec answers into the legacy shape the scoring math expects.
    const bridged = bridgedAnswersForScoring(answers);
    const result = calculateGuzzlerScore({
      bills: bridged.bills,
      systemAgeBand: bridged.system_age,
      emergencies: bridged.emergencies,
      temperature: bridged.temperature,
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
                message="Hi! I'm Cora 👋 — your AI home advisor, trained by a 15-year HVAC expert. I'll ask you 12 quick questions to understand your home's comfort needs. Takes about 2 minutes. Ready?"
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "sessionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch session data
    const { data: session, error: fetchError } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (fetchError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context from pain scores and uploads
    const painScores = {
      temperature: session.pain_temperature,
      bills: session.pain_bills,
      system_age: session.pain_system_age,
      emergencies: session.pain_emergencies,
      confusion: session.pain_confusion,
      health: session.pain_health,
      trust: session.pain_trust,
      moisture: session.pain_moisture,
      financial: session.pain_financial,
      confidence: session.pain_confidence,
    };

    const uploads = {
      outdoor: session.upload_outdoor,
      breaker: session.upload_breaker,
      thermostat: session.upload_thermostat,
      bill: session.upload_bill,
    };

    const uploadCount = Object.values(uploads).filter(Boolean).length;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert HVAC advisor with 15 years of field experience in the Atlanta metro area. 
A homeowner has completed a pain assessment and uploaded photos of their equipment for a visual audit.

Based on their data, generate a personalized ROI analysis. Be specific, empathetic, and data-driven.

Pain scores (1-5 scale): ${JSON.stringify(painScores)}
Photos uploaded: ${uploadCount}/4 (outdoor unit: ${uploads.outdoor ? "yes" : "no"}, breaker panel: ${uploads.breaker ? "yes" : "no"}, thermostat: ${uploads.thermostat ? "yes" : "no"}, electric bill: ${uploads.bill ? "yes" : "no"})

You must respond using the provided tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: "Generate the ROI analysis report for this homeowner based on their assessment data and uploaded photos.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_roi_report",
              description: "Generate a structured ROI analysis report for the homeowner.",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A 2-3 sentence personalized summary of their situation and recommended action.",
                  },
                  insights: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 specific insights about their home comfort situation, energy usage, and potential savings.",
                  },
                  estimatedSavings: {
                    type: "number",
                    description: "Estimated annual energy savings in dollars (between 200-2400 based on severity).",
                  },
                  urgencyLevel: {
                    type: "string",
                    enum: ["low", "moderate", "high", "critical"],
                    description: "How urgently they should consider upgrading.",
                  },
                  recommendedTier: {
                    type: "string",
                    enum: ["Good", "Better", "Best"],
                    description: "Which pricing tier best fits their needs.",
                  },
                },
                required: ["summary", "insights", "estimatedSavings", "urgencyLevel", "recommendedTier"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_roi_report" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    let report;
    if (toolCall?.function?.arguments) {
      report = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback report
      report = {
        summary: "Based on your assessment, your system shows signs of inefficiency that are costing you money. A modern upgrade could significantly improve your comfort and reduce energy bills.",
        insights: [
          "Your pain scores indicate above-average discomfort — this is fixable with the right system.",
          "Uploading your electric bill helps us calculate exact ROI for your specific usage patterns.",
          "Modern systems are 40-60% more efficient than units installed 10+ years ago.",
        ],
        estimatedSavings: 850,
        urgencyLevel: "moderate",
        recommendedTier: "Better",
      };
    }

    // Store report in DB
    await supabase
      .from("quiz_sessions")
      .update({ roi_report: report, funnel_status: "audit_complete" })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-audit error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

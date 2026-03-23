// ============================================================
// Comfort AI Chat — Enhanced React Component
// Built by Tandem AI for ComfortIQ.AI
// Uses the Comfort Response Engine + Quiz Context
// ============================================================

import { useState, useRef, useEffect } from "react";
import { Send, Upload, Phone, Calendar } from "lucide-react";
import comfortAvatar from "@/assets/comfort-avatar.png";
import {
  generateComfortResponse,
  buildTierProfile,
  calculatePowerTax,
  analyzeHVACPhoto,
  analyzeBreakerPanel,
  analyzeWaterHeater,
  type QuizContext,
  type ConversationTurn,
} from "./comfort-agent/comfort-response-engine";

export interface ComfortChatConfig {
  quizContext?: QuizContext;
  firstName?: string;
  onBookAppointment?: () => void;
  onUploadPhoto?: (type: "hvac" | "panel" | "water" | "bill") => void;
  onRequestQuote?: () => void;
}

export default function ComfortAIChat({
  quizContext,
  firstName,
  onBookAppointment,
  onUploadPhoto,
  onRequestQuote,
}: ComfortChatConfig) {
  const [messages, setMessages] = useState<ConversationTurn[]>(() => {
    const greeting = firstName
      ? `Hey ${firstName}! I'm Comfort — your personal home advisor. I've been trained by William, a 15-year HVAC expert from right here in Atlanta. Let's figure out exactly what your home needs — together. How can I help you today?`
      : `Hey! I'm Comfort — your personal home advisor. I've been trained by William, a 15-year HVAC expert from right here in Atlanta. I've helped thousands of homeowners figure out whether to repair or replace their HVAC, what things should actually cost, and how to avoid getting taken advantage of. Let's figure out exactly what your home needs. How can I help you today?`;
    return [{ role: "comfort", text: greeting, timestamp: Date.now() }];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    const conversationHistory = messages;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", text: userMessage, timestamp: Date.now() }]);
    setInput("");
    setIsTyping(true);

    // Simulate Comfort "thinking" — then generate response
    setTimeout(async () => {
      const response = generateComfortResponse(
        userMessage,
        quizContext ?? {},
        conversationHistory
      );

      setMessages((prev) => [...prev, { role: "comfort", text: response, timestamp: Date.now() }]);
      setIsTyping(false);
    }, 800);
  };

  const handlePhotoUpload = (type: "hvac" | "panel" | "water" | "bill") => {
    setUploadMenuOpen(false);
    onUploadPhoto?.(type);

    const uploadMessages: Record<string, string> = {
      hvac: "Perfect — upload a clear photo of your outdoor AC unit. The serial number sticker is the most important part to get in frame. You can usually find it on the side of the outdoor unit. Take your time getting a good shot.",
      panel: "Go ahead and upload a photo of your breaker panel — the main electrical panel in your home. I'm looking for the brand name, any rust, double-taps, or burn marks. Take a wide shot first, then a close-up of the main breaker label.",
      water: "Upload a photo of your water heater — the label on the unit is what I need most. It's usually near the top or on the front. A second shot of the overall unit helps too. Take a look and upload what you've got.",
      bill: "Upload your electric bill — a photo of the PDF or the paper bill works great. The total amount and the breakdown between your supply charges and delivery charges are what I need most. Once I see that, I can run your Power Tax number.",
    };

    setMessages((prev) => [
      ...prev,
      { role: "user", text: `[Uploaded ${type} photo]`, timestamp: Date.now() },
      { role: "comfort", text: uploadMessages[type], timestamp: Date.now() },
    ]);
  };

  const handleQuickAction = (action: "book" | "quote" | "photo" | "power-tax") => {
    const quickMessages: Record<string, { user: string; comfort: string }> = {
      book: {
        user: "I want to book an appointment",
        comfort: `Let's get you on the calendar right away. What's your address, and what day and time works best for you? William will come out, take a look at your system, and give you a completely honest answer on what you need — repair or replace, what it should cost, and how to think about financing. No obligation, just a straight answer.`,
      },
      quote: {
        user: "I want to get a quote",
        comfort: `Absolutely — let me put together a no-obligation quote for you. I just need a couple of things: what's the square footage of your home, and are you thinking Budget, Efficiency, or Premium tier for a new system? I can show you exactly what each tier costs, what your monthly payment would be, and what you'd save every month on your electric bills.`,
      },
      photo: {
        user: "I want to upload a photo",
        comfort: `Go ahead — what are you uploading? A photo of your outdoor AC unit, your electrical panel, your water heater, or your electric bill? Tell me what you've got and I'll walk you through what to shoot.`,
      },
      "power-tax": {
        user: "Show me my Power Tax number",
        comfort: quizContext?.powerTaxMonthly
          ? `We've already got your Power Tax calculated — your system is costing you about $${quizContext.powerTaxMonthly} a month more than it should. That's $${(quizContext.powerTaxMonthly * 12).toLocaleString()} a year going out the window. Want me to show you exactly how a new system would change that number?`
          : `Upload a photo of your electric bill and I'll run your Power Tax calculation right now. It takes about 30 seconds and it'll tell you exactly how much your HVAC system is costing you in wasted energy every single month.`,
      },
    };

    const { user, comfort } = quickMessages[action];
    setMessages((prev) => [
      ...prev,
      { role: "user", text: user, timestamp: Date.now() },
      { role: "comfort", text: comfort, timestamp: Date.now() },
    ]);
  };

  // Build tier context if we have quiz data
  const tierProfile = quizContext?.readinessTier
    ? buildTierProfile(quizContext ?? {})
    : null;

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden shadow-elevated">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-gradient-to-r from-[#0D9488] to-[#0F766E]">
        <img
          src={comfortAvatar}
          alt="Comfort AI"
          className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
        />
        <div>
          <p className="font-display font-bold text-sm text-white">Comfort</p>
          <p className="text-xs text-white/70">Your AI Home Advisor</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-white/70">Live</span>
        </div>
      </div>

      {/* ── Tier Banner (if quiz completed) ── */}
      {tierProfile && (
        <div
          className={`px-4 py-2 text-xs font-semibold text-center ${
            tierProfile.color === "red"
              ? "bg-red-500/10 text-red-600"
              : tierProfile.color === "amber"
              ? "bg-amber-50 text-amber-700"
              : "bg-teal-50 text-teal-700"
          }`}
        >
          {tierProfile.title} — {tierProfile.subtitle}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="flex gap-2 p-3 border-b border-border bg-background/50 overflow-x-auto">
        <button
          onClick={() => handleQuickAction("book")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-semibold whitespace-nowrap hover:bg-[#0D9488]/20 transition-colors"
        >
          <Calendar className="w-3 h-3" />
          Book Appointment
        </button>
        <button
          onClick={() => handleQuickAction("quote")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-semibold whitespace-nowrap hover:bg-[#0D9488]/20 transition-colors"
        >
          <Phone className="w-3 h-3" />
          Get Quote
        </button>
        <button
          onClick={() => handleQuickAction("photo")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D9488]/10 text-[#0D9488] text-xs font-semibold whitespace-nowrap hover:bg-[#0D9488]/20 transition-colors"
        >
          <Upload className="w-3 h-3" />
          Upload Photo
        </button>
        <button
          onClick={() => handleQuickAction("power-tax")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold whitespace-nowrap hover:bg-amber-100 transition-colors"
        >
          ⚡ My Power Tax
        </button>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "comfort" && (
              <img
                src={comfortAvatar}
                alt="Comfort"
                className="w-7 h-7 rounded-full object-cover border border-[#0D9488]/20 mt-1 mr-2 shrink-0"
              />
            )}
            <div
              className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === "comfort"
                  ? "bg-[#0D9488]/8 text-foreground rounded-bl-md border border-[#0D9488]/15"
                  : "bg-[#0D9488] text-white rounded-br-md shadow-card"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-2">
            <img
              src={comfortAvatar}
              alt="Comfort typing"
              className="w-7 h-7 rounded-full object-cover border border-[#0D9488]/20 mt-1 mr-2 shrink-0"
            />
            <div className="bg-[#0D9488]/8 border border-[#0D9488]/15 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setUploadMenuOpen(!uploadMenuOpen)}
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-[#0D9488] hover:border-[#0D9488]/30 transition-colors"
              title="Upload a photo"
            >
              <Upload className="w-4 h-4" />
            </button>
            {uploadMenuOpen && (
              <div className="absolute bottom-12 left-0 bg-background border border-border rounded-xl shadow-elevated p-2 w-48 z-50">
                <p className="text-xs font-semibold text-muted-foreground px-2 pb-1">Upload a photo:</p>
                <button
                  onClick={() => handlePhotoUpload("hvac")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#0D9488]/10 text-foreground"
                >
                  🏠 Outdoor AC Unit
                </button>
                <button
                  onClick={() => handlePhotoUpload("panel")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#0D9488]/10 text-foreground"
                >
                  ⚡ Electrical Panel
                </button>
                <button
                  onClick={() => handlePhotoUpload("water")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#0D9488]/10 text-foreground"
                >
                  🚿 Water Heater
                </button>
                <button
                  onClick={() => handlePhotoUpload("bill")}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[#0D9488]/10 text-foreground"
                >
                  📄 Electric Bill
                </button>
              </div>
            )}
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask Comfort anything..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0D9488]/30 focus:border-[#0D9488]/30"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          Comfort responds instantly · Powered by Tandem AI · William Macon's expertise
        </p>
      </div>
    </div>
  );
}

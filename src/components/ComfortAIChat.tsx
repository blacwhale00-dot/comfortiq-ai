import { useState } from "react";
import { Send } from "lucide-react";
import comfortAvatar from "@/assets/comfort-avatar.png";

interface Message {
  role: "comfort" | "user";
  text: string;
}

interface ComfortAIChatProps {
  firstName?: string;
  contextMessages?: string[];
}

export default function ComfortAIChat({ firstName, contextMessages = [] }: ComfortAIChatProps) {
  const greeting = `Hi${firstName ? ` ${firstName}` : ""}! I'm Comfort, your personal home advisor. I've been trained by William, a 15-year HVAC expert. Let's figure out exactly what your home needs — together.`;

  const [messages, setMessages] = useState<Message[]>([
    { role: "comfort", text: greeting },
    ...contextMessages.map((t) => ({ role: "comfort" as const, text: t })),
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((m) => [
      ...m,
      { role: "user", text: userMsg },
      { role: "comfort", text: "That's a great question! I'll make sure William's expertise helps guide us to the best solution for your home. Let's keep going with your assessment." },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-background">
        <img src={comfortAvatar} alt="Comfort AI" className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
        <div>
          <p className="font-display font-semibold text-sm text-foreground">Comfort</p>
          <p className="text-xs text-muted-foreground">Your AI Home Advisor</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "comfort"
                  ? "bg-primary/10 text-foreground rounded-bl-md"
                  : "bg-background text-foreground border border-border rounded-br-md"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask Comfort anything..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={send}
            className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

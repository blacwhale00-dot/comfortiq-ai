import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import QuizPage from "./pages/QuizPage.tsx";
import UnlockPage from "./pages/UnlockPage.tsx";
import TrophyPage from "./pages/TrophyPage.tsx";
import IncompletePage from "./pages/IncompletePage.tsx";
import MissionsPage from "./pages/MissionsPage.tsx";
import VisualAuditPage from "./pages/VisualAuditPage.tsx";
import EstimatePage from "./pages/EstimatePage.tsx";
import EducationPage from "./pages/EducationPage.tsx";
import BlogPage from "./pages/BlogPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import CashFlowCloserPage from "./pages/CashFlowCloserPage.tsx";
import IntelligencePage from "./pages/IntelligencePage.tsx";
import NewsletterPage from "./pages/NewsletterPage.tsx";
// CommandCenterPage is intentionally NOT imported or routed — see the note on
// the removed /command-center route below.
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// `reducedMotion="user"` makes every framer-motion animation in the funnel
// (score reveal, slot stagger, Cora bubble) collapse to an instant state change
// when the visitor has "reduce motion" enabled on their phone or OS. CSS-driven
// animations are handled by the matching media query in index.css.
const App = () => (
  <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* The guzzlerscore.com landing CTA points here (landing/index.html);
                attribution is captured on mount before this redirect renders. */}
            <Route path="/assess" element={<Navigate to="/quiz" replace />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/unlock" element={<UnlockPage />} />
            <Route path="/trophy" element={<TrophyPage />} />
            <Route path="/incomplete" element={<IncompletePage />} />
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/audit" element={<VisualAuditPage />} />
            <Route path="/estimate" element={<EstimatePage />} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/cash-flow" element={<CashFlowCloserPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            {/*
              /command-center is OFFLINE pending authentication.

              It is an internal CRM that lists every lead — name, email, phone,
              address — and it had no login of any kind, so the whole table was
              readable by anyone who knew the URL. It also read quiz_sessions
              directly, which anon no longer has access to at all (see
              20260803050000_quiz_session_rpc_gateway.sql).

              The page and src/lib/command-center.ts are deliberately kept in the
              repo, tested and intact. To restore: put it behind Supabase Auth
              with an admin role, and have it read through an edge function using
              the service role rather than the anon client.
            */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </MotionConfig>
  </QueryClientProvider>
);

export default App;

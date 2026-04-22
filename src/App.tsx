import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import QuizPage from "./pages/QuizPage.tsx";
import MissionsPage from "./pages/MissionsPage.tsx";
import VisualAuditPage from "./pages/VisualAuditPage.tsx";
import EstimatePage from "./pages/EstimatePage.tsx";
import EducationPage from "./pages/EducationPage.tsx";
import BlogPage from "./pages/BlogPage.tsx";
import PrivacyPage from "./pages/PrivacyPage.tsx";
import CashFlowCloserPage from "./pages/CashFlowCloserPage.tsx";
import IntelligencePage from "./pages/IntelligencePage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/audit" element={<VisualAuditPage />} />
          <Route path="/estimate" element={<EstimatePage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/cash-flow" element={<CashFlowCloserPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { captureLeadSource } from "@/lib/lead-source";
import "./index.css";

// First-touch attribution MUST run before the router renders: routes like
// /assess redirect immediately and strip the query string, so an effect inside
// the tree would read an already-cleaned URL.
captureLeadSource();

createRoot(document.getElementById("root")!).render(<App />);

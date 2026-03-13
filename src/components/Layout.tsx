import { ReactNode } from "react";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 bg-surface">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 ComfortIQ.AI — Smarter Home Comfort Starts Here</p>
        </div>
      </footer>
    </div>
  );
}

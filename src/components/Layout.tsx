import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 20px)' }}>
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-10 bg-surface">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 ComfortIQ.AI — Smarter Home Comfort Starts Here</p>
          <div className="flex items-center gap-6">
            <Link to="/education" className="hover:text-primary transition-colors">Education</Link>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

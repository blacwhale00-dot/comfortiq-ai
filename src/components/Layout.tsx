import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ paddingTop: 'calc(env(safe-area-inset-top, 24px) + 20px)' }}>
      <Navbar />
      {/* `w-full max-w-full` + the clip keeps any single over-wide child (a long
          unbreakable string, a fixed-width SVG) from widening the whole page —
          the last line of defence behind the html/body guard in index.css. */}
      <main className="flex-1 mt-6 w-full max-w-full overflow-x-clip">{children}</main>
      <footer className="border-t border-border py-8 md:py-10 bg-surface pb-safe">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground text-center md:text-left">
          <p>© 2026 GuzzlerScore — Know Your Score Before You Get a Quote</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link to="/education" className="hover:text-primary transition-colors">Education</Link>
            <Link to="/blog" className="hover:text-primary transition-colors">Blog</Link>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

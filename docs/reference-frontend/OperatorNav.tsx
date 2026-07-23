import { Link, useLocation } from "react-router-dom";

const TABS = [
  { to: "/command-center", label: "Dashboard" },
  { to: "/command-center/leads", label: "New Leads" },
  { to: "/command-center/approvals", label: "Approvals" },
];

// Tab strip shared by the operator pages.
export default function OperatorNav() {
  const { pathname } = useLocation();
  return (
    <div className="flex gap-1 rounded-lg border border-border p-1 bg-surface w-fit">
      {TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            pathname === tab.to
              ? "gradient-teal text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

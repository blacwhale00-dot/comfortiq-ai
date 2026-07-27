import { FormEvent, ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useOperator } from "@/hooks/use-operator";

// Auth wall for the internal operator pages (/command-center/*). Sign-in only —
// operator accounts are provisioned from the Supabase dashboard, never
// self-service.
export default function OperatorGate({ children }: { children: ReactNode }) {
  const { session, loading } = useOperator();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-muted-foreground py-16 text-center">Checking session…</p>
      </Layout>
    );
  }

  if (session) return <>{children}</>;

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError(authError.message);
    setSubmitting(false);
  };

  return (
    <Layout>
      <div className="container py-16 max-w-sm">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Operator sign-in</CardTitle>
            <p className="text-sm text-muted-foreground">
              This area ({location.pathname}) is for the sales team only.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="op-email">Email</Label>
                <Input
                  id="op-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="op-password">Password</Label>
                <Input
                  id="op-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                No account? Ask the admin — accounts are created in Supabase.
              </p>
            </form>
          </CardContent>
        </Card>
        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-primary hover:underline">← Back to GuzzlerScore</Link>
        </p>
      </div>
    </Layout>
  );
}

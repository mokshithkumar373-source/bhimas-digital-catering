import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Utensils, Loader2, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Bhimas Catering" },
      { name: "description", content: "Secure admin sign in for the Bhimas Catering management system." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin Login — Bhimas Catering" },
      { property: "og:description", content: "Secure admin sign in for the Bhimas Catering management system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const finish = async () => {
    navigate({ to: "/dashboard", replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (factorId) {
      if (!/^\d{6}$/.test(code.trim())) {
        setError("Enter the 6-digit code from your authenticator app.");
        return;
      }
      setLoading(true);
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr || !ch) {
        setLoading(false);
        setError(chErr?.message ?? "Could not start verification.");
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: code.trim(),
      });
      setLoading(false);
      if (vErr) {
        setError("Invalid authentication code. Please try again.");
        return;
      }
      await finish();
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setLoading(false);
      setError(
        signInError.message.toLowerCase().includes("invalid")
          ? "Incorrect email or password."
          : signInError.message,
      );
      return;
    }

    // Owner accounts with TOTP enrolled must complete a second factor.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      setLoading(false);
      if (totp) {
        setFactorId(totp.id);
        return;
      }
    }
    setLoading(false);
    await finish();
  };

  const handleForgot = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    const { error: rErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (rErr) toast.error(rErr.message);
    else toast.success("Password reset link sent. Check your inbox.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-soft px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
            <Utensils className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-brand">Bhimas Catering</h1>
          <p className="text-xs text-muted-foreground">తణుకు</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {factorId ? "Two-factor verification" : "Admin sign in"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {factorId ? (
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Authenticator code
              </Label>
              <Input
                id="code"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-muted-foreground">
                Open Google or Microsoft Authenticator and enter the 6-digit code.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Please wait…" : factorId ? "Verify & continue" : "Login"}
          </Button>

          {!factorId && (
            <button
              type="button"
              onClick={handleForgot}
              className="w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-brand hover:underline"
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-brand">
            ← Back to home
          </Link>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}

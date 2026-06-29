import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Gift } from "lucide-react";
import { z } from "zod";

const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SITE_URL) ||
  "https://socialtaskpay.com";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ ref: z.string().optional() }).parse,
  head: () => ({ meta: [{ title: "Sign in — TaskPay" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { ref } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(ref ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState((ref ?? "").toUpperCase());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ref) {
      try { localStorage.setItem("pending_referral", ref.toUpperCase()); } catch {}
    } else {
      try {
        const saved = localStorage.getItem("pending_referral");
        if (saved) setReferralCode(saved);
      } catch {}
    }
  }, [ref]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const meta: Record<string, string> = { display_name: name };
        if (referralCode.trim()) meta.referral_code = referralCode.trim().toUpperCase();
        let lastErr: any = null;
        for (let i = 0; i < 2; i++) {
          const { error } = await supabase.auth.signUp({
            email, password,
            options: { emailRedirectTo: `${SITE_URL}/dashboard`, data: meta },
          });
          if (!error) { lastErr = null; break; }
          lastErr = error;
          if (!/network|fetch|timeout/i.test(error.message)) break;
        }
        if (lastErr) throw lastErr;
        try { localStorage.removeItem("pending_referral"); } catch {}
        toast.success("Account created! Check your inbox to verify your email.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${SITE_URL}/dashboard` });
    if (result.error) return toast.error(result.error.message);
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-hero grid place-items-center px-4 py-12">
      <div className="absolute top-6 left-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </div>
      <div className="w-full max-w-md rounded-2xl bg-gradient-card border border-border p-8 shadow-card">
        <div className="text-center mb-6">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary text-primary-foreground font-display text-xl font-bold">T</div>
          <h1 className="mt-4 font-display text-2xl font-bold">Welcome to TaskPay</h1>
          <p className="text-sm text-muted-foreground">Earn money from social media tasks</p>
        </div>

        {ref && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <Gift className="h-4 w-4" /> You were invited! Sign up to credit your friend.
          </div>
        )}

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value={mode} className="mt-6 space-y-4">
            <Button onClick={handleGoogle} variant="outline" className="w-full h-11">
              Continue with Google
            </Button>
            <div className="relative text-center text-xs text-muted-foreground">
              <div className="absolute inset-0 top-1/2 border-t border-border" />
              <span className="relative bg-card px-3">or with email</span>
            </div>
            <form onSubmit={handleEmail} className="space-y-3">
              {mode === "signup" && (
                <>
                  <div>
                    <Label>Display name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
                  </div>
                  <div>
                    <Label>Referral code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="ABC12345"
                      maxLength={12}
                    />
                  </div>
                </>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-primary text-primary-foreground shadow-glow">
                {loading ? "..." : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

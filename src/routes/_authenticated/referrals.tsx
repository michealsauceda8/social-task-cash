import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, Gift, Users, Clock, CheckCircle2, Share2 } from "lucide-react";

const SITE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SITE_URL) ||
  (typeof window !== "undefined" ? window.location.origin : "https://socialtaskpay.com");

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({ meta: [{ title: "Referrals — TaskPay" }] }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["ref-profile", user?.id], enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("referral_code,display_name").eq("id", user!.id).single()).data,
  });

  const { data: settings } = useQuery({
    queryKey: ["referral-settings-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings").select("key,value")
        .in("key", ["referral_enabled", "referral_reward"]);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      return {
        enabled: (map.referral_enabled ?? true) !== false,
        reward: Number(map.referral_reward ?? 1),
      };
    },
  });

  const { data: referrals } = useQuery({
    queryKey: ["my-referrals", user?.id], enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id,status,reward_amount,credited_at,created_at,referee:profiles!referrals_referee_id_fkey(display_name,email)")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const code = profile?.referral_code ?? "";
  const link = code ? `${SITE_URL}/auth?ref=${code}` : "";

  const stats = {
    total: referrals?.length ?? 0,
    credited: referrals?.filter((r) => r.status === "credited").length ?? 0,
    pending: referrals?.filter((r) => r.status === "pending").length ?? 0,
    earnings: (referrals ?? []).reduce(
      (s, r) => (r.status === "credited" ? s + Number(r.reward_amount ?? 0) : s),
      0,
    ),
  };

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Join me on TaskPay",
          text: "Earn cash completing quick social tasks. Use my link:",
          url: link,
        });
      } catch {}
    } else {
      copy(link, "Link");
    }
  }

  if (settings && !settings.enabled) {
    return (
      <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-card border border-border p-10 text-center">
        <Gift className="h-10 w-10 mx-auto text-primary" />
        <h1 className="font-display text-2xl font-bold mt-4">Referral program is paused</h1>
        <p className="text-muted-foreground mt-2 text-sm">Check back soon — referrals will resume shortly.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Refer & Earn</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Get <span className="text-primary font-semibold">{money(settings?.reward ?? 0)}</span> for every friend who completes their first task.
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total invited" value={String(stats.total)} />
        <StatCard icon={CheckCircle2} label="Successful" value={String(stats.credited)} />
        <StatCard icon={Clock} label="Pending" value={String(stats.pending)} />
        <StatCard icon={Gift} label="Earnings" value={money(stats.earnings)} highlight />
      </div>

      {/* Link sharing */}
      <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Your referral link</h2>
        <p className="text-sm text-muted-foreground mt-1">Share it anywhere — socials, DMs, group chats.</p>

        <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-2">
          <Input readOnly value={link} className="font-mono text-sm" />
          <div className="flex gap-2">
            <Button onClick={() => copy(link, "Link")} variant="outline"><Copy className="h-4 w-4 mr-1" /> Copy</Button>
            <Button onClick={share} className="bg-gradient-primary text-primary-foreground shadow-glow"><Share2 className="h-4 w-4 mr-1" /> Share</Button>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Your code</div>
            <div className="flex items-center justify-between mt-1">
              <div className="font-mono text-xl font-bold text-primary">{code || "—"}</div>
              {code && <Button size="sm" variant="ghost" onClick={() => copy(code, "Code")}><Copy className="h-4 w-4" /></Button>}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Reward per signup</div>
            <div className="mt-1 font-display text-xl font-bold">{money(settings?.reward ?? 0)}</div>
            <div className="text-xs text-muted-foreground mt-1">Auto-credited when your friend completes their first task.</div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold mb-4">Activity</h2>
        <div className="divide-y divide-border/50">
          {(referrals ?? []).length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No referrals yet. <Link to="/referrals" className="text-primary underline">Share your link</Link> to get started.
            </div>
          )}
          {(referrals ?? []).map((r: any) => (
            <div key={r.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.referee?.display_name ?? r.referee?.email ?? "New user"}</div>
                <div className="text-xs text-muted-foreground">
                  Joined {new Date(r.created_at).toLocaleDateString()}
                  {r.credited_at ? ` • credited ${new Date(r.credited_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {r.status === "credited" && <span className="text-sm font-semibold text-primary">+{money(r.reward_amount)}</span>}
                <StatusPill status={r.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-5 shadow-card ${highlight ? "bg-gradient-primary text-primary-foreground" : "bg-gradient-card"}`}>
      <div className="flex items-center justify-between">
        <div className={`text-xs uppercase tracking-wider ${highlight ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
        <Icon className={`h-4 w-4 ${highlight ? "opacity-80" : "text-muted-foreground"}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    credited: "bg-success/20 text-success",
    rejected: "bg-destructive/20 text-destructive",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { claimFirstAdmin } from "@/lib/api/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, isAdmin } = useAuth();
  const claim = useServerFn(claimFirstAdmin);
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const { data: stats } = useQuery({
    queryKey: ["dash-stats", user?.id], enabled: !!user,
    queryFn: async () => {
      const subs = await supabase.from("task_submissions").select("status").eq("user_id", user!.id);
      const all = subs.data ?? [];
      return {
        completed: all.filter((s) => s.status === "approved").length,
        pending: all.filter((s) => s.status === "pending").length,
        rejected: all.filter((s) => s.status === "rejected").length,
      };
    },
  });
  const { data: recent } = useQuery({
    queryKey: ["recent-subs", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("task_submissions").select("*, task:tasks(title,reward_amount)").eq("user_id", user!.id).order("created_at", { descending: true }).limit(8)).data ?? [],
  });

  async function handleClaim() {
    try { await claim({}); toast.success("You are now admin!"); location.reload(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Welcome back, {profile?.display_name ?? "friend"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Here's how you're doing.</p>
        </div>
        {!isAdmin && (
          <Button variant="outline" size="sm" onClick={handleClaim}>Claim first admin</Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available" value={money(profile?.balance_available)} highlight />
        <StatCard label="Pending" value={money(profile?.balance_pending)} />
        <StatCard label="Total earned" value={money(profile?.total_earned)} />
        <StatCard label="Tasks done" value={String(stats?.completed ?? 0)} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Recent activity</h2>
            <Link to="/tasks" className="text-xs text-primary hover:underline">Browse tasks →</Link>
          </div>
          <div className="divide-y divide-border/50">
            {(recent ?? []).length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No submissions yet. <Link to="/tasks" className="text-primary underline">Try a task</Link></div>}
            {(recent ?? []).map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.task?.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-primary">{money(s.task?.reward_amount)}</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-glow">
          <div className="text-xs uppercase tracking-wider opacity-80">Ready to earn?</div>
          <div className="font-display text-2xl font-bold mt-1">New tasks waiting</div>
          <p className="text-sm opacity-80 mt-2">Fresh campaigns added daily.</p>
          <Link to="/tasks" className="mt-6 inline-block">
            <Button variant="secondary" size="sm">Browse tasks →</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-5 shadow-card ${highlight ? "bg-gradient-primary text-primary-foreground" : "bg-gradient-card"}`}>
      <div className={`text-xs uppercase tracking-wider ${highlight ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    approved: "bg-success/20 text-success",
    rejected: "bg-destructive/20 text-destructive",
    processed: "bg-success/20 text-success",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

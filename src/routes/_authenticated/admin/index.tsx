import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({ component: AdminOverview });

function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, tasks, subs, wds] = await Promise.all([
        supabase.from("profiles").select("balance_available,total_earned", { count: "exact" }),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("task_submissions").select("status", { count: "exact" }).eq("status", "pending"),
        supabase.from("withdrawals").select("amount,status").eq("status", "pending"),
      ]);
      const totalPaid = (users.data ?? []).reduce((a, b) => a + Number(b.total_earned ?? 0), 0);
      const pendingWd = (wds.data ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0);
      return {
        users: users.count ?? 0,
        activeTasks: tasks.count ?? 0,
        pendingSubs: subs.count ?? 0,
        pendingWdAmt: pendingWd,
        totalPaid,
      };
    },
  });
  const { data: logs } = useQuery({
    queryKey: ["audit-recent"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { descending: true }).limit(20)).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Users" v={String(stats?.users ?? 0)} />
        <Stat label="Active tasks" v={String(stats?.activeTasks ?? 0)} />
        <Stat label="Pending review" v={String(stats?.pendingSubs ?? 0)} />
        <Stat label="Withdrawals pending" v={money(stats?.pendingWdAmt)} />
        <Stat label="Total paid out" v={money(stats?.totalPaid)} />
      </div>
      <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold mb-4">Recent audit log</h2>
        <div className="divide-y divide-border/50 text-sm">
          {(logs ?? []).map((l) => (
            <div key={l.id} className="py-2 flex items-center justify-between">
              <div><span className="font-mono text-xs text-primary">{l.action}</span> <span className="text-muted-foreground">{l.target_type}/{l.target_id?.slice(0, 8)}</span></div>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </div>
          ))}
          {(logs ?? []).length === 0 && <div className="text-muted-foreground py-4">No actions yet.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return <div className="rounded-2xl bg-gradient-card border border-border p-5 shadow-card">
    <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="mt-2 font-display text-2xl font-bold">{v}</div>
  </div>;
}

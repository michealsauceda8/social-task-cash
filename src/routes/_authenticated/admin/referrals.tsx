import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useServerFn } from "@tanstack/react-start";
import { creditReferral, rejectReferral, deleteReferral } from "@/lib/api/referrals.functions";
import { saveSetting } from "@/lib/api/admin.functions";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { Download, Search, Trash2, Check, X, Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  head: () => ({ meta: [{ title: "Referrals CMS — TaskPay" }] }),
  component: AdminReferrals,
});

function AdminReferrals() {
  const qc = useQueryClient();
  const credit = useServerFn(creditReferral);
  const reject = useServerFn(rejectReferral);
  const remove = useServerFn(deleteReferral);
  const setSetting = useServerFn(saveSetting);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "pending" | "credited" | "rejected">("all");

  const { data: settings } = useQuery({
    queryKey: ["referral-settings"],
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

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [reward, setReward] = useState<string>("");

  const effectiveEnabled = enabled ?? settings?.enabled ?? true;
  const effectiveReward = reward !== "" ? reward : String(settings?.reward ?? 1);

  const { data: rows } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select(`
          id,status,reward_amount,created_at,credited_at,
          referrer:profiles!referrals_referrer_id_fkey(id,display_name,email,referral_code),
          referee:profiles!referrals_referee_id_fkey(id,display_name,email)
        `)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["referral-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id,action,created_at,details,target_id,actor_id")
        .eq("target_type", "referral")
        .order("created_at", { ascending: false })
        .limit(40);
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return (rows ?? []).filter((r: any) => {
      if (status !== "all" && r.status !== status) return false;
      if (!s) return true;
      return (
        r.referrer?.email?.toLowerCase().includes(s) ||
        r.referrer?.display_name?.toLowerCase().includes(s) ||
        r.referrer?.referral_code?.toLowerCase().includes(s) ||
        r.referee?.email?.toLowerCase().includes(s) ||
        r.referee?.display_name?.toLowerCase().includes(s)
      );
    });
  }, [rows, q, status]);

  const totals = useMemo(() => {
    const all = rows ?? [];
    return {
      total: all.length,
      pending: all.filter((r: any) => r.status === "pending").length,
      credited: all.filter((r: any) => r.status === "credited").length,
      rejected: all.filter((r: any) => r.status === "rejected").length,
      paid: all.reduce((s: number, r: any) => (r.status === "credited" ? s + Number(r.reward_amount ?? 0) : s), 0),
    };
  }, [rows]);

  async function saveSettings() {
    try {
      await setSetting({ data: { key: "referral_enabled", value: effectiveEnabled } });
      await setSetting({ data: { key: "referral_reward", value: Number(effectiveReward) } });
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["referral-settings"] });
      qc.invalidateQueries({ queryKey: ["referral-settings-public"] });
    } catch (e: any) { toast.error(e.message); }
  }

  async function doCredit(id: string) {
    try { await credit({ data: { id } }); toast.success("Credited"); qc.invalidateQueries({ queryKey: ["admin-referrals"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doReject(id: string) {
    try { await reject({ data: { id } }); toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["admin-referrals"] }); }
    catch (e: any) { toast.error(e.message); }
  }
  async function doDelete(id: string) {
    if (!confirm("Delete this referral record?")) return;
    try { await remove({ data: { id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-referrals"] }); }
    catch (e: any) { toast.error(e.message); }
  }

  function exportCSV() {
    const header = ["id","status","reward_amount","created_at","credited_at","referrer_email","referrer_code","referee_email"];
    const lines = [header.join(",")];
    for (const r of filtered as any[]) {
      const row = [
        r.id, r.status, r.reward_amount ?? 0, r.created_at, r.credited_at ?? "",
        r.referrer?.email ?? "", r.referrer?.referral_code ?? "", r.referee?.email ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(row.join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `referrals-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Program settings</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <div className="font-medium text-sm">Program enabled</div>
              <div className="text-xs text-muted-foreground">Toggle off to pause new credits.</div>
            </div>
            <Switch checked={effectiveEnabled} onCheckedChange={(v) => setEnabled(v)} />
          </div>
          <div>
            <Label>Reward per successful referral ($)</Label>
            <Input type="number" min={0} step="0.01" value={effectiveReward} onChange={(e) => setReward(e.target.value)} />
          </div>
          <Button onClick={saveSettings} className="bg-gradient-primary text-primary-foreground shadow-glow">Save settings</Button>
        </div>
        <div className="text-xs text-muted-foreground mt-3">
          Rule: reward is auto-credited when the invited user's <strong>first task submission</strong> is approved.
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Total" value={String(totals.total)} />
        <Stat label="Pending" value={String(totals.pending)} />
        <Stat label="Credited" value={String(totals.credited)} />
        <Stat label="Rejected" value={String(totals.rejected)} />
        <Stat label="Total paid out" value={money(totals.paid)} highlight />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email, name, or code" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["all","pending","credited","rejected"] as const).map((s) => (
            <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s}</Button>
          ))}
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-gradient-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Referrer</th>
                <th className="px-4 py-3 text-left">Referee</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Reward</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((r: any) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.referrer?.display_name ?? r.referrer?.email}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.referrer?.referral_code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.referee?.display_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.referee?.email}</div>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold">{r.status === "credited" ? money(r.reward_amount) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => doCredit(r.id)} className="bg-success text-success-foreground"><Check className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => doReject(r.id)}><X className="h-3.5 w-3.5" /></Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => doDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No referrals match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity log */}
      <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold mb-3">Activity log</h2>
        <div className="divide-y divide-border/50 text-sm">
          {(logs ?? []).length === 0 && <div className="py-6 text-center text-muted-foreground">No activity yet.</div>}
          {(logs ?? []).map((l: any) => (
            <div key={l.id} className="py-2 flex items-center justify-between gap-3">
              <div>
                <span className="font-medium">{l.action}</span>
                <span className="text-xs text-muted-foreground ml-2">{l.target_id}</span>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border border-border p-4 shadow-card ${highlight ? "bg-gradient-primary text-primary-foreground" : "bg-gradient-card"}`}>
      <div className={`text-xs uppercase tracking-wider ${highlight ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
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

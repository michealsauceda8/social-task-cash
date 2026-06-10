import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { reviewWithdrawal } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { StatusBadge } from "../dashboard";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({ component: AdminWD });

function AdminWD() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "processed">("pending");
  const qc = useQueryClient();
  const review = useServerFn(reviewWithdrawal);
  const { data } = useQuery({
    queryKey: ["admin-wd", filter],
    queryFn: async () => (await supabase.from("withdrawals").select("*, profile:profiles!withdrawals_user_id_fkey(display_name,email)").eq("status", filter).order("requested_at", { ascending: false })).data ?? [],
  });
  async function act(id: string, action: "approve" | "reject" | "process") {
    const notes = action === "reject" ? (prompt("Reason?") ?? "") : undefined;
    try { await review({ data: { id, action, notes } }); toast.success(action); qc.invalidateQueries(); }
    catch (e: any) { toast.error(e.message); }
  }
  function exportCsv() {
    const rows = ["id,user,amount,method,details,status,requested_at"];
    (data ?? []).forEach((w: any) => rows.push([w.id, w.profile?.email, w.amount, w.method, JSON.stringify(w.details ?? ""), w.status, w.requested_at].join(",")));
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `withdrawals-${filter}.csv`; a.click();
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {(["pending", "approved", "processed", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{s}</button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
      </div>
      <div className="rounded-2xl bg-gradient-card border border-border shadow-card divide-y divide-border/50">
        {(data ?? []).length === 0 && <div className="p-8 text-center text-muted-foreground">No withdrawals</div>}
        {(data ?? []).map((w: any) => (
          <div key={w.id} className="p-4 flex flex-wrap items-center gap-4 justify-between">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{money(w.amount)} <span className="text-xs text-muted-foreground">via {w.method}</span></div>
              <div className="text-xs text-muted-foreground">{w.profile?.email} · {new Date(w.requested_at).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1 break-all">{w.details}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={w.status} />
              {filter === "pending" && (<>
                <Button size="sm" variant="outline" onClick={() => act(w.id, "reject")}>Reject</Button>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => act(w.id, "approve")}>Approve</Button>
              </>)}
              {filter === "approved" && (
                <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => act(w.id, "process")}>Mark processed</Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

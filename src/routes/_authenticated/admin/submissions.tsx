import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { reviewSubmission } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { StatusBadge } from "../dashboard";

export const Route = createFileRoute("/_authenticated/admin/submissions")({ component: AdminSubs });

function AdminSubs() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const qc = useQueryClient();
  const review = useServerFn(reviewSubmission);
  const { data } = useQuery({
    queryKey: ["admin-subs", filter],
    queryFn: async () => (await supabase.from("task_submissions").select("*, task:tasks(title,reward_amount), profile:profiles!task_submissions_user_id_fkey(display_name,email)").eq("status", filter).order("created_at", { descending: true })).data ?? [],
  });
  async function act(id: string, approve: boolean) {
    const notes = approve ? undefined : prompt("Rejection reason?") ?? "Rejected";
    try { await review({ data: { submissionId: id, approve, notes } }); toast.success(approve ? "Approved" : "Rejected"); qc.invalidateQueries(); }
    catch (e: any) { toast.error(e.message); }
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>{s}</button>
        ))}
      </div>
      <div className="rounded-2xl bg-gradient-card border border-border shadow-card divide-y divide-border/50">
        {(data ?? []).length === 0 && <div className="p-8 text-center text-muted-foreground">No submissions</div>}
        {(data ?? []).map((s: any) => (
          <div key={s.id} className="p-4 flex flex-wrap items-center gap-4 justify-between">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{s.task?.title} <span className="text-primary">{money(s.task?.reward_amount)}</span></div>
              <div className="text-xs text-muted-foreground">By {s.profile?.display_name ?? s.profile?.email} · {new Date(s.created_at).toLocaleString()}</div>
              {s.proof_url && <a href={s.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline break-all">{s.proof_url}</a>}
              {s.proof_text && <div className="text-xs text-muted-foreground mt-1 italic">"{s.proof_text}"</div>}
              {s.review_notes && <div className="text-xs text-muted-foreground mt-1">Notes: {s.review_notes}</div>}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={s.status} />
              {filter === "pending" && (
                <>
                  <Button size="sm" variant="outline" onClick={() => act(s.id, false)}>Reject</Button>
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => act(s.id, true)}>Approve</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

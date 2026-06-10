import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money, platformIcon } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({ component: TasksPage });

function TasksPage() {
  const [filter, setFilter] = useState("all");
  const { data: tasks } = useQuery({
    queryKey: ["tasks-active", filter],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").eq("status", "active").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("platform", filter);
      return (await q).data ?? [];
    },
  });
  const platforms = ["all", "youtube", "instagram", "tiktok", "twitter", "facebook", "telegram"];
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Available tasks</h1>
        <p className="text-muted-foreground text-sm mt-1">Complete tasks to earn rewards.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {platforms.map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize whitespace-nowrap border ${filter === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
            {p}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(tasks ?? []).map((t) => <TaskCard key={t.id} task={t} />)}
        {(tasks ?? []).length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No tasks here yet.</div>}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-gradient-card border border-border p-5 shadow-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{platformIcon[task.platform]}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{task.difficulty}</span>
      </div>
      <h3 className="font-semibold leading-tight">{task.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
        <span className="font-display text-2xl font-bold text-primary">{money(task.reward_amount)}</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" className="bg-gradient-primary text-primary-foreground">Do task</Button></DialogTrigger>
          <SubmitDialog task={task} onClose={() => setOpen(false)} />
        </Dialog>
      </div>
    </div>
  );
}

function SubmitDialog({ task, onClose }: { task: any; onClose: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("task_submissions").insert({
        user_id: user.id, task_id: task.id, proof_url: proofUrl || null, proof_text: proofText || null,
      });
      if (error) throw error;
      toast.success("Submitted! Pending review.");
      qc.invalidateQueries();
      onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{task.title}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{task.description}</p>
        {task.target_url && (
          <a href={task.target_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
            Open task <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Reward:</strong> {money(task.reward_amount)} · <strong className="text-foreground">Proof:</strong> {task.proof_type}
          {task.proof_instructions && <div className="mt-1">{task.proof_instructions}</div>}
        </div>
        <div>
          <Label>Proof URL</Label>
          <Input value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Textarea value={proofText} onChange={(e) => setProofText(e.target.value)} rows={2} maxLength={500} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={loading || (!proofUrl && !proofText)} className="bg-gradient-primary text-primary-foreground">
          {loading ? "Submitting..." : "Submit proof"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

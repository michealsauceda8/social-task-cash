import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { upsertTask, deleteTask } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { money } from "@/lib/format";
import { Pencil, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tasks")({ component: AdminTasks });

function AdminTasks() {
  const qc = useQueryClient();
  const del = useServerFn(deleteTask);
  const { data: tasks } = useQuery({
    queryKey: ["admin-tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <TaskEditor trigger={<Button className="bg-gradient-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" />New task</Button>} />
      </div>
      <div className="rounded-2xl bg-gradient-card border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground uppercase">
            <tr><th className="p-3">Title</th><th>Platform</th><th>Reward</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(tasks ?? []).map((t) => (
              <tr key={t.id} className="border-t border-border/50">
                <td className="p-3 font-medium">{t.title}</td>
                <td className="capitalize">{t.platform}</td>
                <td className="text-primary font-semibold">{money(t.reward_amount)}</td>
                <td><span className="text-xs capitalize rounded-full px-2 py-0.5 bg-muted">{t.status}</span></td>
                <td className="text-right pr-3">
                  <TaskEditor task={t} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("Delete this task?")) return;
                    await del({ data: { id: t.id } }); toast.success("Deleted"); qc.invalidateQueries();
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskEditor({ task, trigger }: { task?: any; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const save = useServerFn(upsertTask);
  const [form, setForm] = useState({
    title: task?.title ?? "", description: task?.description ?? "",
    platform: task?.platform ?? "youtube", action: task?.action ?? "like",
    target_url: task?.target_url ?? "", reward_amount: task?.reward_amount ?? 0.5,
    proof_type: task?.proof_type ?? "url", proof_instructions: task?.proof_instructions ?? "",
    status: task?.status ?? "active", per_user_limit: task?.per_user_limit ?? 1,
    difficulty: task?.difficulty ?? "easy",
  });
  function set<K extends keyof typeof form>(k: K, v: any) { setForm((f) => ({ ...f, [k]: v })); }
  async function submit() {
    try {
      await save({ data: { ...(task?.id ? { id: task.id } : {}), ...form, reward_amount: Number(form.reward_amount), per_user_limit: Number(form.per_user_limit) } as any });
      toast.success("Saved"); qc.invalidateQueries(); setOpen(false);
    } catch (e: any) { toast.error(e.message); }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} /></div>
          <div><Label>Platform</Label><Select value={form.platform} onValueChange={(v) => set("platform", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["youtube", "instagram", "tiktok", "twitter", "facebook", "telegram", "other"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Action</Label><Select value={form.action} onValueChange={(v) => set("action", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["view", "like", "subscribe", "follow", "comment", "share"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2"><Label>Target URL</Label><Input value={form.target_url} onChange={(e) => set("target_url", e.target.value)} /></div>
          <div><Label>Reward ($)</Label><Input type="number" step="0.01" value={form.reward_amount} onChange={(e) => set("reward_amount", e.target.value)} /></div>
          <div><Label>Per-user limit</Label><Input type="number" value={form.per_user_limit} onChange={(e) => set("per_user_limit", e.target.value)} /></div>
          <div><Label>Proof type</Label><Select value={form.proof_type} onValueChange={(v) => set("proof_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["url", "screenshot", "text"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Difficulty</Label><Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["easy", "medium", "hard"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["draft", "active", "expired", "archived"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2"><Label>Proof instructions</Label><Textarea value={form.proof_instructions} onChange={(e) => set("proof_instructions", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-gradient-primary text-primary-foreground">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

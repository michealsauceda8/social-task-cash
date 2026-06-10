import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { saveCms, saveFaq, moderateTestimonial, saveSetting } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/cms")({ component: AdminCms });

function AdminCms() {
  return (
    <Tabs defaultValue="copy">
      <TabsList>
        <TabsTrigger value="copy">Landing copy</TabsTrigger>
        <TabsTrigger value="faqs">FAQs</TabsTrigger>
        <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
        <TabsTrigger value="settings">Business rules</TabsTrigger>
      </TabsList>
      <TabsContent value="copy"><CopyEditor /></TabsContent>
      <TabsContent value="faqs"><FaqsEditor /></TabsContent>
      <TabsContent value="testimonials"><TestimonialsMod /></TabsContent>
      <TabsContent value="settings"><SettingsEditor /></TabsContent>
    </Tabs>
  );
}

function CopyEditor() {
  const save = useServerFn(saveCms);
  const { data, refetch } = useQuery({ queryKey: ["cms-all"], queryFn: async () => (await supabase.from("cms_content").select("*")).data ?? [] });
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { setRows(data ?? []); }, [data]);
  return (
    <div className="space-y-4 mt-4">
      {rows.map((r, i) => (
        <div key={r.key} className="rounded-xl bg-gradient-card border border-border p-4 space-y-2">
          <div className="text-xs uppercase text-muted-foreground">{r.key}</div>
          <Input value={r.title ?? ""} onChange={(e) => { const c = [...rows]; c[i].title = e.target.value; setRows(c); }} placeholder="Title" />
          <Textarea value={r.body ?? ""} onChange={(e) => { const c = [...rows]; c[i].body = e.target.value; setRows(c); }} rows={3} />
          <Button size="sm" onClick={async () => { await save({ data: { key: r.key, title: r.title, body: r.body } }); toast.success("Saved"); refetch(); }}>Save</Button>
        </div>
      ))}
    </div>
  );
}

function FaqsEditor() {
  const qc = useQueryClient();
  const save = useServerFn(saveFaq);
  const { data } = useQuery({ queryKey: ["faqs-admin"], queryFn: async () => (await supabase.from("faqs").select("*").order("sort_order")).data ?? [] });
  const [q, setQ] = useState(""); const [a, setA] = useState("");
  return (
    <div className="space-y-4 mt-4">
      <div className="rounded-xl bg-gradient-card border border-border p-4 space-y-2">
        <Label>Add FAQ</Label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question" />
        <Textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Answer" rows={2} />
        <Button size="sm" onClick={async () => { if (!q || !a) return; await save({ data: { question: q, answer: a, sort_order: (data?.length ?? 0) + 1 } }); setQ(""); setA(""); qc.invalidateQueries(); }}>Add</Button>
      </div>
      {(data ?? []).map((f) => (
        <div key={f.id} className="rounded-xl bg-gradient-card border border-border p-4 flex items-start justify-between gap-3">
          <div><div className="font-semibold">{f.question}</div><div className="text-sm text-muted-foreground">{f.answer}</div></div>
          <Button size="sm" variant="ghost" onClick={async () => { await save({ data: { id: f.id, question: f.question, answer: f.answer, sort_order: f.sort_order, delete: true } }); qc.invalidateQueries(); }}>Delete</Button>
        </div>
      ))}
    </div>
  );
}

function TestimonialsMod() {
  const qc = useQueryClient();
  const mod = useServerFn(moderateTestimonial);
  const { data } = useQuery({ queryKey: ["test-all"], queryFn: async () => (await supabase.from("testimonials").select("*").order("created_at", { ascending: false })).data ?? [] });
  return (
    <div className="space-y-3 mt-4">
      {(data ?? []).map((t) => (
        <div key={t.id} className="rounded-xl bg-gradient-card border border-border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold">{t.author_name} <span className="text-xs text-muted-foreground">{t.author_role}</span></div>
            <p className="text-sm mt-1">"{t.content}"</p>
            <span className={`text-xs ${t.approved ? "text-success" : "text-warning"}`}>{t.approved ? "Approved" : "Pending"}</span>
          </div>
          <div className="flex gap-1">
            {!t.approved && <Button size="sm" onClick={async () => { await mod({ data: { id: t.id, approve: true } }); qc.invalidateQueries(); }}>Approve</Button>}
            <Button size="sm" variant="ghost" onClick={async () => { await mod({ data: { id: t.id, approve: false, delete: true } }); qc.invalidateQueries(); }}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsEditor() {
  const save = useServerFn(saveSetting);
  const { data, refetch } = useQuery({ queryKey: ["settings-all"], queryFn: async () => (await supabase.from("app_settings").select("*")).data ?? [] });
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { setRows(data ?? []); }, [data]);
  return (
    <div className="space-y-3 mt-4">
      {rows.map((r, i) => (
        <div key={r.key} className="rounded-xl bg-gradient-card border border-border p-4 flex items-center gap-3">
          <div className="font-mono text-xs flex-1">{r.key}</div>
          <Input value={String(r.value)} onChange={(e) => { const c = [...rows]; c[i].value = e.target.value; setRows(c); }} className="max-w-xs" />
          <Button size="sm" onClick={async () => {
            const v = isNaN(Number(r.value)) ? r.value : Number(r.value);
            await save({ data: { key: r.key, value: v } }); toast.success("Saved"); refetch();
          }}>Save</Button>
        </div>
      ))}
    </div>
  );
}

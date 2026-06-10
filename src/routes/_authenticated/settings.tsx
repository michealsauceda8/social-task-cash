import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const { data: profile, refetch } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => { if (profile) { setName(profile.display_name ?? ""); setBio(profile.bio ?? ""); } }, [profile]);

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ display_name: name, bio }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); refetch(); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card space-y-4">
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
        <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} /></div>
        <Button onClick={save} className="bg-gradient-primary text-primary-foreground">Save changes</Button>
      </div>
    </div>
  );
}

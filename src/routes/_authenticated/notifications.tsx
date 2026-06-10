import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotifPage });

function NotifPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications-full", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function markAll() {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    qc.invalidateQueries();
  }
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>
      </div>
      <div className="rounded-2xl bg-gradient-card border border-border shadow-card divide-y divide-border/50">
        {(data ?? []).length === 0 && <div className="p-8 text-center text-muted-foreground">No notifications</div>}
        {(data ?? []).map((n) => (
          <div key={n.id} className={`p-4 ${!n.read ? "bg-primary/5" : ""}`}>
            <div className="font-semibold">{n.title}</div>
            {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
            <div className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

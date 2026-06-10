import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { adjustBalance, setUserStatus, setUserRole } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/users")({ component: AdminUsers });

function AdminUsers() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const adjust = useServerFn(adjustBalance);
  const setStatus = useServerFn(setUserStatus);
  const setRole = useServerFn(setUserRole);

  const { data } = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let qb = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
      if (q) qb = qb.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
      return (await qb).data ?? [];
    },
  });

  async function adj(userId: string) {
    const s = prompt("Amount to add (negative to subtract):");
    if (!s) return;
    const reason = prompt("Reason:") ?? "Admin adjustment";
    try { await adjust({ data: { userId, delta: Number(s), reason } }); toast.success("Adjusted"); qc.invalidateQueries(); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Search by email or name…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="rounded-2xl bg-gradient-card border border-border shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground uppercase">
            <tr><th className="p-3">User</th><th>Balance</th><th>Earned</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {(data ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border/50">
                <td className="p-3"><div className="font-medium">{u.display_name}</div><div className="text-xs text-muted-foreground">{u.email}</div></td>
                <td className="text-primary font-semibold">{money(u.balance_available)}</td>
                <td>{money(u.total_earned)}</td>
                <td><span className={`text-xs rounded-full px-2 py-0.5 ${u.status === "active" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{u.status}</span></td>
                <td className="text-right pr-3 space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => adj(u.id)}>±$</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    const newS = u.status === "active" ? "suspended" : "active";
                    await setStatus({ data: { userId: u.id, status: newS } }); toast.success(newS); qc.invalidateQueries();
                  }}>{u.status === "active" ? "Suspend" : "Activate"}</Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await setRole({ data: { userId: u.id, role: "admin", grant: true } }); toast.success("Granted admin"); qc.invalidateQueries();
                  }}>Make admin</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { requestWithdrawal } from "@/lib/api/admin.functions";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "./dashboard";

export const Route = createFileRoute("/_authenticated/withdraw")({ component: WithdrawPage });

function WithdrawPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const req = useServerFn(requestWithdrawal);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("paypal");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).single()).data,
  });
  const { data: minSetting } = useQuery({
    queryKey: ["min-wd"],
    queryFn: async () => Number((await supabase.from("app_settings").select("value").eq("key", "min_withdrawal").single()).data?.value ?? 10),
  });
  const { data: history } = useQuery({
    queryKey: ["wd-history", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("withdrawals").select("*").eq("user_id", user!.id).order("requested_at", { descending: true })).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await req({ data: { amount: Number(amount), method, details } });
      toast.success("Withdrawal requested");
      setAmount(""); setDetails("");
      qc.invalidateQueries();
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Withdraw</h1>
        <p className="text-muted-foreground text-sm mt-1">Cash out your earnings.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Available</div>
          <div className="font-display text-4xl font-bold text-primary mt-2">{money(profile?.balance_available)}</div>
          <div className="text-xs text-muted-foreground mt-1">Pending: {money(profile?.balance_pending)} · Min: {money(minSetting)}</div>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required min={minSetting} max={profile?.balance_available ?? 0} />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank">Bank transfer</SelectItem>
                  <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payout details</Label>
              <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="PayPal email, wallet, or bank info" required minLength={2} maxLength={500} rows={2} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
              {loading ? "..." : "Request withdrawal"}
            </Button>
          </form>
        </div>
        <div className="rounded-2xl bg-gradient-card border border-border p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold mb-4">History</h2>
          {(history ?? []).length === 0 && <div className="text-sm text-muted-foreground text-center py-8">No withdrawals yet.</div>}
          <div className="divide-y divide-border/50">
            {(history ?? []).map((w) => (
              <div key={w.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{money(w.amount)} <span className="text-xs text-muted-foreground">· {w.method}</span></div>
                  <div className="text-xs text-muted-foreground">{new Date(w.requested_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={w.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

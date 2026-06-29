import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("admin")) throw new Error("Forbidden: admin access required");
}

async function notify(admin: any, userId: string, type: string, title: string, body?: string) {
  await admin.from("notifications").insert({ user_id: userId, type, title, body });
}

async function logAction(admin: any, actorId: string, action: string, targetId: string, details: any) {
  await admin.from("audit_logs").insert({ actor_id: actorId, action, target_type: "referral", target_id: targetId, details });
}

/* ---- credit a single referral (admin or system) ---- */
export const creditReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ref } = await supabaseAdmin.from("referrals").select("*").eq("id", data.id).single();
    if (!ref) throw new Error("Referral not found");
    if (ref.status === "credited") throw new Error("Already credited");

    const { data: setting } = await supabaseAdmin
      .from("app_settings").select("value").eq("key", "referral_reward").single();
    const reward = Number((setting?.value as any) ?? 1);

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("balance_available,total_earned").eq("id", ref.referrer_id).single();

    await supabaseAdmin.from("profiles").update({
      balance_available: Number(prof?.balance_available ?? 0) + reward,
      total_earned: Number(prof?.total_earned ?? 0) + reward,
    }).eq("id", ref.referrer_id);

    await supabaseAdmin.from("referrals").update({
      status: "credited",
      reward_amount: reward,
      credited_at: new Date().toISOString(),
    }).eq("id", ref.id);

    await notify(supabaseAdmin, ref.referrer_id, "referral_credited",
      `Referral bonus: +$${reward.toFixed(2)}`, "A friend you invited reached the reward milestone.");
    await logAction(supabaseAdmin, context.userId, "referral.credited", ref.id, { reward });
    return { ok: true };
  });

export const rejectReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; reason?: string }) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(300).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("referrals").update({ status: "rejected" }).eq("id", data.id);
    await logAction(supabaseAdmin, context.userId, "referral.rejected", data.id, { reason: data.reason ?? null });
    return { ok: true };
  });

export const deleteReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("referrals").delete().eq("id", data.id);
    await logAction(supabaseAdmin, context.userId, "referral.deleted", data.id, {});
    return { ok: true };
  });

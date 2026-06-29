import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdminOrMod(supabase: any, userId: string, modOk = false) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (roles.includes("admin")) return "admin";
  if (modOk && roles.includes("moderator")) return "moderator";
  throw new Error("Forbidden: admin access required");
}

async function notify(admin: any, userId: string, type: string, title: string, body?: string) {
  await admin.from("notifications").insert({ user_id: userId, type, title, body });
}

async function logAction(admin: any, actorId: string, action: string, targetType: string, targetId: string, details: any) {
  await admin.from("audit_logs").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, details });
}

/* ====================== SUBMISSIONS ====================== */
export const reviewSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { submissionId: string; approve: boolean; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error } = await supabaseAdmin
      .from("task_submissions")
      .select("*, task:tasks(reward_amount,title)")
      .eq("id", data.submissionId)
      .single();
    if (error || !sub) throw new Error("Submission not found");
    if (sub.status !== "pending") throw new Error("Already reviewed");

    const reward = Number(sub.task?.reward_amount ?? 0);
    const newStatus = data.approve ? "approved" : "rejected";

    await supabaseAdmin
      .from("task_submissions")
      .update({
        status: newStatus,
        reviewer_id: context.userId,
        review_notes: data.notes ?? null,
        reward_amount: data.approve ? reward : 0,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.submissionId);

    if (data.approve) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("balance_available,total_earned,referred_by")
        .eq("id", sub.user_id)
        .single();
      await supabaseAdmin
        .from("profiles")
        .update({
          balance_available: Number(prof?.balance_available ?? 0) + reward,
          total_earned: Number(prof?.total_earned ?? 0) + reward,
        })
        .eq("id", sub.user_id);

      // Referral payout — auto-credit on the user's FIRST approved task
      if (prof?.referred_by) {
        const { count: priorApproved } = await supabaseAdmin
          .from("task_submissions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sub.user_id)
          .eq("status", "approved")
          .neq("id", data.submissionId);

        if ((priorApproved ?? 0) === 0) {
          const { data: refRow } = await supabaseAdmin
            .from("referrals")
            .select("id,status,referrer_id")
            .eq("referee_id", sub.user_id)
            .maybeSingle();

          const { data: enabled } = await supabaseAdmin
            .from("app_settings").select("value").eq("key", "referral_enabled").single();
          const { data: rewardSetting } = await supabaseAdmin
            .from("app_settings").select("value").eq("key", "referral_reward").single();
          const refReward = Number((rewardSetting?.value as any) ?? 1);
          const isEnabled = (enabled?.value as any) !== false;

          if (refRow && refRow.status === "pending" && isEnabled && refReward > 0) {
            const { data: refProf } = await supabaseAdmin
              .from("profiles")
              .select("balance_available,total_earned")
              .eq("id", refRow.referrer_id)
              .single();
            await supabaseAdmin.from("profiles").update({
              balance_available: Number(refProf?.balance_available ?? 0) + refReward,
              total_earned: Number(refProf?.total_earned ?? 0) + refReward,
            }).eq("id", refRow.referrer_id);
            await supabaseAdmin.from("referrals").update({
              status: "credited",
              reward_amount: refReward,
              credited_at: new Date().toISOString(),
            }).eq("id", refRow.id);
            await notify(supabaseAdmin, refRow.referrer_id, "referral_credited",
              `Referral bonus: +$${refReward.toFixed(2)}`,
              "A friend you invited just completed their first task!");
          }
        }
      }
    }


    await notify(
      supabaseAdmin,
      sub.user_id,
      data.approve ? "task_approved" : "task_rejected",
      data.approve ? `Task approved: +$${reward.toFixed(2)}` : `Task rejected`,
      data.approve ? `Your submission for "${sub.task?.title}" was approved.` : (data.notes ?? "See review notes."),
    );
    await logAction(supabaseAdmin, context.userId, `submission.${newStatus}`, "task_submission", data.submissionId, { reward });
    return { ok: true };
  });

/* ====================== TASKS ====================== */
const taskInput = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(120),
  description: z.string().min(2).max(2000),
  platform: z.enum(["youtube", "instagram", "tiktok", "twitter", "facebook", "telegram", "other"]),
  action: z.enum(["view", "like", "subscribe", "follow", "comment", "share"]),
  target_url: z.string().url().or(z.literal("")).nullable().optional(),
  reward_amount: z.number().min(0).max(10000),
  proof_type: z.enum(["url", "screenshot", "text"]),
  proof_instructions: z.string().max(500).optional().nullable(),
  status: z.enum(["draft", "active", "expired", "archived"]),
  per_user_limit: z.number().int().min(1).max(1000),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const upsertTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = { ...data, created_by: context.userId };
    if (data.id) {
      const { id, ...patch } = row as any;
      await supabaseAdmin.from("tasks").update(patch).eq("id", id);
      await logAction(supabaseAdmin, context.userId, "task.update", "task", id, {});
      return { id };
    }
    const { data: created } = await supabaseAdmin.from("tasks").insert(row).select("id").single();
    await logAction(supabaseAdmin, context.userId, "task.create", "task", created!.id, {});
    return { id: created!.id };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("tasks").delete().eq("id", data.id);
    await logAction(supabaseAdmin, context.userId, "task.delete", "task", data.id, {});
    return { ok: true };
  });

/* ====================== WITHDRAWALS ====================== */
export const reviewWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; action: "approve" | "reject" | "process"; notes?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: wd } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).single();
    if (!wd) throw new Error("Not found");

    let status: "approved" | "rejected" | "processed" = "approved";
    if (data.action === "reject") status = "rejected";
    if (data.action === "process") status = "processed";

    await supabaseAdmin
      .from("withdrawals")
      .update({
        status,
        admin_id: context.userId,
        notes: data.notes ?? wd.notes,
        processed_at: status === "processed" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);

    if (data.action === "reject") {
      // refund pending balance back to available
      const { data: prof } = await supabaseAdmin.from("profiles").select("balance_available,balance_pending").eq("id", wd.user_id).single();
      await supabaseAdmin.from("profiles").update({
        balance_available: Number(prof?.balance_available ?? 0) + Number(wd.amount),
        balance_pending: Math.max(0, Number(prof?.balance_pending ?? 0) - Number(wd.amount)),
      }).eq("id", wd.user_id);
    } else if (data.action === "process") {
      // remove pending
      const { data: prof } = await supabaseAdmin.from("profiles").select("balance_pending").eq("id", wd.user_id).single();
      await supabaseAdmin.from("profiles").update({
        balance_pending: Math.max(0, Number(prof?.balance_pending ?? 0) - Number(wd.amount)),
      }).eq("id", wd.user_id);
    }
    await notify(supabaseAdmin, wd.user_id, `withdrawal_${status}`, `Withdrawal ${status}`, `Amount: $${Number(wd.amount).toFixed(2)}`);
    await logAction(supabaseAdmin, context.userId, `withdrawal.${status}`, "withdrawal", data.id, {});
    return { ok: true };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { amount: number; method: string; details: string }) =>
    z.object({ amount: z.number().min(1), method: z.string().min(2), details: z.string().min(2).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("balance_available,balance_pending,status")
      .eq("id", context.userId)
      .single();
    if (!prof || prof.status !== "active") throw new Error("Account not active");
    const { data: setting } = await supabaseAdmin.from("app_settings").select("value").eq("key", "min_withdrawal").single();
    const min = Number(setting?.value ?? 10);
    if (data.amount < min) throw new Error(`Minimum withdrawal is $${min}`);
    if (Number(prof.balance_available) < data.amount) throw new Error("Insufficient balance");

    await supabaseAdmin.from("withdrawals").insert({
      user_id: context.userId,
      amount: data.amount,
      method: data.method,
      details: data.details,
    });
    await supabaseAdmin.from("profiles").update({
      balance_available: Number(prof.balance_available) - data.amount,
      balance_pending: Number(prof.balance_pending) + data.amount,
    }).eq("id", context.userId);
    await notify(supabaseAdmin, context.userId, "withdrawal_requested", "Withdrawal requested", `Pending approval: $${data.amount.toFixed(2)}`);
    return { ok: true };
  });

/* ====================== USERS ====================== */
export const adjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; delta: number; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin.from("profiles").select("balance_available").eq("id", data.userId).single();
    if (!prof) throw new Error("User not found");
    const newBal = Math.max(0, Number(prof.balance_available) + data.delta);
    await supabaseAdmin.from("profiles").update({ balance_available: newBal }).eq("id", data.userId);
    await notify(supabaseAdmin, data.userId, "balance_adjusted", `Balance ${data.delta >= 0 ? "credited" : "debited"}`, `$${Math.abs(data.delta).toFixed(2)} — ${data.reason}`);
    await logAction(supabaseAdmin, context.userId, "user.balance_adjust", "user", data.userId, { delta: data.delta, reason: data.reason });
    return { ok: true, balance: newBal };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; status: "active" | "suspended" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ status: data.status }).eq("id", data.userId);
    await notify(supabaseAdmin, data.userId, "status_change", `Account ${data.status}`);
    await logAction(supabaseAdmin, context.userId, `user.${data.status}`, "user", data.userId, {});
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "moderator" | "user"; grant: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role }).select();
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    }
    await logAction(supabaseAdmin, context.userId, `role.${data.grant ? "grant" : "revoke"}`, "user", data.userId, { role: data.role });
    return { ok: true };
  });

/* ====================== CMS ====================== */
export const saveCms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; title?: string; body?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("cms_content").upsert({
      key: data.key, title: data.title ?? null, body: data.body ?? null,
      updated_by: context.userId, updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });

export const saveFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; question: string; answer: string; sort_order: number; delete?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.delete && data.id) {
      await supabaseAdmin.from("faqs").delete().eq("id", data.id);
      return { ok: true };
    }
    if (data.id) await supabaseAdmin.from("faqs").update({ question: data.question, answer: data.answer, sort_order: data.sort_order }).eq("id", data.id);
    else await supabaseAdmin.from("faqs").insert({ question: data.question, answer: data.answer, sort_order: data.sort_order });
    return { ok: true };
  });

export const moderateTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; approve: boolean; delete?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.delete) await supabaseAdmin.from("testimonials").delete().eq("id", data.id);
    else await supabaseAdmin.from("testimonials").update({ approved: data.approve }).eq("id", data.id);
    return { ok: true };
  });

export const saveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) => d)
  .handler(async ({ data, context }) => {
    await assertAdminOrMod(context.supabase, context.userId, false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("app_settings").upsert({ key: data.key, value: data.value as any, updated_at: new Date().toISOString() });
    return { ok: true };
  });

/* ====================== BOOTSTRAP ADMIN ====================== */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists");
    await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    await logAction(supabaseAdmin, context.userId, "admin.claim_first", "user", context.userId, {});
    return { ok: true };
  });

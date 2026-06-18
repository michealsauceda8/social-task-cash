
-- Restrict profile reads: remove moderator access to financial/payout fields
DROP POLICY IF EXISTS "Profiles: read own or admin" ON public.profiles;
CREATE POLICY "Profiles: read own or admin"
  ON public.profiles FOR SELECT TO authenticated
  USING ((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Restrict task_submissions reads: remove moderator access (hides IP addresses)
DROP POLICY IF EXISTS "Subs: own select" ON public.task_submissions;
CREATE POLICY "Subs: own select"
  ON public.task_submissions FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Keep moderator UPDATE on submissions but restrict it to admin only as well,
-- since they no longer have read access. Admins still review.
DROP POLICY IF EXISTS "Subs: admin/mod update" ON public.task_submissions;
CREATE POLICY "Subs: admin update"
  ON public.task_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Explicit admin-only write policies on user_roles to prevent privilege escalation
CREATE POLICY "Roles: admin insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Roles: admin update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Roles: admin delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Withdrawals: explicit admin-only DELETE; users cannot modify after submission
-- (no owner UPDATE policy exists, so default-deny applies, but make DELETE explicit)
CREATE POLICY "WD: admin delete"
  ON public.withdrawals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Lock down has_role execution to authenticated only (revoke from anon/public)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

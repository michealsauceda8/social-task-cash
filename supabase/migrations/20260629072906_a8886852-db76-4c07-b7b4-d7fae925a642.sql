
CREATE POLICY "Referrer can view referee basic profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (referred_by = auth.uid());

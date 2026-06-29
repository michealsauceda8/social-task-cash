
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  tries int := 0;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text || tries::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
    tries := tries + 1;
    IF tries > 20 THEN EXIT; END IF;
  END LOOP;
  RETURN code;
END;
$$;

UPDATE public.profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credited','rejected')),
  reward_amount numeric NOT NULL DEFAULT 0,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own or admin referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referee_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins manage referrals"
  ON public.referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_code text;
  v_referrer_id uuid;
BEGIN
  v_ref_code := NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), '');
  IF v_ref_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = upper(v_ref_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)),
    public.generate_referral_code(),
    v_referrer_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  IF v_referrer_id IS NOT NULL AND v_referrer_id <> NEW.id THEN
    INSERT INTO public.referrals (referrer_id, referee_id, status)
    VALUES (v_referrer_id, NEW.id, 'pending')
    ON CONFLICT (referee_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO public.app_settings (key, value)
VALUES
  ('referral_enabled', 'true'::jsonb),
  ('referral_reward', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.referrals (referrer_id, referee_id, status)
SELECT referred_by, id, 'pending'
FROM public.profiles
WHERE referred_by IS NOT NULL
ON CONFLICT (referee_id) DO NOTHING;

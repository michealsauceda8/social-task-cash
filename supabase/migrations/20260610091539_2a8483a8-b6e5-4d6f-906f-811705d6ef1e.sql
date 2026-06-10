
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.task_platform AS ENUM ('youtube','instagram','tiktok','twitter','facebook','telegram','other');
CREATE TYPE public.task_action AS ENUM ('view','like','subscribe','follow','comment','share');
CREATE TYPE public.proof_type AS ENUM ('url','screenshot','text');
CREATE TYPE public.task_status AS ENUM ('draft','active','expired','archived');
CREATE TYPE public.submission_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('pending','approved','rejected','processed');
CREATE TYPE public.user_status AS ENUM ('active','suspended');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT,
  status public.user_status NOT NULL DEFAULT 'active',
  balance_available NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance_pending NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  payout_method TEXT,
  payout_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Profiles: read own or admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Profiles: insert self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles: admin all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  platform public.task_platform NOT NULL,
  action public.task_action NOT NULL,
  target_url TEXT,
  reward_amount NUMERIC(10,2) NOT NULL CHECK (reward_amount >= 0),
  proof_type public.proof_type NOT NULL DEFAULT 'url',
  proof_instructions TEXT,
  status public.task_status NOT NULL DEFAULT 'draft',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  per_user_limit INT NOT NULL DEFAULT 1,
  total_payout_cap NUMERIC(12,2),
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks: users see active" ON public.tasks FOR SELECT TO authenticated
  USING (status = 'active' OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Tasks: admin all" ON public.tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TASK SUBMISSIONS ============
CREATE TABLE public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  proof_url TEXT,
  proof_text TEXT,
  status public.submission_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.task_submissions TO authenticated;
GRANT ALL ON public.task_submissions TO service_role;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subs: own select" ON public.task_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Subs: own insert" ON public.task_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Subs: admin/mod update" ON public.task_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- ============ WITHDRAWALS ============
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  details TEXT,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_id UUID REFERENCES auth.users(id),
  notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "WD: own select" ON public.withdrawals FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "WD: own insert" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "WD: admin update" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notif: own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Notif: own update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit: admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ CMS CONTENT (landing copy) ============
CREATE TABLE public.cms_content (
  key TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  metadata JSONB,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cms_content TO anon, authenticated;
GRANT ALL ON public.cms_content TO service_role;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CMS: public read" ON public.cms_content FOR SELECT USING (true);
CREATE POLICY "CMS: admin write" ON public.cms_content FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TESTIMONIALS ============
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_role TEXT,
  avatar_url TEXT,
  content TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  approved BOOLEAN NOT NULL DEFAULT false,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.testimonials TO authenticated;
GRANT SELECT ON public.testimonials TO anon;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Test: public approved" ON public.testimonials FOR SELECT USING (approved = true OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));
CREATE POLICY "Test: user submit" ON public.testimonials FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Test: admin write" ON public.testimonials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- ============ FAQS ============
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FAQ: public read" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "FAQ: admin write" ON public.faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SETTINGS ============
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings: read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Settings: admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TRIGGER: AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ updated_at TRIGGERS ============
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SEED DEFAULT CONTENT ============
INSERT INTO public.cms_content (key, title, body) VALUES
  ('hero', 'Get Paid for Social Tasks', 'Earn real money completing quick tasks: like, follow, share, comment. Cash out anytime.'),
  ('how_it_works', 'How It Works', '1. Pick a task. 2. Complete it on the platform. 3. Submit proof. 4. Get paid after review.'),
  ('footer', 'TaskPay', 'The fastest way to monetize your social media activity.')
ON CONFLICT DO NOTHING;

INSERT INTO public.faqs (question, answer, sort_order) VALUES
  ('How much can I earn?','It depends on how many tasks you complete. Power users earn $50-$500/month.',1),
  ('When do I get paid?','After your task is approved (usually within 24 hours), funds are added to your balance.',2),
  ('What is the minimum withdrawal?','$10 by default. Admins can adjust this.',3),
  ('Is it free to join?','Yes, signing up is 100% free.',4)
ON CONFLICT DO NOTHING;

INSERT INTO public.testimonials (author_name, author_role, content, approved) VALUES
  ('Sarah K.', 'Student', 'Made $200 in my first month just by liking posts in my free time!', true),
  ('Marcus T.', 'Freelancer', 'Easy side income. Tasks take seconds and payouts are quick.', true),
  ('Priya R.', 'Influencer', 'Best platform for getting paid for what I already do daily.', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.app_settings (key, value) VALUES
  ('min_withdrawal', '10'::jsonb),
  ('signup_cooldown_hours', '24'::jsonb),
  ('per_user_daily_limit', '50'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.tasks (title, description, platform, action, target_url, reward_amount, proof_type, proof_instructions, status, difficulty) VALUES
  ('Like our YouTube video','Watch and like the video on YouTube.','youtube','like','https://youtube.com',0.25,'url','Paste the URL of your YouTube account or screenshot.','active','easy'),
  ('Follow our Instagram','Follow @taskpay on Instagram.','instagram','follow','https://instagram.com',0.50,'url','Paste your Instagram profile URL.','active','easy'),
  ('Subscribe on TikTok','Follow our TikTok account.','tiktok','follow','https://tiktok.com',0.40,'url','Paste your TikTok profile URL.','active','easy'),
  ('Comment on Twitter post','Leave a thoughtful comment.','twitter','comment','https://twitter.com',0.75,'url','Paste the link to your comment.','active','medium'),
  ('Share Facebook post','Share our post publicly.','facebook','share','https://facebook.com',0.60,'url','Paste the link to your share.','active','easy')
ON CONFLICT DO NOTHING;

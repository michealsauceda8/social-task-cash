# Cloudflare Deployment

This app builds for Cloudflare Workers via the TanStack Start / Nitro preset (already configured in `vite.config.ts`).

## One-time setup

1. Install Wrangler:
   ```bash
   bun add -d wrangler
   ```
2. Log in:
   ```bash
   bunx wrangler login
   ```
3. Push runtime secrets (do **not** put these in `wrangler.toml`):
   ```bash
   bunx wrangler secret put SUPABASE_URL
   bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY
   bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   bunx wrangler secret put LOVABLE_API_KEY
   ```

`VITE_*` values are baked in at build time. Create a `.env` (or set them in your CI) before `bun run build`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SITE_URL=https://socialtaskpay.com
```

> No Supabase credentials are hardcoded — the client reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, and SSR falls back to `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`. The app works on **Cloudflare, Vercel, and Netlify** by setting those vars in the provider's dashboard.

## Local preview against the Workers runtime

```bash
bun run cf:preview
```

Put dev-only values in `.dev.vars` (gitignored), modeled on `.dev.vars.example`.

## Deploy

```bash
bun run cf:deploy
```

The build emits `dist/server/server.js` (worker) and `dist/client/` (static assets) — both referenced by `wrangler.toml`.

## Custom domain

In the Cloudflare dashboard: Workers & Pages → your worker → Settings → Triggers → Add Custom Domain. Point it at `socialtaskpay.com`.

---

# Resend for email verification

All auth emails (verification, magic link, password reset) are delivered through **Resend's SMTP relay** configured on the Supabase project — the app no longer uses the default Supabase email provider.

## 1. Get a Resend SMTP credential

1. Create / sign in at <https://resend.com>.
2. Add and **verify the `socialtaskpay.com` domain** (add the DNS records Resend shows you).
3. Go to **API Keys → Create SMTP credentials**. Note the username (`resend`) and password (the API key).

## 2. Configure Supabase to use Resend SMTP

In the Supabase Dashboard → **Project Settings → Auth → SMTP Settings**:

| Field           | Value                                |
| --------------- | ------------------------------------ |
| Enable SMTP     | ✅ On                                |
| Sender email    | `no-reply@socialtaskpay.com`         |
| Sender name     | `TaskPay`                            |
| Host            | `smtp.resend.com`                    |
| Port            | `465` (SSL) or `587` (STARTTLS)      |
| Username        | `resend`                             |
| Password        | *your Resend API key*                |
| Min interval    | `60` seconds                         |

Then in **Auth → URL Configuration**:

- **Site URL**: `https://socialtaskpay.com`
- **Additional Redirect URLs**: `https://socialtaskpay.com/**`, plus your preview URL(s).

The app sends `emailRedirectTo: https://socialtaskpay.com/dashboard` on signup, so verification links land users back on the live site after confirming.

## 3. Email templates

In **Auth → Email Templates** edit *Confirm signup*, *Magic Link*, *Reset Password*, and *Change Email* to match the TaskPay brand. The `{{ .ConfirmationURL }}` placeholder will already use `socialtaskpay.com` once the Site URL is set correctly.

## 4. Retry / error handling

- The signup flow retries once on transient network/SMTP errors (see `src/routes/auth.tsx`).
- Supabase queues delivery and surfaces hard failures via the auth response, which the UI toasts to the user.
- Monitor delivery in the **Resend → Logs** dashboard.

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

`VITE_*` values are baked in at build time from `.env`, so set those before `bun run build`.

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

In the Cloudflare dashboard: Workers & Pages → your worker → Settings → Triggers → Add Custom Domain.

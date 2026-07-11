# Deploying agentkip.ai

The site runs anywhere Next.js 16 runs; this is the Vercel path (recommended).
Total time: ~20 minutes. Everything is free-tier for a beta launch.

## 0. What you need

- [ ] The **agentkip.ai** domain purchase completed (any registrar)
- [ ] A GitHub account (mortykaidev) — the repo can be private
- [ ] A Vercel account (sign in with GitHub)
- [ ] A Clerk account (clerk.com — sign in with GitHub/Apple)

## 1. Push to GitHub

```bash
cd ~/workspace/AgentKip.ai
gh repo create agentkip-site --private --source=. --push
```

## 2. Import to Vercel

1. vercel.com → **Add New → Project** → import `agentkip-site`.
2. Framework preset: **Next.js** (auto-detected). Deploy — the first build
   will succeed with zero env vars (auth/admin/data quietly disable
   themselves until configured).

## 3. Database (Neon Postgres)

1. In the Vercel project → **Storage** tab → **Create → Neon Postgres**.
2. That auto-adds `DATABASE_URL` to the project env.
3. Locally: copy `.env.example` to `.env`, paste the same `DATABASE_URL`,
   then push the schema:
   ```bash
   npm run db:push
   ```

## 4. Auth (Clerk)

1. clerk.com → **Create application** → name it "AgentKip", enable
   **Apple**, **Google**, and **Email**.
2. Copy the two keys into Vercel env (Settings → Environment Variables):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Sign in to the deployed site once, then find your user ID in the Clerk
   dashboard (Users → your user → User ID, starts with `user_`), and set:
   - `ADMIN_USER_IDS=user_xxxxxxxx`
4. Redeploy (Vercel → Deployments → ⋯ → Redeploy) so env changes apply.

## 5. Gallery uploads (optional, later)

Vercel project → Storage → **Create → Blob**. That adds
`BLOB_READ_WRITE_TOKEN` and the admin gallery editor switches from
URL-paste to real uploads.

## 6. Domain

1. Vercel project → Settings → **Domains** → add `agentkip.ai`
   (and `www.agentkip.ai` → redirect to apex).
2. At the registrar, set the DNS records Vercel shows (A `76.76.21.21` +
   CNAME for www, or switch nameservers to Vercel — either works).
3. Also set `NEXT_PUBLIC_SITE_URL=https://agentkip.ai` in Vercel env
   (fixes sitemap/OG URLs).

Optional: point agentkip.app / agentkip.io at the same project as redirect
domains. Keep agentkip.dev for dev servers.

## 7. Smoke test (from your phone)

- https://agentkip.ai/get loads fast and looks right
- Sign in works; /account shows your profile + Free Beta card
- /admin (your account only) → edit the hero announcement → homepage
  updates immediately
- Waitlist + contact forms land in /admin → Waitlist / Messages

## Env var reference

See `.env.example`. Summary: `DATABASE_URL` (Neon), Clerk pair +
`ADMIN_USER_IDS`, optional `BLOB_READ_WRITE_TOKEN`,
`NEXT_PUBLIC_SITE_URL`.

## Contact email

The site shows `hello@agentkip.ai` (editable in /admin → Contact).
Easiest real inbox: your registrar's email forwarding, or Cloudflare
Email Routing (free) → forward to your personal address.

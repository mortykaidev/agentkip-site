# Deploying agentkip.ai

The site runs anywhere Next.js 16 runs. Vercel provides automatic branch previews, while
production uses a controlled two-step workflow: stage the exact tested `main` SHA without
assigning domains, then promote that staged deployment only after Brandon explicitly approves it.

Merging to `main` does **not** put a deployment on the production domains. `vercel.json` disables
Vercel's automatic `main` deployment while leaving preview deployments enabled for every other
branch.

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
2. Framework preset: **Next.js** (auto-detected). Keep the Git integration connected; it creates
   preview deployments for pull requests and branch pushes.
3. Confirm the Vercel production branch is `main`. Repository configuration prevents that branch
   from deploying automatically, so GitHub Actions remains the only production path.

## 2a. Configure controlled production workflows

Create a Vercel access token and find the linked project's team and project IDs. A local
`npx --yes vercel@56.2.1 link` writes those IDs to the gitignored `.vercel/project.json`; never
commit the token or that local file.

In GitHub → `mortykaidev/agentkip-site` → **Settings → Secrets and variables → Actions**, add these
repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

In **Settings → Environments → Production**, add Brandon as a required reviewer. The promotion
workflow also requires a full SHA, the staged Vercel URL, and the exact confirmation text
`PROMOTE agentkip.ai`.

The workflows are deliberately separated:

1. `.github/workflows/ci.yml` runs `npm run check` for pull requests and pushes to `main`.
2. After a successful `main` CI run, `.github/workflows/stage-production.yml` checks that the CI
   SHA is still the current `main`, builds it with Vercel CLI `56.2.1`, and deploys with
   `--prod --skip-domain`. The deployment is production-configured but receives no live traffic.
3. The stage run records an artifact named `staged-production-<sha>` containing the SHA and URL.
4. `.github/workflows/promote-production.yml` is manual-only. It revalidates the SHA, current
   `main`, Vercel target, READY state, and Git metadata before promoting the staged deployment.

To promote from the command line after explicit approval:

```bash
gh workflow run promote-production.yml \
  --repo mortykaidev/agentkip-site \
  --ref main \
  -f sha=<full-40-character-main-sha> \
  -f deployment_url=https://<staged-deployment>.vercel.app \
  -f 'confirmation=PROMOTE agentkip.ai'
```

Watch the dispatched run and require it to finish successfully before reporting the site live:

```bash
gh run list --repo mortykaidev/agentkip-site --workflow promote-production.yml --limit 1
gh run watch <run-id> --repo mortykaidev/agentkip-site --exit-status
```

## 3. Database (Neon Postgres)

1. In the Vercel project → **Storage** tab → **Create → Neon Postgres**.
2. That auto-adds `DATABASE_URL` to the project env.
3. Locally: copy `.env.example` to `.env`, paste the same `DATABASE_URL`,
   then apply reviewed forward migrations:
   ```bash
   npm run db:migrate
   ```

Database migrations are not automated by the deployment workflows. Take the approved backup and
pass the migration gate before promoting code that depends on a new schema.

## 4. Auth (Clerk)

1. clerk.com → **Create application** → name it "AgentKip", enable
   **Apple**, **Google**, and **Email**.
2. Copy the two keys into Vercel env (Settings → Environment Variables):
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Sign in to the deployed site once, then find your user ID in the Clerk
   dashboard (Users → your user → User ID, starts with `user_`), and set:
   - `ADMIN_USER_IDS=user_xxxxxxxx`
4. Stage a fresh production deployment and explicitly promote it so the new environment values
   are included in the build.

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

## W1 billing migration and route gate

Before a W1 deployment, review the forward-only migration, take the approved
backup, and pass the migration gate. Apply it with `npm run db:migrate`; do not
use `db:push` for W1. The API routes run in the Node runtime. The webhook route
uses its exact raw request body for signature verification.

Set only the documented server-side W1 environment names from `.env.example`.
Stripe values are test-mode where applicable and the claim bearer and HMAC
peppers use separate base64url entropy. A rollback is a reviewed forward repair,
never a migration-history rewrite. Sanitized smoke evidence records only outcome
classes and aggregate gate status.

W1 does not create or repair any Price, Product, promotion, webhook endpoint,
or provider configuration. The gateway remains off. Secrets, hosted checkout
locations, user subjects, provider identifiers, and claims do not enter docs or
PR evidence.

## Rollback

Do not rebuild an arbitrary branch. In Vercel, select the previously known-good production
deployment and use **Rollback**, or run `npx --yes vercel@56.2.1 rollback` with explicit Brandon
approval. Database recovery remains a reviewed forward repair; never rewrite migration history.

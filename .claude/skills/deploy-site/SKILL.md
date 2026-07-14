---
name: deploy-site
description: Merge an approved branch/PR to main to deploy agentkip.ai to production via Vercel. Use when Brandon invokes /deploy-site with explicit sign-off to ship a reviewed branch live.
---

# /deploy-site

Merging `main` to `main`'s remote IS the production deploy — Vercel is already wired to
auto-deploy on push to `main` (see `DEPLOY.md`). This skill does not provision new
infrastructure; it just performs that merge safely, gated on Brandon's explicit sign-off,
and confirms the deploy landed.

## Hard gate — do not skip

This skill refuses to run unless the invoking message contains explicit sign-off wording from
Brandon, e.g. "ship it", "deploy it", "merge and deploy", "I approve, deploy", "go live". A bare
`/deploy-site` with no sign-off language, or a message that only *describes* a branch without
approving it, does NOT satisfy the gate — stop and ask Brandon to confirm explicitly instead of
proceeding.

## Steps

1. **Identify the target.** Brandon names a branch or PR number in the same message, or there is
   exactly one open PR against `main` that is ready for review. If there's ambiguity (multiple
   open PRs, or no branch named and more than one candidate), stop and ask which one.
2. **Verify the PR is actually ready:**
   - `gh pr view <n> --repo mortykaidev/agentkip-site --json state,mergeable,mergeStateStatus,isDraft,statusCheckRollup`
   - Must not be a draft. Must be `MERGEABLE`. If there's a CI/status check rollup, it must be
     green (or absent — this repo currently has no required CI beyond Vercel's own preview build).
   - Confirm a Vercel preview deployment exists and succeeded for the PR's head commit — check
     the PR's checks/comments for the Vercel bot's preview URL and status. If the preview failed
     or is missing, stop and report; do not merge a branch with no verified green preview.
3. **Merge to main** (squash, this repo's convention): `gh pr merge <n> --repo mortykaidev/agentkip-site --squash --delete-branch=false`.
   This push to `main` is what triggers the Vercel production deploy — no separate deploy command exists or is needed.
4. **Poll deployment status** until it resolves (Vercel typically finishes in 1-3 minutes):
   `gh api repos/mortykaidev/agentkip-site/deployments` or, if the `vercel` CLI/MCP is available
   and authenticated, use it to check the latest production deployment's state. Poll every ~15s,
   timeout after 5 minutes — if it hasn't resolved by then, report the in-progress/unknown state
   rather than declaring success.
5. **Report the live URL** (`https://agentkip.ai`) and the deployment status (READY / ERROR /
   timed out), plus the merged commit SHA. If the deploy failed, report the failure and do not
   attempt to fix it automatically — that's a separate task requiring Brandon's input.

## What this skill does NOT do

- Does not create Vercel projects, change domains, or touch env vars — see `DEPLOY.md` for
  one-time setup, already done.
- Does not run `npm run build` locally as a gate before merging — the PR's Vercel preview build
  already proved it builds; re-running it here would be redundant ceremony.
- Does not merge without the sign-off gate above, even if the PR looks obviously fine.

---
name: deploy-site
description: Merge an approved AgentKip website PR, wait for its exact-SHA staged Vercel build, and manually promote it only with Brandon's explicit sign-off.
---

# /deploy-site

Merging a PR starts CI and an exact-SHA staged production build, but it does **not** send live
traffic to that build. `vercel.json` keeps branch previews automatic and disables automatic
production deployment from `main`. This skill promotes the staged build only after every gate
passes and Brandon explicitly requests production deployment.

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
     green. The `CI` workflow and Vercel preview must both succeed.
   - Confirm a Vercel preview deployment exists and succeeded for the PR's head commit — check
     the PR's checks/comments for the Vercel bot's preview URL and status. If the preview failed
     or is missing, stop and report; do not merge a branch with no verified green preview.
3. **Merge to main** using the repository's squash convention:
   `gh pr merge <n> --repo mortykaidev/agentkip-site --squash --delete-branch=false`.
   Record the resulting full 40-character `origin/main` SHA. Do not assume the PR head SHA survived
   a squash merge.
4. **Wait for exact-SHA CI and staging.** Find the `CI` push run for the merged SHA and require it
   to succeed. Then find `Stage Production` for the same SHA and require it to succeed:
   - `gh run list --repo mortykaidev/agentkip-site --workflow ci.yml --commit <sha>`
   - `gh run list --repo mortykaidev/agentkip-site --workflow stage-production.yml --commit <sha>`
   - `gh run watch <run-id> --repo mortykaidev/agentkip-site --exit-status`
   Poll for run creation for up to five minutes; allow the run itself up to thirty minutes. A
   missing, failed, cancelled, or superseded stage is a stop condition.
5. **Retrieve the staged receipt without sourcing it.** Download the artifact
   `staged-production-<sha>` from the successful stage run into a temporary directory. Read its
   `deployment.env` as plain text, validate that `sha=` exactly matches current `origin/main`, and
   validate that `url=` is an HTTPS `vercel.app` deployment URL. Never shell-source artifact data.
6. **Dispatch the explicit promotion:**
   ```bash
   gh workflow run promote-production.yml \
     --repo mortykaidev/agentkip-site \
     --ref main \
     -f sha=<sha> \
     -f deployment_url=<staged-url> \
     -f 'confirmation=PROMOTE agentkip.ai'
   ```
   The workflow independently verifies current `main`, READY state, production target, and Vercel
   Git metadata before it can promote. Watch the run with `gh run watch ... --exit-status`.
7. **Report the result.** Only call `https://agentkip.ai` live after the promotion workflow and its
   production smoke tests succeed. Report the full SHA, staged URL, production URL, and promotion
   run URL. If promotion fails, report the failure; do not retry, redeploy, or roll back without a
   new explicit instruction from Brandon.

## What this skill does NOT do

- Does not create Vercel projects, change domains, touch environment variables, or create the
  required `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` GitHub secrets.
- Does not bypass `CI`, use a branch head in place of the squash-merge SHA, or promote a deployment
  whose Vercel metadata does not match current `main`.
- Does not apply database migrations. Follow the reviewed backup and forward-migration gate in
  `DEPLOY.md` before promotion when a release changes schema.
- Does not merge without the sign-off gate above, even if the PR looks obviously fine.

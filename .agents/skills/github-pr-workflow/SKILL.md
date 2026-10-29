---
name: github-pr-workflow
description: >-
  Standardized end-to-end GitHub Pull Request workflow using github-mcp-server:
  Pre-flight local checks -> Create/Update PR -> Monitor CI & Entire Gates ->
  Automated Review & Reviewer Assignment (ngthephong-01) -> User Approval -> Squash Merge.
  Use this skill whenever the user asks to create a PR, check CI status, review a PR,
  or run the full PR -> CI -> Approved -> Merge delivery pipeline.
---

# GitHub PR -> CI -> Approved -> Merge Workflow (`github-mcp-server`)

This skill defines the standard delivery pipeline for `NgThePhong0608/project-management` using the `github-mcp-server` MCP tools.

## Repository Configuration
- **Owner**: `NgThePhong0608`
- **Repo**: `project-management`
- **Default Base Branch**: `master`
- **Default Collaborator Reviewer**: `ngthephong-01`
- **Default Merge Method**: `squash`

---

## Phase 1: Pre-flight Local Verification & Branch Sync

Before opening or updating a Pull Request, ensure local changes are clean, formatted, tested inside the Docker containers, and pushed to `origin`:

1. **Run Backend Format & Tests**:
   ```bash
   docker compose exec -T app sh -c "./vendor/bin/pint && php artisan test"
   ```
2. **Run Frontend Format, Lint & Build**:
   ```bash
   docker compose exec -T node sh -c "npm run format && npm run lint && npm run build"
   ```
3. **Commit & Push Branch**:
   - Check `git status` and `git branch --show-current`.
   - Never push directly to `master`. Ensure work is on a descriptive branch (`feat/...`, `feature/...`, `fix/...`).
   - Push to remote: `git push -u origin <head-branch>`.

---

## Phase 2: Create or Reuse Pull Request (via `github-mcp-server`)

1. **Check Existing Open PRs**:
   Call `list_pull_requests` (`owner: "NgThePhong0608"`, `repo: "project-management"`, `state: "open"`, `head: "NgThePhong0608:<head-branch>"`).
2. **Create PR (if none exists)**:
   Call `create_pull_request` with:
   - `owner`: `"NgThePhong0608"`
   - `repo`: `"project-management"`
   - `base`: `"master"`
   - `head`: `"<head-branch>"`
   - `title`: Conventional commit style title (e.g., `feat(scope): short summary`)
   - `body`: Structured summary following `.github/PULL_REQUEST_TEMPLATE.md` (`## Summary`, `## Key Changes`, `## Verification & Quality Gates`)
   - `reviewers`: `["ngthephong-01"]`
3. **Update PR (if already open)**:
   Call `update_pull_request` to refresh the `title`, `body`, or `reviewers: ["ngthephong-01"]`.

---

## Phase 3: Monitor CI Checks & Entire Gates

1. **Inspect Check Runs**:
   Call `pull_request_read` with:
   - `method`: `"get_check_runs"`
   - `owner`: `"NgThePhong0608"`
   - `repo`: `"project-management"`
   - `pullNumber`: `<PR_NUMBER>`
2. **Required Quality Gates**:
   Wait until all active check runs reach `status: "completed"`:
   - `PHP Lint (Pint)` -> must be `conclusion: "success"`
   - `Frontend Lint (Prettier)` -> must be `conclusion: "success"`
   - `Run Tests & Build` -> must be `conclusion: "success"`
   - `Entire Gates` (if present) -> must be `conclusion: "success"` or `"neutral"` (no unresolved blockers)
   - Note: `Build & Push Docker Images` and `Deploy to Amazon ECS` are expected to be `skipped` on PR runs (they only execute on `master` push after merge).
3. **Polling Strategy**:
   If any check run is still `queued` or `in_progress`, use the `schedule` tool (e.g., `DurationSeconds: 30`) to wait before re-checking `get_check_runs`. Never use shell `sleep` loops.
4. **If CI Fails**:
   Fix the reported lint/test failure locally, commit, push, and re-run Phase 3.

---

## Phase 4: Review & Approval Gate

Because GitHub does not allow the PR author (`NgThePhong0608`) to submit a self-`APPROVE` state via the API, use this two-part approval gate:

1. **Inspect PR Diff & Existing Review Threads**:
   - Call `pull_request_read` with `method: "get_files"` or `method: "get_diff"` to verify all modified files.
   - Call `pull_request_read` with `method: "get_review_comments"` and `method: "get_reviews"` to check if `ngthephong-01` or any automated reviewer left comments or `CHANGES_REQUESTED`.
   - If any review thread is open and resolved in code, resolve it via `pull_request_review_write` (`method: "resolve_thread"`, `threadId: "<PRRT_...>"`).
2. **Post Automated Verification Review Summary**:
   Call `pull_request_review_write` with:
   - `method`: `"create"`
   - `owner`: `"NgThePhong0608"`
   - `repo`: `"project-management"`
   - `pullNumber`: `<PR_NUMBER>`
   - `event`: `"COMMENT"`
   - `body`: Summary of CI check results, test count, and security/code review verification.
3. **Human Confirmation Before Merge**:
   Report the PR URL, CI status table, and review status (`ngthephong-01` approval or self-review summary) to the user and **ask for confirmation to merge** (unless the user explicitly instructed to auto-merge immediately once CI passes).

---

## Phase 5: Squash Merge & Post-Merge Verification

Once all CI checks pass and the user confirms (or collaborator `ngthephong-01` has approved):

1. **Get Latest Head SHA**:
   Call `pull_request_read` (`method: "get"`, `owner: "NgThePhong0608"`, `repo: "project-management"`, `pullNumber: <PR_NUMBER>`) and verify `mergeable_state` is clean and grab `head.sha`.
2. **Squash Merge PR**:
   Call `merge_pull_request` with:
   - `owner`: `"NgThePhong0608"`
   - `repo`: `"project-management"`
   - `pullNumber`: `<PR_NUMBER>`
   - `merge_method`: `"squash"`
   - `expectedHeadSha`: `"<head.sha>"`
   - `commit_title`: `"<PR Title> (#<PR_NUMBER>)"`
3. **Sync Local Workspace**:
   ```bash
   git checkout master && git pull origin master
   ```
   Report the merged commit SHA and notify the user that the `master` CD pipeline (`Build & Push Docker Images` -> `Deploy to Amazon ECS`) has been triggered.

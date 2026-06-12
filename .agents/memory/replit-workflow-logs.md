---
name: Replit workflow log snapshots are stale
description: Why tailing /tmp/logs/*.log directly can show stale output and mislead debugging
---

# /tmp/logs/*.log are point-in-time snapshots, not live tails

The `/tmp/logs/<Workflow>_<timestamp>.log` files are snapshots written by the
`refresh_all_logs` tool, not a continuously-updated stream. After a
`restart_workflow`, those files are NOT automatically refreshed — `tail`-ing the
"newest" file via shell can return output from a PREVIOUS run and look frozen
(e.g. an identical error line with the exact same duration on every attempt).
**Why:** this once caused a long false-blocker chase — an old "Web Bundling
failed 1828ms" line repeated identically because it was the same stale snapshot,
while the live Metro had actually recompiled fine.
**How to apply:** to see current workflow state after a restart, call
`refresh_all_logs` to regenerate the snapshots rather than tailing the files;
identical-to-the-millisecond log lines are a tell that you're reading a stale file.

Also: this Metro runs in CI mode (`CI=1`, reloads disabled) with LAZY web
bundling — it only (re)bundles when the bundle URL is requested, e.g.
`curl "http://localhost:3000/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false"`.
Metro's persistent FileStore cache lives at `/tmp/metro-cache`.

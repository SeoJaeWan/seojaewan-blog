# Agent Guide

This repository rebuilds a Windows 11-style personal blog around the canonical
`packages/design` UI/headless sibling boundaries. `packages/ui` and `packages/shell` are
legacy visual, asset, interaction, and timing references only.

## Knowledge precedence

1. Checked-in source, tests, scripts, and executable config describe the actual checkout.
2. Workbench Local Work Memory owns durable architecture, conventions, guides, decisions, and
   revision-pinned evidence.
3. Gateway Work Items own current delivery status, priorities, dependencies, and follow-up work.

Do not recreate project knowledge under `.codex`. If repository reality differs from Local Work
Memory, record it as documentation drift and reconcile both deliberately. Do not restore legacy
decisions that conflict with the current canonical Memory; Git history remains available for
historical inspection.

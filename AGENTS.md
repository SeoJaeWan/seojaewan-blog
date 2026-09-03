# Agent Guide

This repository rebuilds a Windows 11-style personal blog around the canonical
`packages/design` headless, Product Component, and Application-adapter boundaries.
`packages/ui` and `packages/shell` are legacy visual, asset, interaction, and timing
references only.

## Architecture guardrails

- Use Base UI as the only generic interaction-primitive foundation. Do not recreate
  `packages/design/src/ui/primitives`, a primitive catalog, a vendor-mirroring adapter, or a
  pattern layer extracted only because markup repeats.
- Put serializable product models, reducers, selectors, actions, operations, controllers,
  hooks, providers, and infrastructure ports in feature-owned headless modules. Headless code
  must not import DOM APIs, JSX, Base UI, CSS, assets, or concrete Product Components.
- Product Components may consume their feature headless public API and compose Base UI,
  Fluent Icons, product tokens, CSS, and assets directly. Keep leaf and common visual
  Components props-driven when practical, and expose product intent rather than vendor types.
- Treat the Application as the composition root for Catalog, router, storage, clipboard,
  external-navigation, renderer, and preview adapters. Do not make it assemble per-element UI
  callbacks or own feature reducer, panel, menu, session, or pin state.
- Share a Component only when its product meaning, accessibility, and visual contract are the
  same. Visual resemblance alone is not a reason to introduce a generic abstraction.
- Existing `packages/design/src/core` and `packages/design/src/shell` compatibility entries do
  not authorize new top-level Core or Shell architecture. Do not add new product work there.

## Verification ownership

- Verify pure product rules and orchestration in headless unit tests.
- Verify headless-to-Base-UI wiring and final accessible DOM in Product Component integration
  tests.
- Verify focus, keyboard, portal, dismiss, placement, motion, responsive behavior, and visual
  parity in Storybook browser/visual tests.
- Verify routing, persistence, adapters, and cross-Surface flows in Application E2E tests.
- Do not duplicate Base UI's private implementation tests or create vendor-part stories. Use
  representative product compositions as the regression boundary.

## Knowledge precedence

1. Checked-in source, tests, scripts, and executable config describe the actual checkout.
2. Workbench Local Work Memory owns durable architecture, conventions, guides, decisions, and
   revision-pinned evidence.
3. Gateway Work Items own current delivery status, priorities, dependencies, and follow-up work.

Do not recreate project knowledge under `.codex`. If repository reality differs from Local Work
Memory, record it as documentation drift and reconcile both deliberately. Do not restore legacy
decisions that conflict with the current canonical Memory; Git history remains available for
historical inspection.

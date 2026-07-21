# window-blog

Windows 11 UI를 기반으로 한 블로그를 새 모노레포 구조로 재구성하는 프로젝트입니다.

## Workspace

```txt
apps/
  web/          # Next.js app
packages/
  shell/        # Functional UI assembly package
  ui/           # Render-only design system package
```

## Package Boundary

The runtime dependency direction is `@window/ui ← @window/shell ← apps/web`.

- `@window/ui` owns render-only React components, CSS, visual assets, and static Storybook
  stories. Components receive state, computed styles, refs, and callbacks through props.
- `@window/shell` owns hooks, providers, contexts, browser APIs, measurement, animation
  controllers, functional component assembly, and a functional Storybook. It consumes the public
  `@window/ui` API and does not ship runtime CSS or story-only harness code.
- UI Storybook is a visual catalog for fixed modes, variants, and states. It does not import
  `@window/shell` or demonstrate state transitions through clicks, timers, or browser APIs.
- Shell Storybook assembles the real shell connectors in one shared harness so developers can
  explore user-visible state transitions manually. Each connector pairs focused MDX Docs with one
  behavior story, and deterministic state presets keep every supported flow in that canvas.
  Diagnostics live in the canvas instead of Storybook's addon panel. Automated behavior
  verification remains in colocated test files. Future Start, Search, Hover, and Context panel
  connectors reuse the same taskbar slot and provider boundary.

## Tooling

- Package manager: pnpm
- Monorepo runner: Turborepo
- App target: Next.js 16
- UI package target: Vite library + Storybook
- Shell package target: Vite library + functional Storybook

## Scripts

```bash
pnpm dev
pnpm storybook:ui
pnpm storybook:shell
pnpm build
pnpm build:storybook:ui
pnpm build:storybook:shell
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
pnpm format
pnpm format:check
```

When validating package changes directly, build `@window/ui` before `@window/shell` because
the shell consumes the UI package's public `dist` exports.

## Architecture

- [Windows domain architecture](./.codex/architecture/windows-domain.md)
- [Taskbar layout](./.codex/layout/taskbar.md)

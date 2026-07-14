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
  controllers, and functional component assembly. It consumes the public `@window/ui` API
  and does not ship CSS or Storybook stories.
- UI Storybook is a visual catalog for fixed modes, variants, and states. It does not import
  `@window/shell` or demonstrate state transitions through clicks, timers, or browser APIs.

## Tooling

- Package manager: pnpm
- Monorepo runner: Turborepo
- App target: Next.js 16
- UI package target: Vite library + Storybook
- Shell package target: Vite library

## Scripts

```bash
pnpm dev
pnpm build
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

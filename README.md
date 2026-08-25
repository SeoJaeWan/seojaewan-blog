# window-blog

Windows 11 UI를 기반으로 한 블로그를 새 모노레포 구조로 재구성하는 프로젝트입니다.

## Workspace

```txt
packages/
  design/          # Canonical UI/Core/Shell design package
  shell/           # Legacy interaction reference
  ui/              # Legacy visual reference
```

`apps/web` is the planned application target and is not present in the current workspace yet.

## Package Boundary

The canonical dependency direction is `Application → Design Shell → Design UI/Core` inside
`@window/design`.

- `@window/design` is the canonical destination for new UI, Core, and Shell work.
- `packages/ui` and `packages/shell` are retained only as visual, asset, interaction, and timing
  references during migration. Do not add new product architecture or dependencies on them.
- Legacy packages remain directly runnable for comparison until regression verification permits
  their removal, but they are not exposed as root Storybook entry points.

## Tooling

- Package manager: pnpm
- Monorepo runner: Turborepo
- Planned app target: Next.js 16
- Design package target: Vite library + Storybook

## Scripts

```bash
pnpm dev:all
pnpm storybook:dev:design
pnpm storybook:build:design
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm verify
pnpm format
pnpm format:check
```

Root Storybook commands follow `storybook:{dev|build}:<workspace>`. The workspace suffix is
required because application-specific Storybooks may be added later. Unscoped `storybook:dev` and
`storybook:build` remain reserved for a future composed Storybook.

`pnpm dev:all` runs every workspace `dev` task. The unscoped `pnpm dev` command remains reserved for
the future primary application runtime.

For legacy comparison only, run `pnpm --filter @window/ui dev` or
`pnpm --filter @window/shell dev` directly.

## Project Knowledge

Durable architecture, conventions, commands, and development guides are maintained in Workbench
Local Work Memory. Current delivery status and follow-up work are maintained as Gateway Work Items.

- [Agent bootstrap and knowledge precedence](./.codex/agent.md)
- [Local evidence and history index](./.codex/README.md)

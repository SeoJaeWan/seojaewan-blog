// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { cn, createTokenMerge, type TokenNameLists } from './cn';

// 모든 이름공간을 채운 토큰 이름 목록이다.
const tokenNames: TokenNameLists = {
  spacing: ['spacing-sm', 'spacing-md'],
  size: ['size-menu-width', 'size-none'],
  radius: ['radius-overlay', 'radius-control'],
  strokeWidth: ['stroke-width-focus-outer', 'stroke-width-default'],
  opacity: ['opacity-cut', 'opacity-ghost'],
  rotate: ['rotate-half', 'rotate-quarter'],
  zIndex: ['layer-window', 'layer-menu'],
  lineClamp: ['line-clamp-two', 'line-clamp-three'],
  aspect: ['ratio-wide', 'ratio-tall'],
  inset: ['position-half', 'position-full'],
  translate: ['position-half', 'position-full'],
  gridColumnStart: ['grid-start', 'grid-end'],
  gridRowStart: ['grid-start', 'grid-end'],
  borderSpacing: ['border-spacing-none', 'border-spacing-wide'],
  shrink: ['shrink-none', 'shrink-all'],
  flex: ['flex-fill', 'flex-half'],
};

// @codocs [[피그마 연동:토큰 사용 강제]]
describe('스타일링', () => {
  it.each([
    ['p-spacing-md', 'p-spacing-sm', 'p-spacing-sm'],
    ['-mt-spacing-md', '-mt-spacing-sm', '-mt-spacing-sm'],
    ['w-size-menu-width', 'w-size-none', 'w-size-none'],
    ['min-w-size-menu-width', 'min-w-size-none', 'min-w-size-none'],
    ['rounded-radius-overlay', 'rounded-radius-control', 'rounded-radius-control'],
    [
      'border-stroke-width-focus-outer',
      'border-stroke-width-default',
      'border-stroke-width-default',
    ],
    ['opacity-opacity-cut', 'opacity-opacity-ghost', 'opacity-opacity-ghost'],
    ['rotate-rotate-quarter', 'rotate-rotate-half', 'rotate-rotate-half'],
    ['-rotate-rotate-quarter', '-rotate-rotate-half', '-rotate-rotate-half'],
    ['z-layer-menu', 'z-layer-window', 'z-layer-window'],
    ['line-clamp-line-clamp-two', 'line-clamp-line-clamp-three', 'line-clamp-line-clamp-three'],
    ['aspect-ratio-wide', 'aspect-ratio-tall', 'aspect-ratio-tall'],
    ['top-position-full', 'top-position-half', 'top-position-half'],
    ['-top-position-full', '-top-position-half', '-top-position-half'],
    ['-translate-y-position-full', '-translate-y-position-half', '-translate-y-position-half'],
    ['col-start-grid-end', 'col-start-grid-start', 'col-start-grid-start'],
    ['row-start-grid-end', 'row-start-grid-start', 'row-start-grid-start'],
    [
      'border-spacing-border-spacing-wide',
      'border-spacing-border-spacing-none',
      'border-spacing-border-spacing-none',
    ],
    ['shrink-shrink-all', 'shrink-shrink-none', 'shrink-shrink-none'],
    ['flex-flex-half', 'flex-flex-fill', 'flex-flex-fill'],
  ])('토큰 클래스는 같은 속성이면 뒤의 것만 남긴다: %s %s', (before, after, expected) => {
    expect(createTokenMerge(tokenNames)(`${before} ${after}`)).toBe(expected);
  });

  it('토큰 두께 클래스와 색 클래스를 서로 다른 속성으로 보고 둘 다 남긴다', () => {
    expect(cn('border-stroke-width-focus-outer border-focus-stroke-outer')).toBe(
      'border-stroke-width-focus-outer border-focus-stroke-outer',
    );
    expect(cn('border-b-stroke-width-focus-outer border-accent-fill-default')).toBe(
      'border-b-stroke-width-focus-outer border-accent-fill-default',
    );
    expect(cn('outline-stroke-width-focus-outer outline-focus-stroke-outer')).toBe(
      'outline-stroke-width-focus-outer outline-focus-stroke-outer',
    );
    expect(cn('type-body text-text-fill-primary')).toBe('type-body text-text-fill-primary');
  });

  it('사용처의 className이 같은 속성의 기본 클래스를 덮어쓴다', () => {
    expect(
      cn('px-spacing-md bg-control-fill-default', 'px-spacing-lg bg-accent-fill-default'),
    ).toBe('px-spacing-lg bg-accent-fill-default');
    expect(cn('rounded-radius-control', 'rounded-radius-circular')).toBe('rounded-radius-circular');
    expect(cn('w-size-menu-width', 'w-full')).toBe('w-full');
  });
});

// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { cn, TOKEN_NAMES } from './cn';

const tokensCss = readFileSync(new URL('tokens.css', import.meta.url), 'utf8');

/**
 * tokens.css에서 이름공간의 토큰 이름을 모은다.
 * @param namespace CSS 변수 이름공간(`spacing`, `radius` 등)
 * @returns 토큰 이름 목록(정렬)
 */
function tokenNames(namespace: string): string[] {
  const pattern = new RegExp(`^\\s+--${namespace}-([a-z0-9-]+):`, 'gmu');
  return [...tokensCss.matchAll(pattern)]
    .map((match) => match[1] ?? '')
    .filter((name) => !name.includes('--'))
    .sort();
}

// @codocs [[기술 스택:스타일링]]
describe('스타일링', () => {
  it('className 병합이 아는 토큰 이름이 tokens.css와 같다', () => {
    expect([...TOKEN_NAMES.spacing].sort()).toEqual(tokenNames('spacing'));
    expect([...TOKEN_NAMES.size].sort()).toEqual(tokenNames('size'));
    expect([...TOKEN_NAMES.radius].sort()).toEqual(tokenNames('radius'));
    expect([...TOKEN_NAMES.strokeWidth].sort()).toEqual(tokenNames('stroke-width'));
  });

  it('토큰 두께 클래스와 색 클래스를 서로 다른 속성으로 보고 둘 다 남긴다', () => {
    expect(cn('border-focus-outer border-focus-stroke-outer')).toBe(
      'border-focus-outer border-focus-stroke-outer',
    );
    expect(cn('border-b-focus-outer border-accent-fill-default')).toBe(
      'border-b-focus-outer border-accent-fill-default',
    );
    expect(cn('outline-focus-outer outline-focus-stroke-outer')).toBe(
      'outline-focus-outer outline-focus-stroke-outer',
    );
    expect(cn('type-body text-text-fill-primary')).toBe('type-body text-text-fill-primary');
  });

  it('사용처의 className이 같은 속성의 기본 클래스를 덮어쓴다', () => {
    expect(cn('px-12 bg-control-fill-default', 'px-16 bg-accent-fill-default')).toBe(
      'px-16 bg-accent-fill-default',
    );
    expect(cn('rounded-control', 'rounded-circular')).toBe('rounded-circular');
    expect(cn('w-320', 'w-240')).toBe('w-240');
  });
});

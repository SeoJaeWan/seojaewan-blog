// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  changedExportComponents,
  componentDependents,
  selectAffectedComponents,
} from './affected-components.ts';

const PREFIX = 'packages/design-system/';
const dependents = componentDependents(
  new Map([
    ['menu', ["import { MenuItem } from '../menu-item/menu-item';"]],
    ['menu-item', ["import { cn } from 'tailwind-merge';"]],
    ['flyout', ["import { Menu } from '../menu/menu';"]],
    ['button', []],
  ]),
);

/**
 * 고른 결과를 비교하기 쉬운 값으로 바꾼다.
 * @param files 바뀐 파일
 * @param exportChanges export.json에서 바뀐 컴포넌트
 * @returns 전체 비교면 'all', 아니면 정렬한 컴포넌트 목록
 */
function select(files: string[], exportChanges: string[] = []): 'all' | string[] {
  const selection = selectAffectedComponents(files, PREFIX, dependents, exportChanges);
  return selection.all ? 'all' : [...selection.components].sort();
}

// @codocs [[피그마 일치 검사:비교 범위]]
describe('비교 범위', () => {
  it('컴포넌트 파일이 바뀌면 그 컴포넌트와 그것을 쓰는 컴포넌트를 비교한다', () => {
    expect(select([`${PREFIX}src/components/menu-item/menu-item.tsx`])).toEqual([
      'flyout',
      'menu',
      'menu-item',
    ]);
  });

  it('테스트 파일만 바뀌면 비교하지 않는다', () => {
    expect(select([`${PREFIX}src/components/button/button.test.tsx`])).toEqual([]);
  });

  it('플러그인이 올린 기준 이미지가 바뀐 컴포넌트를 비교한다', () => {
    expect(select([`${PREFIX}figma/images/button/variant=accent,state=rest.png`])).toEqual([
      'button',
    ]);
    expect(select([`${PREFIX}figma/export.json`], ['button'])).toEqual(['button']);
  });

  it('토큰·전역 스타일이 바뀌면 전체를 비교한다', () => {
    expect(select([`${PREFIX}figma/tokens.json`])).toBe('all');
    expect(select([`${PREFIX}src/tokens.css`])).toBe('all');
    expect(select([`${PREFIX}src/theme.css`])).toBe('all');
    expect(select([`${PREFIX}.storybook/preview.ts`])).toBe('all');
    expect(select(['pnpm-lock.yaml'])).toBe('all');
  });

  it('컴포넌트 폴더 밖의 디자인 시스템 소스가 바뀌면 전체를 비교한다', () => {
    expect(select([`${PREFIX}src/class-names.ts`])).toBe('all');
  });

  it('디자인 시스템과 상관없는 파일만 바뀌면 비교하지 않는다', () => {
    expect(select(['apps/web/src/app/page.tsx', '.codocs/development/figma-parity.yaml'])).toEqual(
      [],
    );
  });

  it('export.json에서 항목이 바뀌거나 새로 생긴 컴포넌트를 찾는다', () => {
    const base = { components: { button: { hash: 'a' }, menu: { hash: 'b' } } };
    const head = { components: { button: { hash: 'a' }, menu: { hash: 'c' }, flyout: {} } };
    expect(changedExportComponents(base, head)).toEqual(['menu', 'flyout']);
    expect(changedExportComponents(undefined, head)).toEqual(['button', 'menu', 'flyout']);
  });
});

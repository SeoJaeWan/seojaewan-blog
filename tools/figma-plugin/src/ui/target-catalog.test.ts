import { describe, expect, it } from 'vitest';

import {
  ASSETS_KEY,
  buildCatalog,
  estimatePullRequests,
  filterItems,
  groupSelection,
  TOKENS_KEY,
} from './target-catalog';

const catalog = buildCatalog([
  { id: '1:1', name: 'Button', page: 'Controls', variantCount: 4 },
  { id: '1:3', name: 'ToggleSwitch', page: 'Controls', variantCount: 6 },
  { id: '1:2', name: 'WindowFrame', page: 'Shell', variantCount: 3 },
  { id: '1:4', name: 'CodeBlock', page: 'Blog', variantCount: 1 },
]);

// @codocs [[디자인 시스템:플러그인 화면]]
describe('대상 목록: 묶음', () => {
  it('컴포넌트는 페이지로 묶고 받은 순서(캔버스 순서)를 지킨다', () => {
    expect(
      catalog.groups.map((group) => [group.title, group.items.map((item) => item.name)]),
    ).toEqual([
      ['Controls', ['Button', 'ToggleSwitch']],
      ['Shell', ['WindowFrame']],
      ['Blog', ['CodeBlock']],
    ]);
  });

  it('묶음마다 고른 수 / 전체 수와 일부만 고른 상태를 구한다', () => {
    const controls = catalog.groups[0]?.items ?? [];
    expect(groupSelection(controls, new Set())).toEqual({ selected: 0, total: 2, state: 'none' });
    expect(groupSelection(controls, new Set(['component:1:1']))).toEqual({
      selected: 1,
      total: 2,
      state: 'some',
    });
    expect(groupSelection(controls, new Set(['component:1:1', 'component:1:3'])).state).toBe('all');
  });

  it('목록 안 찾기는 이름에 글자가 든 항목만 남기고 대소문자를 구분하지 않는다', () => {
    expect(filterItems(catalog.items, 'BUTTON').map((item) => item.name)).toEqual(['Button']);
    expect(filterItems(catalog.items, ' ')).toHaveLength(4);
  });
});

// @codocs [[디자인 시스템:플러그인 화면]]
describe('아래 고정줄: 열릴 PR 수', () => {
  it('컴포넌트는 하나마다, 자산은 하나다', () => {
    const selected = new Set(['component:1:1', 'component:1:2', ASSETS_KEY]);
    expect(estimatePullRequests(catalog, selected, false)).toBe(3);
  });

  it('토큰이 main과 다르면 다른 대상만 골라도 토큰 PR을 센다', () => {
    expect(estimatePullRequests(catalog, new Set(['component:1:1']), true)).toBe(2);
    expect(estimatePullRequests(catalog, new Set(), true)).toBe(0);
  });

  it('비교 전이면 토큰을 골랐을 때만 토큰 PR을 센다', () => {
    expect(estimatePullRequests(catalog, new Set([TOKENS_KEY]), null)).toBe(1);
    expect(estimatePullRequests(catalog, new Set(['component:1:1']), null)).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';

import {
  bandGroups,
  bandKeyOf,
  buildCatalog,
  estimatePullRequests,
  filterItems,
  groupSelection,
  TOKENS_KEY,
} from './target-catalog';

const catalog = buildCatalog(
  [
    { id: '1:1', name: 'Button', kind: 'COMPONENT_SET', variantCount: 4, group: 'Controls' },
    { id: '1:2', name: 'WindowFrame', kind: 'COMPONENT_SET', variantCount: 3, group: 'Window' },
    { id: '1:3', name: 'ToggleSwitch', kind: 'COMPONENT_SET', variantCount: 6, group: 'Controls' },
  ],
  [
    { id: '2:1', name: 'Menu/Folder', kind: 'COMPONENT', variantCount: 1, group: 'Menu' },
    { id: '2:2', name: 'Menu/Desktop', kind: 'COMPONENT', variantCount: 1, group: 'Menu' },
    {
      id: '2:3',
      name: 'Taskbar/Default',
      kind: 'COMPONENT_SET',
      variantCount: 2,
      group: 'Taskbar',
    },
  ],
  [{ id: '3:1', name: 'motion-window-open' }],
);

// @codocs [[피그마 연동:플러그인 화면]]
describe('대상 목록: 묶음', () => {
  it('컴포넌트는 영역 섹션, 조립은 영역, 애니메이션은 하나로 묶고 받은 순서(캔버스 순서)를 지킨다', () => {
    expect(
      catalog.groups.map((group) => [group.title, group.items.map((item) => item.name)]),
    ).toEqual([
      ['Controls', ['Button', 'ToggleSwitch']],
      ['Window', ['WindowFrame']],
      ['Menu', ['Menu/Folder', 'Menu/Desktop']],
      ['Taskbar', ['Taskbar/Default']],
      ['견본', ['motion-window-open']],
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
    expect(filterItems(catalog.items, 'MENU').map((item) => item.name)).toEqual([
      'Menu/Folder',
      'Menu/Desktop',
    ]);
    expect(filterItems(catalog.items, '  ')).toHaveLength(catalog.items.length);
  });
});

// @codocs [[피그마 연동:플러그인 화면]]
describe('대상 목록: 열릴 PR 수', () => {
  it('컴포넌트·애니메이션은 하나마다, 조립은 영역마다 PR 하나다', () => {
    const selected = new Set(['component:1:1', 'pattern:2:1', 'pattern:2:2', 'motion:3:1']);
    expect(estimatePullRequests(catalog, selected, false)).toBe(3);
  });

  it('토큰이 main과 다르면 무엇을 내보내든 토큰 PR 하나를 더한다', () => {
    expect(estimatePullRequests(catalog, new Set(['component:1:1']), true)).toBe(2);
    expect(estimatePullRequests(catalog, new Set(), true)).toBe(0);
  });

  it('토큰 비교 전이면 토큰을 골랐을 때만 센다', () => {
    expect(estimatePullRequests(catalog, new Set([TOKENS_KEY]), null)).toBe(1);
    expect(estimatePullRequests(catalog, new Set(['component:1:1']), null)).toBe(1);
  });
});

// @codocs [[피그마 연동:플러그인 화면]]
describe('대상 목록: 묶음 섹션 > 컴포넌트 섹션 > 컴포넌트', () => {
  const paged = buildCatalog(
    [
      { id: '1:1', name: 'Loose', kind: 'COMPONENT', variantCount: 1, group: '묶음 밖' },
      {
        id: '2:1',
        name: 'Button',
        kind: 'COMPONENT_SET',
        variantCount: 4,
        group: 'Button (버튼)',
        band: 'Controls (컨트롤)',
      },
      {
        id: '2:2',
        name: 'Checkbox',
        kind: 'COMPONENT_SET',
        variantCount: 2,
        group: 'Checkbox (체크 상자)',
        band: 'Controls (컨트롤)',
      },
      {
        id: '3:1',
        name: 'WindowFrame',
        kind: 'COMPONENT_SET',
        variantCount: 3,
        group: 'Window (창)',
        band: 'Window (창)',
      },
    ],
    [{ id: '4:1', name: 'Menu/Folder', kind: 'COMPONENT', variantCount: 1, group: 'Menu' }],
    [],
  );

  it('이어진 컴포넌트 섹션을 묶음 섹션으로 모으고, 섹션 밖 컴포넌트는 묶음 섹션 없이 둔다', () => {
    expect(
      bandGroups(paged.groups).map((band) => [band.band, band.groups.map((group) => group.title)]),
    ).toEqual([
      [null, ['묶음 밖']],
      ['Controls (컨트롤)', ['Button (버튼)', 'Checkbox (체크 상자)']],
      ['Window (창)', ['Window (창)']],
      [null, ['Menu']],
    ]);
  });

  it('묶음 키에 묶음 섹션 이름이 들고, 펼침 키는 묶음 섹션마다 하나다', () => {
    expect(paged.items.map((item) => item.groupKey).slice(0, 2)).toEqual([
      'component:묶음 밖',
      'component:Controls (컨트롤):Button (버튼)',
    ]);
    expect(paged.items.map((item) => bandKeyOf(item))).toEqual([
      null,
      'band:component:Controls (컨트롤)',
      'band:component:Controls (컨트롤)',
      'band:component:Window (창)',
      null,
    ]);
    expect(bandGroups(paged.groups)[1]?.key).toBe('band:component:Controls (컨트롤)');
  });
});

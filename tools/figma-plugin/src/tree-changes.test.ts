import { describe, expect, it } from 'vitest';

import { planTree } from './tree-changes';

const current = new Map([
  ['components/button/export.json', 'a'],
  ['components/button/state=rest.png', 'b'],
  ['components/button/state=hover.png', 'c'],
  ['components/menu/export.json', 'd'],
  ['assets/icons/add.svg', 'e'],
]);

// @codocs [[피그마 연동:피그마 플러그인]]
describe('브랜치와 내용이 다른 파일만 바꾸고, 맡은 폴더의 사라진 파일만 지운다', () => {
  it('모두 같으면 바꿀 것이 없다', () => {
    const desired = new Map([
      ['components/button/export.json', 'a'],
      ['components/button/state=rest.png', 'b'],
      ['components/button/state=hover.png', 'c'],
    ]);
    expect(planTree(desired, current, ['components/button']).entries).toEqual([]);
  });

  it('SHA가 다르거나 새로 생긴 파일을 쓰고, 맡은 폴더에서 빠진 파일을 지운다', () => {
    const desired = new Map([
      ['components/button/export.json', 'a2'],
      ['components/button/state=rest.png', 'b'],
      ['components/button/state=pressed.png', 'f'],
      ['assets/icons/add.svg', 'e'],
    ]);
    const plan = planTree(desired, current, ['components/button']);
    expect(plan.changed).toEqual([
      'components/button/export.json',
      'components/button/state=pressed.png',
    ]);
    expect(plan.deleted).toEqual(['components/button/state=hover.png']);
    expect(plan.entries).toContainEqual({ path: 'components/button/state=hover.png', sha: null });
  });

  it('맡지 않은 폴더의 파일은 지우지 않는다', () => {
    const plan = planTree(new Map(), current, ['components/button']);
    expect(plan.deleted).not.toContain('components/menu/export.json');
    expect(plan.deleted).not.toContain('assets/icons/add.svg');
  });
});

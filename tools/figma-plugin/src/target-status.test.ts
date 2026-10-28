import { describe, expect, it } from 'vitest';

import { newTargetIds } from './target-status';

const paths = [
  'packages/design-system/figma/components/button/export.json',
  'packages/design-system/figma/components/button/variant=accent.png',
  'apps/web/figma/patterns/menu/folder/export.json',
  'packages/design-system/figma/motions/motion-window-open.json',
];

// @codocs [[피그마 연동:플러그인 화면]]
describe('대상 목록: 저장소에 폴더가 없으면 새로 만듦', () => {
  it('컴포넌트는 컴포넌트 폴더, 조립은 영역/이름 폴더, 애니메이션은 json 파일로 본다', () => {
    expect(
      newTargetIds(paths, {
        components: [
          { id: 'c1', name: 'Button' },
          { id: 'c2', name: 'ToggleSwitch' },
        ],
        patterns: [
          { id: 'p1', name: 'Menu/Folder' },
          { id: 'p2', name: 'Menu/ViewSubmenu' },
        ],
        motions: [
          { id: 'm1', name: 'motion-window-open' },
          { id: 'm2', name: 'motion-progress-ring' },
        ],
      }),
    ).toEqual(['c2', 'p2', 'm2']);
  });

  it('폴더 이름이 앞부분만 같은 다른 폴더는 같은 폴더가 아니다', () => {
    expect(
      newTargetIds(paths, {
        components: [{ id: 'c1', name: 'But' }],
        patterns: [],
        motions: [],
      }),
    ).toEqual(['c1']);
  });

  it('이름으로 폴더를 정할 수 없는 대상은 새로 만듦으로 본다', () => {
    expect(
      newTargetIds(paths, {
        components: [{ id: 'c1', name: '단추' }],
        patterns: [{ id: 'p1', name: 'Folder' }],
        motions: [],
      }),
    ).toEqual(['c1', 'p1']);
  });
});

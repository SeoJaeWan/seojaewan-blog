import { describe, expect, it } from 'vitest';

import { storyEntries } from './story-target.ts';

// Storybook index.json의 모양을 본뜬 테스트 데이터다.
const storybookIndex = {
  v: 5,
  entries: {
    'motion-window-open--default': {
      id: 'motion-window-open--default',
      title: 'Motion/motion-window-open',
      name: 'Default',
      importPath: './src/motion-story/motion-window-open.stories.tsx',
      type: 'story',
    },
    'motion-window-open--docs': {
      id: 'motion-window-open--docs',
      title: 'Motion/motion-window-open',
      name: 'Docs',
      importPath: './src/motion-story/motion-window-open.stories.tsx',
      type: 'docs',
    },
    broken: { id: 'broken', type: 'story' },
  },
};

describe('Storybook index.json', () => {
  it('스토리 항목만 꺼내고 문서 항목과 칸이 빠진 항목은 뺀다', () => {
    expect(storyEntries(storybookIndex)).toEqual([
      {
        id: 'motion-window-open--default',
        title: 'Motion/motion-window-open',
        name: 'Default',
        importPath: './src/motion-story/motion-window-open.stories.tsx',
      },
    ]);
  });

  it('entries가 없으면 빈 목록이다', () => {
    expect(storyEntries({})).toEqual([]);
    expect(storyEntries(null)).toEqual([]);
  });
});

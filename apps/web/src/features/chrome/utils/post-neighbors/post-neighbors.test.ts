import { describe, expect, it } from 'vitest';

import { createInitialWorkspace, trashItems } from '@/shared/utils/workspace-rules/workspace-rules';

import { getPostNeighbors } from './post-neighbors';

const workspace = createInitialWorkspace({
  posts: [
    { slug: 'old', title: '오래된 글', folderPath: [], date: '2026-01-01' },
    { slug: 'mid', title: '가운데 글', folderPath: ['React'], date: '2026-05-01' },
    { slug: 'new', title: '새 글', folderPath: [], date: '2026-10-01' },
  ],
  links: [],
});

// @codocs [[Chrome:글 화면]]
describe('Chrome:글 화면', () => {
  it('이전 글은 작성일이 바로 앞선 글이다', () => {
    expect(getPostNeighbors(workspace, 'mid').previous?.slug).toBe('old');
  });

  it('다음 글은 작성일이 바로 뒤인 글이다', () => {
    expect(getPostNeighbors(workspace, 'mid').next?.slug).toBe('new');
  });

  it('가장 오래된 글은 이전 글이 없다', () => {
    expect(getPostNeighbors(workspace, 'old').previous).toBeUndefined();
  });

  it('가장 새 글은 다음 글이 없다', () => {
    expect(getPostNeighbors(workspace, 'new').next).toBeUndefined();
  });

  it('폴더와 휴지통에 상관없이 사이트의 모든 글에서 찾는다', () => {
    const trashed = trashItems(workspace, ['post:old'], '2026-10-28T00:00:00.000Z');
    const state = trashed.ok ? trashed.state : workspace;
    expect(getPostNeighbors(state, 'mid').previous?.slug).toBe('old');
  });
});

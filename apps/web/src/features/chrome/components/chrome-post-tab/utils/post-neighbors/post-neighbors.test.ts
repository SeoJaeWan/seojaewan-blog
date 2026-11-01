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

  it('폴더와 상관없이 사이트의 글에서 찾는다', () => {
    expect(getPostNeighbors(workspace, 'old').next?.slug).toBe('mid');
    expect(getPostNeighbors(workspace, 'new').previous?.slug).toBe('mid');
  });
});

// @codocs [[Chrome:휴지통에 있는 글]]
describe('Chrome:휴지통에 있는 글', () => {
  it('이전 글·다음 글은 휴지통에 있는 글을 건너뛴다', () => {
    const state = trash(['post:mid']);
    expect(getPostNeighbors(state, 'old').next?.slug).toBe('new');
    expect(getPostNeighbors(state, 'new').previous?.slug).toBe('old');
  });

  it('휴지통에 든 폴더 안의 글도 건너뛴다', () => {
    const folder = Object.values(workspace.items).find(
      (item) => item.kind === 'folder' && item.name === 'React',
    );
    const state = trash([folder?.id ?? '']);
    expect(getPostNeighbors(state, 'old').next?.slug).toBe('new');
  });

  it('보고 있는 글이 휴지통에 있어도 자기 자리에서 이웃을 찾는다', () => {
    const state = trash(['post:mid']);
    expect(getPostNeighbors(state, 'mid')).toEqual({
      previous: state.items['post:old'],
      next: state.items['post:new'],
    });
  });
});

/**
 * 항목들을 휴지통에 넣은 작업 공간.
 * @param ids 넣을 항목 id
 * @returns 작업 공간
 */
function trash(ids: readonly string[]): typeof workspace {
  const result = trashItems(workspace, ids, '2026-10-28T00:00:00.000Z');
  if (!result.ok) {
    throw new Error(result.reason);
  }
  return result.state;
}

import { describe, expect, it } from 'vitest';

import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  RECYCLE_BIN_ID,
  trashItems,
} from '@/shared/utils/workspace-rules/workspace-rules';

import {
  formatDeletedDate,
  getExplorerLocationName,
  getExplorerLocationPath,
  getExplorerWindowTitle,
  getOriginalLocation,
} from './explorer-location';

const workspace = createInitialWorkspace({
  posts: [{ slug: 'a', title: '가', folderPath: ['React'], date: '2026-10-20' }],
  links: [],
});

// @codocs [[파일 탐색기:탭]]
describe('파일 탐색기:탭', () => {
  it('탭 제목은 현재 폴더 이름이고, 바탕화면이면 "바탕 화면", 휴지통이면 "휴지통"이다', () => {
    expect(getExplorerLocationName(workspace, 'folder:React')).toBe('React');
    expect(getExplorerLocationName(workspace, null)).toBe('바탕 화면');
    expect(getExplorerLocationName(workspace, RECYCLE_BIN_ID)).toBe('휴지통');
  });

  it('창 제목은 위치 이름 뒤에 앱 이름을 붙인다', () => {
    expect(getExplorerWindowTitle(workspace, BLOG_FOLDER_ID)).toBe('Blog - 파일 탐색기');
  });
});

// @codocs [[파일 탐색기:구성]]
describe('파일 탐색기:구성', () => {
  it('위치 칸은 바탕 화면부터 현재 폴더까지이고, 휴지통은 휴지통 하나다', () => {
    expect(getExplorerLocationPath(workspace, 'folder:React')).toEqual([
      '바탕 화면',
      'Blog',
      'React',
    ]);
    expect(getExplorerLocationPath(workspace, null)).toEqual(['바탕 화면']);
    expect(getExplorerLocationPath(workspace, RECYCLE_BIN_ID)).toEqual(['휴지통']);
  });
});

// @codocs [[파일 탐색기:휴지통 보기]]
describe('파일 탐색기:휴지통 보기', () => {
  it('원래 위치는 바탕 화면부터 원래 상위 폴더까지를 \\로 잇는다', () => {
    const result = trashItems(workspace, ['post:a'], '2026-10-28T09:00:00.000Z');
    if (!result.ok) {
      throw new Error(result.reason);
    }
    const item = result.state.items['post:a'];
    if (item === undefined || item.kind === 'recycle-bin') {
      throw new Error('지운 글이 없다');
    }
    expect(getOriginalLocation(result.state, item)).toBe('바탕 화면\\Blog\\React');
  });

  it('삭제한 날짜는 방문자 시간대의 YYYY-MM-DD이고, 읽을 수 없으면 빈 글자다', () => {
    expect(formatDeletedDate(new Date(2026, 9, 28, 9).toISOString())).toBe('2026-10-28');
    expect(formatDeletedDate('없음')).toBe('');
  });
});

import { describe, expect, it } from 'vitest';

import {
  BLOG_FOLDER_ID,
  createInitialWorkspace,
  getLinkItemId,
  getPostItemId,
  RECYCLE_BIN_ID,
  trashItems,
} from '@/shared/utils/workspace-rules/workspace-rules';

import {
  findExplorerAddressTarget,
  formatDeletedDate,
  getExplorerAddressText,
  getExplorerLocationName,
  getExplorerLocationPath,
  getExplorerWindowTitle,
  getOriginalLocation,
} from './explorer-location';

const workspace = createInitialWorkspace({
  posts: [
    { collection: 'blog', slug: 'a', title: '가', folderPath: ['React'], date: '2026-10-20' },
  ],
  links: [
    {
      id: 'github',
      name: 'GitHub',
      url: 'https://github.com/',
      icon: 'illustrations/file-link.svg',
      initialParentId: null,
      isPinnedToStart: false,
    },
  ],
});

/**
 * 주소창 해석 결과 가운데 갈 위치를 만든다.
 * @param folderId 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 * @returns 위치 결과
 */
function location(folderId: string | null): { kind: 'location'; location: string | null } {
  return { kind: 'location', location: folderId };
}

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

// 경로 구분자(백슬래시)다.
const separator = String.fromCodePoint(92);

/**
 * 이름들을 경로 구분자로 잇는다.
 * @param names 이름
 * @returns 경로
 */
function joinPath(...names: string[]): string {
  return names.join(separator);
}

// @codocs [[파일 탐색기:주소창 편집]]
describe('파일 탐색기:주소창 편집', () => {
  it('편집을 시작하면 위치 칸 이름들을 경로 구분자로 이은 경로가 입력칸에 들어간다', () => {
    expect(getExplorerAddressText(workspace, 'folder:React')).toBe(
      joinPath('바탕 화면', 'Blog', 'React'),
    );
    expect(getExplorerAddressText(workspace, RECYCLE_BIN_ID)).toBe('휴지통');
  });

  it('입력한 경로의 이름을 따라 폴더를 찾고, 대소문자는 구분하지 않는다', () => {
    expect(findExplorerAddressTarget(workspace, joinPath('바탕 화면', 'Blog', 'React'))).toEqual(
      location('folder:React'),
    );
    expect(findExplorerAddressTarget(workspace, joinPath('blog', 'react'))).toEqual(
      location('folder:React'),
    );
    expect(findExplorerAddressTarget(workspace, joinPath(' 바탕 화면 ', ' BLOG ', ''))).toEqual(
      location(BLOG_FOLDER_ID),
    );
    expect(findExplorerAddressTarget(workspace, '바탕 화면')).toEqual(location(null));
  });

  it('휴지통도 받는다', () => {
    expect(findExplorerAddressTarget(workspace, '휴지통')).toEqual(location(RECYCLE_BIN_ID));
  });

  it('경로 끝이 글이나 외부 링크면 그 항목이다', () => {
    expect(findExplorerAddressTarget(workspace, joinPath('Blog', 'React', '가'))).toEqual({
      kind: 'item',
      id: getPostItemId({ collection: 'blog', slug: 'a' }),
    });
    expect(findExplorerAddressTarget(workspace, joinPath('바탕 화면', 'github'))).toEqual({
      kind: 'item',
      id: getLinkItemId('github'),
    });
  });

  it('찾지 못하면 undefined다', () => {
    expect(
      findExplorerAddressTarget(workspace, joinPath('바탕 화면', '없는 폴더')),
    ).toBeUndefined();
    expect(findExplorerAddressTarget(workspace, joinPath('Blog', '가'))).toBeUndefined();
    expect(
      findExplorerAddressTarget(workspace, joinPath('Blog', 'React', '가', 'React')),
    ).toBeUndefined();
    expect(findExplorerAddressTarget(workspace, '')).toBeUndefined();
  });

  it('휴지통 안의 항목은 찾지 않는다', () => {
    const result = trashItems(
      workspace,
      ['folder:React', getLinkItemId('github')],
      '2026-10-28T09:00:00.000Z',
    );
    if (!result.ok) {
      throw new Error(result.reason);
    }
    expect(findExplorerAddressTarget(result.state, joinPath('Blog', 'React'))).toBeUndefined();
    expect(findExplorerAddressTarget(result.state, 'github')).toBeUndefined();
  });
});

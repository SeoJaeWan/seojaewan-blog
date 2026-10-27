// 탐색기 항목의 정렬과 자세히 보기 칸 글자(수정한 날짜, 유형)를 React 밖의 순수 함수로 모은다.

import {
  type ExplorerWorkspace,
  formatDeletedDate,
  getOriginalLocation,
} from '@/features/file-explorer/utils/explorer-location/explorer-location';
import { compareItemKinds, compareItemNames } from '@/shared/utils/item-sort/item-sort';
import type {
  ExplorerFolderView,
  ExplorerSortKey,
  PlacedItem,
  SortDirection,
  WorkspaceItemKind,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 자세히 보기 열(DetailsHeader 열 이름) */
export type ExplorerDetailsColumn =
  'name' | 'modified' | 'type' | 'location' | 'originalLocation' | 'deletedDate';

// 항목 유형 칸의 글자다. Windows 탐색기의 유형 이름을 따른다.
const typeLabels = {
  folder: '파일 폴더',
  post: '블로그 글',
  link: '인터넷 바로 가기',
  'recycle-bin': '휴지통',
} as const satisfies Record<WorkspaceItemKind, string>;

// 날짜만 있는 값(YYYY-MM-DD)이다. 글 작성일은 시간대 변환 없이 그대로 쓴다.
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

/**
 * 항목 유형 칸의 글자. 폴더는 "파일 폴더", 글은 "블로그 글", 외부 링크는 "인터넷 바로 가기"다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param kind 항목 종류
 * @returns 유형 글자
 */
export function getItemTypeLabel(kind: WorkspaceItemKind): string {
  return typeLabels[kind];
}

/**
 * 수정한 날짜 칸의 글자. 글은 작성일, 방문자가 만든 폴더는 만든 날짜(방문자 시간대)이고, 날짜가 없으면 빈 글자다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param date 항목 날짜(YYYY-MM-DD나 ISO 8601). 없으면 null
 * @returns 날짜 글자(YYYY-MM-DD)
 */
export function formatModifiedDate(date: string | null): string {
  if (date === null) {
    return '';
  }
  return DATE_ONLY_PATTERN.test(date) ? date : formatDeletedDate(date);
}

/**
 * 탐색기 항목을 정렬한다. Windows처럼 폴더를 늘 앞에 두고, 그 안에서 정렬 기준과 방향을 따른다.
 * 같으면 이름 오름차순이다. 날짜가 없는 항목은 방향과 상관없이 뒤에 둔다.
 * 휴지통은 수정한 날짜 대신 삭제한 날짜, 유형 대신 원래 위치로 정렬한다(휴지통 자세히 보기의 열).
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param items 항목
 * @param view 폴더 보기(정렬 기준, 방향)
 * @param workspace 작업 공간(휴지통 원래 위치를 구할 때 쓴다)
 * @param isRecycleBin 휴지통 보기인지
 * @returns 정렬한 항목
 */
export function sortExplorerItems<Item extends PlacedItem>(
  items: readonly Item[],
  view: Pick<ExplorerFolderView, 'sortBy' | 'sortDirection'>,
  workspace: ExplorerWorkspace,
  isRecycleBin = false,
): Item[] {
  const sign = view.sortDirection === 'desc' ? -1 : 1;
  return [...items].sort(
    /**
     * 두 항목의 차례를 비교한다.
     * @param a 항목
     * @param b 항목
     * @returns 비교 값
     */
    (a, b) => {
      const byFolder = Number(b.kind === 'folder') - Number(a.kind === 'folder');
      if (byFolder !== 0) {
        return byFolder;
      }
      const byName = compareItemNames(a.name, b.name);
      if (view.sortBy === 'modified') {
        const aDate = isRecycleBin ? (a.trash?.deletedAt ?? null) : a.date;
        const bDate = isRecycleBin ? (b.trash?.deletedAt ?? null) : b.date;
        return compareDatesWithEmptyLast(aDate, bDate, sign) || byName;
      }
      if (view.sortBy === 'type') {
        const byType = isRecycleBin
          ? compareItemNames(getOriginalLocation(workspace, a), getOriginalLocation(workspace, b))
          : compareItemKinds(a.kind, b.kind);
        return sign * byType || byName;
      }
      return sign * byName;
    },
  );
}

/**
 * 자세히 보기의 정렬 열. 휴지통은 수정한 날짜가 삭제한 날짜 열, 유형이 원래 위치 열이다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param sortBy 정렬 기준
 * @param isRecycleBin 휴지통 보기인지
 * @returns 열
 */
export function getSortColumn(
  sortBy: ExplorerSortKey,
  isRecycleBin: boolean,
): ExplorerDetailsColumn {
  if (!isRecycleBin) {
    return sortBy;
  }
  return sortBy === 'modified' ? 'deletedDate' : sortBy === 'type' ? 'originalLocation' : 'name';
}

/**
 * 자세히 보기 열 제목을 누른 뒤의 정렬. 지금 정렬 열이면 방향을 뒤집고, 다른 열이면 그 열의 오름차순이다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param view 지금 정렬
 * @param column 누른 열
 * @returns 새 정렬. 정렬할 수 없는 열이면 undefined
 */
export function getSortAfterColumnClick(
  view: Pick<ExplorerFolderView, 'sortBy' | 'sortDirection'>,
  column: ExplorerDetailsColumn,
): Pick<ExplorerFolderView, 'sortBy' | 'sortDirection'> | undefined {
  const sortBy = getSortKeyOfColumn(column);
  if (sortBy === undefined) {
    return undefined;
  }
  if (sortBy === view.sortBy) {
    const sortDirection: SortDirection = view.sortDirection === 'asc' ? 'desc' : 'asc';
    return { sortBy, sortDirection };
  }
  return { sortBy, sortDirection: 'asc' };
}

/**
 * 열의 정렬 기준.
 * @param column 열
 * @returns 정렬 기준. 정렬할 수 없는 열이면 undefined
 */
function getSortKeyOfColumn(column: ExplorerDetailsColumn): ExplorerSortKey | undefined {
  switch (column) {
    case 'name':
      return 'name';
    case 'modified':
    case 'deletedDate':
      return 'modified';
    case 'type':
    case 'originalLocation':
      return 'type';
    case 'location':
      return undefined;
  }
}

/**
 * 날짜를 방향대로 비교한다(오름차순은 오래된 것이 앞). 날짜가 없으면 방향과 상관없이 뒤다.
 * @param a 날짜
 * @param b 날짜
 * @param sign 방향(1 오름차순, -1 내림차순)
 * @returns 비교 값
 */
function compareDatesWithEmptyLast(a: string | null, b: string | null, sign: number): number {
  if (a === b) {
    return 0;
  }
  if (a === null) {
    return 1;
  }
  if (b === null) {
    return -1;
  }
  return sign * a.localeCompare(b);
}

import {
  DESKTOP_NAME,
  getFolderPath,
  type PlacedItem,
  RECYCLE_BIN_ID,
  RECYCLE_BIN_NAME,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';

/** 탐색기가 읽는 작업 공간. 항목 배치다 */
export type ExplorerWorkspace = Pick<WorkspaceState, 'items'>;

// 창 제목 뒤에 붙는 앱 이름이다.
const EXPLORER_TITLE_SUFFIX = ' - 파일 탐색기';

// 휴지통 원래 위치 칸에서 위치 이름을 잇는 글자(Windows 경로 구분자).
const LOCATION_SEPARATOR = '\\';

/**
 * 탐색기 위치 이름. 바탕화면은 "바탕 화면", 휴지통은 "휴지통", 폴더는 폴더 이름이다. 탭 제목과 검색 안내 글자에 쓴다.
 * 없는 폴더는 바탕 화면으로 본다.
 * @codocs [[파일 탐색기:탭]]
 * @param workspace 작업 공간
 * @param folderId 보고 있는 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 * @returns 위치 이름
 */
export function getExplorerLocationName(
  workspace: ExplorerWorkspace,
  folderId: string | null,
): string {
  if (folderId === null) {
    return DESKTOP_NAME;
  }
  if (folderId === RECYCLE_BIN_ID) {
    return RECYCLE_BIN_NAME;
  }
  return workspace.items[folderId]?.name ?? DESKTOP_NAME;
}

/**
 * 탐색기 창 제목(창 영역의 접근성 이름, 작업 표시줄 창 미리보기 제목). 보고 있는 위치 이름 뒤에 앱 이름을 붙인다.
 * @codocs [[파일 탐색기:탭]]
 * @param workspace 작업 공간
 * @param folderId 보고 있는 위치
 * @returns 창 제목
 */
export function getExplorerWindowTitle(
  workspace: ExplorerWorkspace,
  folderId: string | null,
): string {
  return `${getExplorerLocationName(workspace, folderId)}${EXPLORER_TITLE_SUFFIX}`;
}

/**
 * 위치 칸(Breadcrumb)의 이름들. 폴더는 바탕 화면부터 그 폴더까지, 휴지통은 휴지통 하나다.
 * @codocs [[파일 탐색기:구성]]
 * @param workspace 작업 공간
 * @param folderId 보고 있는 위치
 * @returns 위에서부터의 위치 이름
 */
export function getExplorerLocationPath(
  workspace: ExplorerWorkspace,
  folderId: string | null,
): string[] {
  if (folderId === RECYCLE_BIN_ID) {
    return [RECYCLE_BIN_NAME];
  }
  const folders = folderId === null ? [] : getFolderPath(workspace, folderId);
  return [DESKTOP_NAME, ...folders.map((folder) => folder.name)];
}

/**
 * 휴지통 자세히 보기의 원래 위치 칸. 바탕 화면부터 원래 상위 폴더까지를 `\`로 잇는다(예: `바탕 화면\Blog`).
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param workspace 작업 공간
 * @param item 지운 항목
 * @returns 원래 위치
 */
export function getOriginalLocation(workspace: ExplorerWorkspace, item: PlacedItem): string {
  return getExplorerLocationPath(workspace, item.trash?.originalParentId ?? null).join(
    LOCATION_SEPARATOR,
  );
}

/**
 * ISO 시각을 방문자 시간대의 날짜(YYYY-MM-DD)로 바꾼다. 휴지통 자세히 보기의 삭제한 날짜 칸에 쓴다.
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param isoTime ISO 8601 시각
 * @returns 날짜. 읽을 수 없으면 빈 글자
 */
export function formatDeletedDate(isoTime: string): string {
  const time = new Date(isoTime);
  if (Number.isNaN(time.getTime())) {
    return '';
  }
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const day = String(time.getDate()).padStart(2, '0');
  return `${String(time.getFullYear())}-${month}-${day}`;
}

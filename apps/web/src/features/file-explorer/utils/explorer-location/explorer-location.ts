import {
  DESKTOP_NAME,
  getFolderPath,
  isItemInTrash,
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
  return getExplorerLocationTrail(workspace, folderId).map((entry) => entry.name);
}

/**
 * 위치 칸(Breadcrumb)의 위치와 이름. 폴더는 바탕 화면부터 그 폴더까지, 휴지통은 휴지통 하나다. 칸을 누르면 그 위치로 간다.
 * @codocs [[파일 탐색기:구성]]
 * @param workspace 작업 공간
 * @param folderId 보고 있는 위치
 * @returns 위에서부터의 위치와 이름
 */
export function getExplorerLocationTrail(
  workspace: ExplorerWorkspace,
  folderId: string | null,
): { location: string | null; name: string }[] {
  if (folderId === RECYCLE_BIN_ID) {
    return [{ location: RECYCLE_BIN_ID, name: RECYCLE_BIN_NAME }];
  }
  const folders = folderId === null ? [] : getFolderPath(workspace, folderId);
  return [
    { location: null, name: DESKTOP_NAME },
    ...folders.map((folder) => ({ location: folder.id, name: folder.name })),
  ];
}

/**
 * 주소창 편집의 처음 글자. 위치 칸의 이름들을 `\`로 잇는다(예: `바탕 화면\Blog\JavaScript`, 휴지통은 `휴지통`).
 * @codocs [[파일 탐색기:주소창 편집]]
 * @param workspace 작업 공간
 * @param folderId 보고 있는 위치
 * @returns 경로 글자
 */
export function getExplorerAddressText(
  workspace: ExplorerWorkspace,
  folderId: string | null,
): string {
  return getExplorerLocationPath(workspace, folderId).join(LOCATION_SEPARATOR);
}

/**
 * 주소창에 입력한 경로가 가리키는 것. location은 갈 위치(폴더 id, 휴지통 id, 바탕화면은 null)이고,
 * item은 열 항목(글, 외부 링크)의 id, trashed는 휴지통에 있는 항목(글, 폴더, 외부 링크)의 id와 종류다.
 */
export type ExplorerAddressTarget =
  | { kind: 'location'; location: string | null }
  | { kind: 'item'; id: string }
  | { kind: 'trashed'; id: string; itemKind: PlacedItem['kind'] };

/**
 * 주소창에 입력한 경로가 가리키는 위치나 항목을 찾는다. `\`로 나눈 이름을 따라 바탕 화면부터 찾고, 대소문자는 구분하지 않는다.
 * 첫 이름이 `바탕 화면`이면 건너뛴다(없어도 바탕 화면부터 찾는다). 첫 이름이 `휴지통`이면 휴지통부터 찾고, `휴지통` 하나면 휴지통이다.
 * 이름 앞뒤 공백과 빈 이름(끝의 `\`)은 무시한다.
 * - 중간 이름은 폴더, 마지막 이름은 폴더를 먼저 찾고 없으면 글(제목)·외부 링크를 찾는다.
 * - 휴지통에 보낸 항목은 원래 위치(휴지통 원래 위치 칸과 같은 경로)에서도 찾는다. 같은 이름이면 휴지통 밖의 항목을 먼저 고르고,
 *   그다음은 앞의 것이다.
 * - 찾은 항목이 휴지통에 있으면(휴지통에 든 폴더 안 포함) 열지 않고 trashed로 돌려준다.
 * @codocs [[파일 탐색기:주소창 편집]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param workspace 작업 공간
 * @param text 입력한 경로
 * @returns 찾은 위치나 항목. 못 찾으면 undefined
 */
export function findExplorerAddressTarget(
  workspace: ExplorerWorkspace,
  text: string,
): ExplorerAddressTarget | undefined {
  const names = text
    .split(LOCATION_SEPARATOR)
    .map((name) => name.trim())
    .filter((name) => name !== '');
  const [firstName] = names;
  if (firstName === undefined) {
    return undefined;
  }
  const isFromRecycleBin = isSameName(firstName, RECYCLE_BIN_NAME);
  if (isFromRecycleBin && names.length === 1) {
    return { kind: 'location', location: RECYCLE_BIN_ID };
  }
  const childNames =
    isFromRecycleBin || isSameName(firstName, DESKTOP_NAME) ? names.slice(1) : names;
  let current: string | null = isFromRecycleBin ? RECYCLE_BIN_ID : null;
  let found: PlacedItem | undefined;
  for (const [index, name] of childNames.entries()) {
    const isLast = index === childNames.length - 1;
    found = findChildByName(workspace, current, name, isLast);
    if (found === undefined) {
      return undefined;
    }
    current = found.id;
  }
  if (found === undefined) {
    return { kind: 'location', location: null };
  }
  if (isItemInTrash(workspace, found.id)) {
    return { kind: 'trashed', id: found.id, itemKind: found.kind };
  }
  return found.kind === 'folder'
    ? { kind: 'location', location: found.id }
    : { kind: 'item', id: found.id };
}

/**
 * 위치 아래에서 이름이 같은 항목을 찾는다. 그 위치에 놓인 항목과, 그 위치에서 휴지통으로 보낸 항목을 함께 본다.
 * 휴지통 밖의 항목, 폴더(마지막 이름이면 그다음 글·외부 링크) 차례로 고르고, 같으면 앞의 것이다.
 * @param workspace 작업 공간
 * @param parentId 위치(폴더 id, 휴지통 id, 바탕화면은 null)
 * @param name 이름
 * @param isLast 경로의 마지막 이름인지. 아니면 폴더만 찾는다
 * @returns 찾은 항목. 없으면 undefined
 */
function findChildByName(
  workspace: ExplorerWorkspace,
  parentId: string | null,
  name: string,
  isLast: boolean,
): PlacedItem | undefined {
  let best: PlacedItem | undefined;
  for (const item of Object.values(workspace.items)) {
    if (
      item.kind === 'recycle-bin' ||
      (!isLast && item.kind !== 'folder') ||
      !isSameName(item.name, name) ||
      (item.parentId !== parentId && item.trash?.originalParentId !== parentId)
    ) {
      continue;
    }
    if (best === undefined || getChildRank(workspace, item) < getChildRank(workspace, best)) {
      best = item;
    }
  }
  return best;
}

/**
 * 이름이 같은 항목끼리 고르는 차례. 작을수록 먼저다. 휴지통 밖의 항목, 폴더 차례다.
 * @param workspace 작업 공간
 * @param item 항목
 * @returns 차례
 */
function getChildRank(workspace: ExplorerWorkspace, item: PlacedItem): number {
  return (isItemInTrash(workspace, item.id) ? 2 : 0) + (item.kind === 'folder' ? 0 : 1);
}

/**
 * 두 이름이 대소문자를 빼고 같은지 본다.
 * @param a 이름
 * @param b 이름
 * @returns 같으면 true
 */
function isSameName(a: string | undefined, b: string): boolean {
  return a !== undefined && a.toLocaleLowerCase() === b.toLocaleLowerCase();
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

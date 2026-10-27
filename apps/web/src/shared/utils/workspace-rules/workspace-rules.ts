// 작업 공간(항목 배치, 휴지통, 방문자별 설정) 규칙을 React 밖의 순수 함수로 모은다. 저장소(`workspace-store.ts`)는 이 함수만 부른다.
// 근거는 [[기술 스택:상태 관리]], 위치는 [[저장소 구성:앱 폴더 구조]]이다.

import type { Asset } from '@seojaewan/design-system';
import type { ComponentProps } from 'react';

import type { WindowApp } from '@/shared/utils/window-rules/window-rules';

/** 휴지통 id. 휴지통은 바탕화면에 고정된 항목이고, 휴지통으로 보낸 항목의 상위 폴더 자리에 이 id가 들어간다 */
export const RECYCLE_BIN_ID = 'recycle-bin';

/** 휴지통 이름 */
export const RECYCLE_BIN_NAME = '휴지통';

/** `Blog` 폴더 id. Notion 폴더 경로의 뿌리이고, 새 글이 들어갈 곳이 없을 때 가는 기본 폴더다 */
export const BLOG_FOLDER_ID = 'blog';

/** `Blog` 폴더의 처음 이름 */
export const BLOG_FOLDER_NAME = 'Blog';

/** 바탕화면 위치 이름(탐색기 탭 제목, 위치 칸) */
export const DESKTOP_NAME = '바탕 화면';

/** 새 폴더의 기본 이름 */
export const NEW_FOLDER_NAME = '새 폴더';

/** 폴더 이름의 최대 길이 */
export const FOLDER_NAME_MAX_LENGTH = 255;

/** 앱을 Start 고정 목록에 넣을 때 쓰는 id. 앱은 작업 공간 항목이 아니라 배치가 없다 */
export const APP_ITEM_IDS = { 'file-explorer': 'app:file-explorer', chrome: 'app:chrome' } as const;

/** 작업 표시줄에 처음 고정된 앱 */
export const INITIAL_TASKBAR_PINS = ['file-explorer', 'chrome'] as const;

/** 창을 여는 앱 목록. 저장된 작업 표시줄 고정 목록을 검증할 때 쓴다 */
export const WINDOW_APPS = ['file-explorer', 'chrome'] as const;

/** 바탕화면 아이콘 크기(큰·보통·작은 아이콘) */
export const DESKTOP_ICON_SIZES = ['large', 'medium', 'small'] as const;

/** 바탕화면 정렬 기준(이름·항목 유형·수정한 날짜) */
export const DESKTOP_SORT_KEYS = ['name', 'type', 'modified'] as const;

/** Start 모두 목록의 보기(간단히·그리드·범주) */
export const START_ALL_VIEWS = ['list', 'grid', 'category'] as const;

/** 탐색기 보기(큰 아이콘·보통 아이콘·자세히) */
export const EXPLORER_VIEWS = ['large', 'medium', 'details'] as const;

/** 탐색기 정렬 기준(이름·수정한 날짜·유형) */
export const EXPLORER_SORT_KEYS = ['name', 'modified', 'type'] as const;

/** 정렬 방향 */
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

/** 최근 연 항목을 기억하는 최대 개수. 화면은 이 가운데 휴지통에 없는 앞쪽 몇 개만 보인다 */
export const RECENT_ITEMS_LIMIT = 20;

/** 탐색기 폴더별 보기를 저장할 때 바탕화면 위치에 쓰는 열쇠 */
export const DESKTOP_LOCATION_KEY = 'desktop';

/** 바탕화면 설정의 처음 값. 보통 아이콘, 자동 정렬 켜짐, 이름순이다 */
export const DEFAULT_DESKTOP_SETTINGS = {
  iconSize: 'medium',
  autoArrange: true,
  sortBy: 'name',
  positions: {},
} as const;

/** 탐색기 폴더 보기의 처음 값. 보통 아이콘, 이름 오름차순이다 */
export const DEFAULT_EXPLORER_VIEW = {
  view: 'medium',
  sortBy: 'name',
  sortDirection: 'asc',
} as const;

// Windows에서 파일 이름으로 쓸 수 없는 문자(`< > : " / \ | ? *`와 제어 문자)다. 제어 문자는 문자 코드(32 미만)로 본다.
const invalidNameCharacters: ReadonlySet<string> = new Set([
  '<',
  '>',
  ':',
  '"',
  '/',
  '\\',
  '|',
  '?',
  '*',
]);
const CONTROL_CHARACTER_LIMIT = 32;

// 확장자와 대소문자에 관계없이 쓸 수 없는 Windows 예약 이름이다.
const reservedNames: ReadonlySet<string> = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].flatMap((digit) => [
    `COM${digit}`,
    `LPT${digit}`,
  ]),
]);

/** 바탕화면 아이콘 크기 */
export type DesktopIconSize = (typeof DESKTOP_ICON_SIZES)[number];

/** 바탕화면 정렬 기준 */
export type DesktopSortKey = (typeof DESKTOP_SORT_KEYS)[number];

/** Start 모두 목록의 보기 */
export type StartAllViewSetting = (typeof START_ALL_VIEWS)[number];

/** 탐색기 보기 */
export type ExplorerViewMode = (typeof EXPLORER_VIEWS)[number];

/** 탐색기 정렬 기준 */
export type ExplorerSortKey = (typeof EXPLORER_SORT_KEYS)[number];

/** 정렬 방향 */
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** 외부 링크 아이콘. 디자인 시스템 SVG 자산 이름이다 */
export type LinkIcon = ComponentProps<typeof Asset>['name'];

/** 바탕화면 격자 칸 좌표. 0부터 센다 */
export type GridCell = {
  /** 열 */
  column: number;
  /** 행 */
  row: number;
};

/** 휴지통으로 보낸 기록. 복원할 위치와 삭제한 날짜다 */
export type TrashRecord = {
  /** 휴지통으로 보내기 전의 상위 폴더 id. 바탕화면이면 null */
  originalParentId: string | null;
  /** 삭제한 시각(ISO 8601) */
  deletedAt: string;
};

/** 배치가 있는 항목(폴더, 글, 외부 링크)의 공통 속성 */
type PlacedItemBase = {
  /** 바뀌지 않는 고유 id */
  id: string;
  /** 이름. 글은 제목이다 */
  name: string;
  /** 놓인 위치(상위 폴더 id). 바탕화면이면 null, 휴지통으로 보냈으면 휴지통 id다 */
  parentId: string | null;
  /** 휴지통 기록. 휴지통에 바로 들어 있는 항목만 있다 */
  trash: TrashRecord | null;
  /** 수정한 날짜로 쓰는 날짜. 글은 작성일(YYYY-MM-DD), 방문자가 만든 폴더는 만든 시각(ISO 8601), 그 밖은 null */
  date: string | null;
};

/** 폴더. Notion `폴더` 속성에서 만들어지거나 방문자가 만든다 */
export type FolderItem = PlacedItemBase & {
  /** 종류 */
  kind: 'folder';
};

/** 글. Notion 글 하나다 */
export type PostItem = PlacedItemBase & {
  /** 종류 */
  kind: 'post';
  /** 글 주소 `/posts/<slug>`의 slug */
  slug: string;
  /** 작성일(YYYY-MM-DD) */
  date: string;
};

/** 외부 링크. 코드 설정 파일에서 정의한다 */
export type LinkItem = PlacedItemBase & {
  /** 종류 */
  kind: 'link';
  /** 실제 브라우저 새 탭에서 열 주소 */
  url: string;
  /** 아이콘 */
  icon: LinkIcon;
};

/** 휴지통. 바탕화면에 고정되며 옮기거나 이름을 바꾸거나 지울 수 없다 */
export type RecycleBinItem = {
  /** 종류 */
  kind: 'recycle-bin';
  /** 휴지통 id */
  id: typeof RECYCLE_BIN_ID;
  /** 이름 */
  name: string;
  /** 늘 바탕화면이다 */
  parentId: null;
  /** 휴지통 기록이 없다 */
  trash: null;
  /** 날짜가 없다 */
  date: null;
};

/** 배치가 있는 항목 */
export type PlacedItem = FolderItem | PostItem | LinkItem;

/** 작업 공간 항목 */
export type WorkspaceItem = PlacedItem | RecycleBinItem;

/** 작업 공간 항목 종류 */
export type WorkspaceItemKind = WorkspaceItem['kind'];

/** 글 색인 한 줄. 서버(`content/`)가 Notion 글 데이터베이스에서 읽어 넘긴다 */
export type PostSummary = {
  /** 글 주소의 slug */
  slug: string;
  /** 제목 */
  title: string;
  /** `폴더` 속성을 `/`로 나눈 경로. 비어 있으면 `Blog` 폴더에 넣는다 */
  folderPath: readonly string[];
  /** 작성일(YYYY-MM-DD) */
  date: string;
};

/** 외부 링크 설정 한 줄 */
export type ExternalLinkConfig = {
  /** 설정의 id. 항목 id는 `link:<id>`다 */
  id: string;
  /** 이름 */
  name: string;
  /** 주소 */
  url: string;
  /** 아이콘 */
  icon: LinkIcon;
  /** 처음 놓일 위치(상위 폴더 id). 바탕화면이면 null */
  initialParentId: string | null;
  /** 처음부터 Start 고정됨에 있는지 */
  pinnedToStart: boolean;
};

/** 작업 공간을 만드는 원본. Notion 글 색인과 외부 링크 설정이다 */
export type WorkspaceCatalog = {
  /** 글 색인 */
  posts: readonly PostSummary[];
  /** 외부 링크 설정 */
  links: readonly ExternalLinkConfig[];
};

/** 바탕화면 설정 */
export type DesktopSettings = {
  /** 아이콘 크기 */
  iconSize: DesktopIconSize;
  /** 아이콘 자동 정렬 */
  autoArrange: boolean;
  /** 정렬 기준 */
  sortBy: DesktopSortKey;
  /** 자동 정렬을 끄고 옮긴 아이콘의 격자 칸. 항목 id로 찾는다 */
  positions: Readonly<Record<string, GridCell>>;
};

/** 탐색기 폴더 하나의 보기와 정렬 */
export type ExplorerFolderView = {
  /** 보기 */
  view: ExplorerViewMode;
  /** 정렬 기준 */
  sortBy: ExplorerSortKey;
  /** 정렬 방향 */
  sortDirection: SortDirection;
};

/** 작업 공간 상태. 방문자 브라우저에 저장하는 범위 전체다 */
export type WorkspaceState = {
  /** 항목. id로 찾는다. 넣은 차례를 지킨다 */
  items: Readonly<Record<string, WorkspaceItem>>;
  /** 바탕화면 설정 */
  desktop: DesktopSettings;
  /** Start 고정됨의 항목 id 순서. 앱은 `APP_ITEM_IDS`의 id다 */
  startPins: readonly string[];
  /** Start 모두 목록의 보기 */
  startAllView: StartAllViewSetting;
  /** 작업 표시줄에 고정한 앱의 순서 */
  taskbarPins: readonly WindowApp[];
  /** 탐색기 폴더별 보기와 정렬. 폴더 id(바탕화면은 `DESKTOP_LOCATION_KEY`)로 찾는다 */
  explorerViews: Readonly<Record<string, ExplorerFolderView>>;
  /** 최근 연 항목 id. 앞이 가장 최근이다 */
  recentItemIds: readonly string[];
};

/** 작업 공간 규칙이 바꾸기를 거부한 이유 */
export type WorkspaceRejectReason =
  | 'not-found'
  | 'protected'
  | 'in-trash'
  | 'not-in-trash'
  | 'invalid-target'
  | 'into-itself'
  | 'into-descendant'
  | 'name-conflict'
  | FolderNameError;

/** 폴더 이름이 맞지 않는 이유 */
export type FolderNameError =
  | 'empty'
  | 'too-long'
  | 'invalid-character'
  | 'reserved-name'
  | 'trailing-space-or-dot'
  | 'duplicate';

/** 규칙 결과. 바꾼 상태나 거부 이유다 */
export type WorkspaceResult =
  { ok: true; state: WorkspaceState } | { ok: false; reason: WorkspaceRejectReason };

/** 폴더 이름 검증 결과 */
export type FolderNameResult = { ok: true } | { ok: false; reason: FolderNameError };

/** 폴더 트리의 칸 하나 */
export type FolderTreeNode = {
  /** 폴더 */
  folder: FolderItem;
  /** 하위 폴더 */
  children: FolderTreeNode[];
};

/**
 * 항목을 열 때 할 일.
 * - `explorer`: 그 폴더(휴지통 포함)의 새 탐색기 창
 * - `post`: Chrome에서 그 글
 * - `external`: 실제 브라우저의 새 탭
 * - `app`: 그 앱의 창
 * - `none`: 열 수 없다(없는 항목, 휴지통 안의 항목)
 */
export type ItemOpenAction =
  | { type: 'explorer'; folderId: string }
  | { type: 'post'; slug: string }
  | { type: 'external'; url: string }
  | { type: 'app'; app: WindowApp }
  | { type: 'none' };

const recycleBinItem: RecycleBinItem = {
  kind: 'recycle-bin',
  id: RECYCLE_BIN_ID,
  name: RECYCLE_BIN_NAME,
  parentId: null,
  trash: null,
  date: null,
};

const blogFolderItem: FolderItem = {
  kind: 'folder',
  id: BLOG_FOLDER_ID,
  name: BLOG_FOLDER_NAME,
  parentId: null,
  trash: null,
  date: null,
};

/**
 * Notion `폴더` 경로에서 만든 폴더의 고정 id를 만든다. 경로가 비어 있으면 `Blog` 폴더다.
 * 경로가 같으면 늘 같은 id라, 방문자가 이름을 바꾸거나 옮겨도 새 글이 그 폴더를 찾는다.
 * @codocs [[항목 모델:식별]]
 * @codocs [[작업 공간:Notion과 맞추기]]
 * @param path 폴더 경로
 * @returns 폴더 id
 */
export function getNotionFolderId(path: readonly string[]): string {
  return path.length === 0 ? BLOG_FOLDER_ID : `folder:${path.join('/')}`;
}

/**
 * 글 항목 id를 만든다.
 * @codocs [[항목 모델:식별]]
 * @param slug 글 slug
 * @returns `post:<slug>`
 */
export function getPostItemId(slug: string): string {
  return `post:${slug}`;
}

/**
 * 외부 링크 항목 id를 만든다.
 * @codocs [[항목 모델:식별]]
 * @param configId 설정의 id
 * @returns `link:<id>`
 */
export function getLinkItemId(configId: string): string {
  return `link:${configId}`;
}

/**
 * 저장된 상태가 없을 때의 초기 구조를 만든다. 바탕화면에 휴지통과 `Blog` 폴더를 두고, 글의 `폴더` 경로대로
 * `Blog` 아래에 폴더를 만들어 글을 넣는다(경로가 비면 `Blog`). 외부 링크는 설정의 초기 위치에 둔다.
 * Start 고정됨은 File Explorer, Chrome, `Blog` 폴더, 처음부터 고정하도록 정한 외부 링크다.
 * @codocs [[작업 공간:초기 구조]]
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param catalog 글 색인과 외부 링크 설정
 * @returns 초기 상태
 */
export function createInitialWorkspace(catalog: WorkspaceCatalog): WorkspaceState {
  const items: Record<string, WorkspaceItem> = {
    [RECYCLE_BIN_ID]: recycleBinItem,
    [BLOG_FOLDER_ID]: blogFolderItem,
  };
  for (const post of catalog.posts) {
    addNotionFolders(items, post.folderPath);
  }
  for (const link of catalog.links) {
    const parentId = isOpenFolder(items, link.initialParentId) ? link.initialParentId : null;
    items[getLinkItemId(link.id)] = createLinkItem(link, parentId, null);
  }
  for (const post of catalog.posts) {
    items[getPostItemId(post.slug)] = createPostItem(
      post,
      getNotionFolderId(post.folderPath),
      null,
    );
  }
  return {
    items,
    desktop: DEFAULT_DESKTOP_SETTINGS,
    startPins: [
      APP_ITEM_IDS['file-explorer'],
      APP_ITEM_IDS.chrome,
      BLOG_FOLDER_ID,
      ...catalog.links.filter((link) => link.pinnedToStart).map((link) => getLinkItemId(link.id)),
    ],
    startAllView: 'list',
    taskbarPins: INITIAL_TASKBAR_PINS,
    explorerViews: {},
    recentItemIds: [],
  };
}

/**
 * 저장된 상태를 지금 글 색인·외부 링크 설정과 맞춘다. 방문할 때마다 부른다.
 * - 새 글은 `폴더` 경로의 폴더(id로 찾는다)에 넣고, 그 폴더가 없거나 휴지통에 있으면 `Blog`에 넣는다.
 * - 방문자가 옮겨 둔 기존 글은 그 자리에 둔다. 제목과 작성일은 색인을 따른다.
 * - 색인에서 사라진 글과 설정에서 사라진 외부 링크는 지운다. 외부 링크의 이름·주소·아이콘은 설정을 따른다.
 * - 새 외부 링크는 설정의 초기 위치(없거나 휴지통에 있으면 바탕화면)에 둔다.
 * 맞추기 전에 깨진 배치를 고친다(`repairWorkspace`). 글·외부 링크 id를 차지한 폴더는 먼저 버린다.
 * @codocs [[작업 공간:Notion과 맞추기]]
 * @param saved 저장된 상태(배치만 있는 형태)
 * @param catalog 글 색인과 외부 링크 설정
 * @returns 맞춘 상태
 */
export function reconcileWorkspace(
  saved: SavedWorkspaceShape,
  catalog: WorkspaceCatalog,
): WorkspaceState {
  const postsById = new Map(catalog.posts.map((post) => [getPostItemId(post.slug), post]));
  const linksById = new Map(catalog.links.map((link) => [getLinkItemId(link.id), link]));
  const items: Record<string, WorkspaceItem> = { [RECYCLE_BIN_ID]: recycleBinItem };
  for (const [id, savedItem] of Object.entries(saved.items)) {
    if (id === RECYCLE_BIN_ID) {
      continue;
    }
    // 글·외부 링크 id(`post:`, `link:`)를 차지한 폴더는 깨진 저장분이라 버린다. 그 하위 항목은 복구에서 바탕화면으로 간다.
    if (savedItem.kind === 'folder' && isSourceItemId(id)) {
      continue;
    }
    if (savedItem.kind === 'folder') {
      items[id] = {
        kind: 'folder',
        id,
        name: savedItem.name,
        parentId: savedItem.parentId,
        trash: savedItem.trash,
        date: savedItem.date,
      };
      continue;
    }
    const post = savedItem.kind === 'post' ? postsById.get(id) : undefined;
    if (post !== undefined) {
      items[id] = createPostItem(post, savedItem.parentId, savedItem.trash);
    }
    const link = savedItem.kind === 'link' ? linksById.get(id) : undefined;
    if (link !== undefined) {
      items[id] = createLinkItem(link, savedItem.parentId, savedItem.trash);
    }
  }
  if (items[BLOG_FOLDER_ID]?.kind !== 'folder') {
    items[BLOG_FOLDER_ID] = blogFolderItem;
  }
  const repaired: Record<string, WorkspaceItem> = { ...repairWorkspace({ ...saved, items }).items };
  for (const [id, link] of linksById) {
    if (repaired[id]?.kind !== 'link') {
      const parentId = isOpenFolder(repaired, link.initialParentId) ? link.initialParentId : null;
      repaired[id] = createLinkItem(link, parentId, null);
    }
  }
  for (const [id, post] of postsById) {
    if (repaired[id]?.kind !== 'post') {
      const folderId = getNotionFolderId(post.folderPath);
      repaired[id] = createPostItem(
        post,
        isOpenFolder(repaired, folderId) ? folderId : BLOG_FOLDER_ID,
        null,
      );
    }
  }
  return cleanReferences({
    items: repaired,
    desktop: saved.desktop,
    startPins: saved.startPins,
    startAllView: saved.startAllView,
    taskbarPins: saved.taskbarPins,
    explorerViews: saved.explorerViews,
    recentItemIds: saved.recentItemIds,
  });
}

/** 맞추기에 넘기는 저장된 상태. 배치만 담고 이름·주소 같은 원본 값은 색인과 설정에서 다시 채운다 */
export type SavedWorkspaceShape = Omit<WorkspaceState, 'items'> & {
  /** 항목 배치. 폴더만 이름과 날짜를 갖는다 */
  items: Readonly<Record<string, SavedItemShape>>;
};

/** 저장된 항목 하나 */
export type SavedItemShape =
  | {
      /** 종류 */
      kind: 'folder';
      /** 이름 */
      name: string;
      /** 상위 폴더 id */
      parentId: string | null;
      /** 휴지통 기록 */
      trash: TrashRecord | null;
      /** 만든 시각 */
      date: string | null;
    }
  | {
      /** 종류 */
      kind: 'post' | 'link';
      /** 상위 폴더 id */
      parentId: string | null;
      /** 휴지통 기록 */
      trash: TrashRecord | null;
    };

/**
 * 배치만 남긴 저장 형태로 바꾼다. 글과 외부 링크의 이름·주소는 원본(색인, 설정)이 갖으므로 저장하지 않는다. 휴지통은 늘 있어 빼다.
 * @codocs [[작업 공간:방문자별 저장]]
 * @param state 작업 공간 상태
 * @returns 저장 형태
 */
export function toSavedWorkspace(state: WorkspaceState): SavedWorkspaceShape {
  const items: Record<string, SavedItemShape> = {};
  for (const item of Object.values(state.items)) {
    if (item.kind === 'recycle-bin') {
      continue;
    }
    items[item.id] =
      item.kind === 'folder'
        ? {
            kind: 'folder',
            name: item.name,
            parentId: item.parentId,
            trash: item.trash,
            date: item.date,
          }
        : { kind: item.kind, parentId: item.parentId, trash: item.trash };
  }
  return { ...state, items };
}

/**
 * 깨진 배치를 고친다. 상위 폴더가 없거나 폴더가 아니면, 또는 상위로 올라가다 자기에게 돌아오면 바탕화면으로 옮긴다.
 * 휴지통 자리와 휴지통 기록이 어긋나면(기록 없이 휴지통에 있거나, 기록이 있는데 휴지통 밖에 있으면) 바탕화면 쪽으로 맞춘다.
 * `Blog` 폴더가 휴지통 안에 있으면(휴지통에 보낸 상위 폴더 안에 있어도) 바탕화면으로 꺼낸다. 없는 항목을 가리키는 고정·최근·아이콘 칸·폴더 보기도 지운다.
 * @codocs [[작업 공간:Notion과 맞추기]]
 * @codocs [[작업 공간:휴지통]]
 * @param state 작업 공간 상태
 * @returns 고친 상태
 */
export function repairWorkspace(state: WorkspaceState): WorkspaceState {
  const items: Record<string, WorkspaceItem> = { ...state.items, [RECYCLE_BIN_ID]: recycleBinItem };
  for (const item of Object.values(items)) {
    if (item.kind === 'recycle-bin') {
      continue;
    }
    let { parentId, trash } = item;
    const isParentValid =
      parentId === null || parentId === RECYCLE_BIN_ID || items[parentId]?.kind === 'folder';
    if (!isParentValid) {
      parentId = null;
    }
    if (parentId === RECYCLE_BIN_ID && trash === null) {
      parentId = null;
    }
    if (parentId !== RECYCLE_BIN_ID && trash !== null) {
      trash = null;
    }
    if (item.id === BLOG_FOLDER_ID && parentId === RECYCLE_BIN_ID) {
      parentId = null;
      trash = null;
    }
    if (parentId !== item.parentId || trash !== item.trash) {
      items[item.id] = { ...item, parentId, trash };
    }
  }
  for (const id of Object.keys(items)) {
    const item = items[id];
    if (item !== undefined && item.kind !== 'recycle-bin' && hasParentCycle(items, id)) {
      items[id] = { ...item, parentId: null, trash: null };
    }
  }
  const blog = items[BLOG_FOLDER_ID];
  if (
    blog !== undefined &&
    blog.kind !== 'recycle-bin' &&
    isItemInTrash({ items }, BLOG_FOLDER_ID)
  ) {
    items[BLOG_FOLDER_ID] = { ...blog, parentId: null, trash: null };
  }
  return cleanReferences({ ...state, items });
}

/**
 * 폴더 이름이 Windows 11 파일 이름 규칙에 맞는지 본다. 같은 위치의 다른 폴더 이름과 겹치는지도 본다
 * (대소문자와 유니코드 정규화 차이는 무시한다).
 * @codocs [[작업 공간:폴더 이름]]
 * @param name 입력한 이름
 * @param siblingNames 같은 위치에 있는 다른 폴더의 이름
 * @returns 맞으면 ok, 아니면 이유
 */
export function validateFolderName(
  name: string,
  siblingNames: readonly string[],
): FolderNameResult {
  if (name.trim() === '') {
    return { ok: false, reason: 'empty' };
  }
  if (name.length > FOLDER_NAME_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  const hasInvalidCharacter = hasInvalidNameCharacter(name);
  if (hasInvalidCharacter) {
    return { ok: false, reason: 'invalid-character' };
  }
  const baseName = (name.split('.')[0] ?? '').trimEnd().toUpperCase();
  if (name === '.' || name === '..' || reservedNames.has(baseName)) {
    return { ok: false, reason: 'reserved-name' };
  }
  if (name.endsWith(' ') || name.endsWith('.')) {
    return { ok: false, reason: 'trailing-space-or-dot' };
  }
  const key = getFolderNameKey(name);
  if (siblingNames.some((sibling) => getFolderNameKey(sibling) === key)) {
    return { ok: false, reason: 'duplicate' };
  }
  return { ok: true };
}

/**
 * 새 폴더의 이름을 고른다. `새 폴더`가 비어 있으면 그 이름, 아니면 `새 폴더 (2)`부터 가장 작은 빈 번호다.
 * @codocs [[작업 공간:폴더 이름]]
 * @param siblingNames 같은 위치에 있는 폴더의 이름
 * @returns 새 폴더 이름
 */
export function getNewFolderName(siblingNames: readonly string[]): string {
  return getFreeFolderName(NEW_FOLDER_NAME, siblingNames);
}

/**
 * 위치에 새 폴더를 만든다. 이름은 `getNewFolderName`이 고른다. 위치가 없거나 휴지통 안이면 거부한다.
 * @codocs [[작업 공간:폴더 이름]]
 * @codocs [[작업 공간:배치]]
 * @param state 작업 공간 상태
 * @param parentId 만들 위치(폴더 id, 바탕화면은 null)
 * @param folder 새 폴더의 id(방문자 폴더는 `crypto.randomUUID()`)와 만든 시각
 * @param folder.id 새 폴더 id
 * @param folder.createdAt 만든 시각(ISO 8601)
 * @returns 새 상태
 */
export function createFolder(
  state: WorkspaceState,
  parentId: string | null,
  folder: { id: string; createdAt: string },
): WorkspaceResult {
  if (!isOpenFolder(state.items, parentId)) {
    return { ok: false, reason: 'invalid-target' };
  }
  const name = getNewFolderName(getSiblingFolderNames(state, parentId, null));
  const created: FolderItem = {
    kind: 'folder',
    id: folder.id,
    name,
    parentId,
    trash: null,
    date: folder.createdAt,
  };
  return { ok: true, state: { ...state, items: { ...state.items, [folder.id]: created } } };
}

/**
 * 폴더 이름을 바꾼다. 폴더만 바꿀 수 있고(휴지통·글·외부 링크는 거부), 휴지통 안의 폴더도 거부한다.
 * 이름은 `validateFolderName`으로 검증한다. 이름을 바꿔도 id는 그대로다.
 * @codocs [[작업 공간:폴더 이름]]
 * @codocs [[작업 공간:휴지통]]
 * @param state 작업 공간 상태
 * @param id 폴더 id
 * @param name 새 이름
 * @returns 새 상태
 */
export function renameFolder(state: WorkspaceState, id: string, name: string): WorkspaceResult {
  const item = state.items[id];
  if (item === undefined) {
    return { ok: false, reason: 'not-found' };
  }
  if (item.kind !== 'folder') {
    return { ok: false, reason: 'protected' };
  }
  if (isItemInTrash(state, id)) {
    return { ok: false, reason: 'in-trash' };
  }
  const result = validateFolderName(name, getSiblingFolderNames(state, item.parentId, id));
  if (!result.ok) {
    return result;
  }
  return { ok: true, state: { ...state, items: { ...state.items, [id]: { ...item, name } } } };
}

/**
 * 항목들을 다른 위치로 옮긴다. 위치가 휴지통이면 휴지통으로 보낸다(`trashItems`).
 * 휴지통·휴지통 안의 항목은 옮길 수 없고, 폴더를 자기 자신이나 하위 폴더로 옮길 수 없다.
 * 같은 위치에 같은 이름의 폴더가 생기면 거부한다. 하나라도 거부되면 아무것도 옮기지 않는다.
 * 바탕화면을 떠나는 항목의 아이콘 칸은 지운다.
 * @codocs [[작업 공간:배치]]
 * @codocs [[작업 공간:폴더 이름]]
 * @param state 작업 공간 상태
 * @param ids 옮길 항목 id
 * @param targetId 옮길 위치(폴더 id, 바탕화면은 null, 휴지통 id)
 * @param now 지금 시각(ISO 8601). 휴지통으로 보낼 때 삭제한 날짜로 쓴다
 * @returns 새 상태
 */
export function moveItems(
  state: WorkspaceState,
  ids: readonly string[],
  targetId: string | null,
  now: string,
): WorkspaceResult {
  if (targetId === RECYCLE_BIN_ID) {
    return trashItems(state, ids, now);
  }
  if (!isOpenFolder(state.items, targetId)) {
    return { ok: false, reason: 'invalid-target' };
  }
  const moving = new Set(ids);
  const takenNames = getSiblingFolderNames(state, targetId, null, moving);
  const items: Record<string, WorkspaceItem> = { ...state.items };
  for (const id of moving) {
    const item = state.items[id];
    if (item === undefined) {
      return { ok: false, reason: 'not-found' };
    }
    if (item.kind === 'recycle-bin') {
      return { ok: false, reason: 'protected' };
    }
    if (isItemInTrash(state, id)) {
      return { ok: false, reason: 'in-trash' };
    }
    if (item.kind === 'folder' && id === targetId) {
      return { ok: false, reason: 'into-itself' };
    }
    if (item.kind === 'folder' && targetId !== null && isDescendantOf(state, targetId, id)) {
      return { ok: false, reason: 'into-descendant' };
    }
    if (item.kind === 'folder') {
      const key = getFolderNameKey(item.name);
      if (takenNames.some((name) => getFolderNameKey(name) === key)) {
        return { ok: false, reason: 'name-conflict' };
      }
      takenNames.push(item.name);
    }
    items[id] = { ...item, parentId: targetId };
  }
  const next = { ...state, items };
  return { ok: true, state: targetId === null ? next : withoutPositions(next, ids) };
}

/**
 * 항목들을 휴지통으로 보낸다. 폴더를 보내면 안의 항목도 함께 간다(하위 항목은 폴더 안에 그대로 있다).
 * 휴지통과 `Blog` 폴더, `Blog`를 하위에 둔 폴더는 보낼 수 없다. 이미 휴지통에 있는 항목도 거부한다. 하나라도 거부되면 아무것도 보내지 않는다.
 * 고른 항목 가운데 다른 고른 폴더 안에 있는 것은 그 폴더와 함께 가므로 따로 보내지 않는다.
 * @codocs [[작업 공간:휴지통]]
 * @param state 작업 공간 상태
 * @param ids 보낼 항목 id
 * @param now 지금 시각(ISO 8601). 삭제한 날짜로 쓴다
 * @returns 새 상태
 */
export function trashItems(
  state: WorkspaceState,
  ids: readonly string[],
  now: string,
): WorkspaceResult {
  const items: Record<string, WorkspaceItem> = { ...state.items };
  for (const id of ids) {
    const item = state.items[id];
    if (item === undefined) {
      return { ok: false, reason: 'not-found' };
    }
    const hasBlog = id === BLOG_FOLDER_ID || isDescendantOf(state, BLOG_FOLDER_ID, id);
    if (item.kind === 'recycle-bin' || hasBlog) {
      return { ok: false, reason: 'protected' };
    }
    if (isItemInTrash(state, id)) {
      return { ok: false, reason: 'in-trash' };
    }
    const isInsideSelected = ids.some((other) => other !== id && isDescendantOf(state, id, other));
    if (isInsideSelected) {
      continue;
    }
    items[id] = {
      ...item,
      parentId: RECYCLE_BIN_ID,
      trash: { originalParentId: item.parentId, deletedAt: now },
    };
  }
  return { ok: true, state: withoutPositions({ ...state, items }, ids) };
}

/**
 * 휴지통의 항목들을 원래 위치로 복원한다. 원래 상위 폴더가 없거나 휴지통에 있으면 바탕화면으로 간다.
 * 함께 복원하는 폴더가 원래 상위 폴더면 그 폴더를 먼저 복원해 그 안으로 돌려보낸다.
 * 돌아간 자리에 같은 이름의 폴더가 있으면 `이름 (2)`처럼 가장 작은 빈 번호를 붙인다.
 * 휴지통에 바로 들어 있지 않은 항목은 거부한다.
 * @codocs [[작업 공간:휴지통]]
 * @param state 작업 공간 상태
 * @param ids 복원할 항목 id
 * @returns 새 상태
 */
export function restoreItems(state: WorkspaceState, ids: readonly string[]): WorkspaceResult {
  for (const id of ids) {
    const item = state.items[id];
    if (item === undefined) {
      return { ok: false, reason: 'not-found' };
    }
    if (item.trash === null) {
      return { ok: false, reason: 'not-in-trash' };
    }
  }
  let next = state;
  const remaining = [...ids];
  while (remaining.length > 0) {
    // 원래 상위 폴더가 아직 복원할 차례를 기다리면 뒤로 미룬다. 모두 기다리면(순환) 차례대로 한다.
    const readyIndex = remaining.findIndex((id) => {
      const originalParentId = next.items[id]?.trash?.originalParentId ?? null;
      return originalParentId === null || !remaining.includes(originalParentId);
    });
    const [id] = remaining.splice(Math.max(readyIndex, 0), 1);
    const item = id === undefined ? undefined : next.items[id];
    if (item === undefined || item.kind === 'recycle-bin' || item.trash === null) {
      continue;
    }
    const originalParentId = item.trash.originalParentId;
    const parentId = isOpenFolder(next.items, originalParentId) ? originalParentId : null;
    const name =
      item.kind === 'folder'
        ? getFreeFolderName(item.name, getSiblingFolderNames(next, parentId, item.id))
        : item.name;
    next = {
      ...next,
      items: { ...next.items, [item.id]: { ...item, name, parentId, trash: null } },
    };
  }
  return { ok: true, state: next };
}

/**
 * 위치에 바로 들어 있는 항목을 넣은 차례대로 돌려준다. 바탕화면(null)에는 휴지통도 있다. 휴지통 id를 주면 휴지통에 보낸 항목이다.
 * @codocs [[작업 공간:배치]]
 * @param state 작업 공간 상태
 * @param parentId 위치(폴더 id, 바탕화면은 null, 휴지통 id)
 * @returns 바로 아래 항목
 */
export function getChildItems(
  state: Pick<WorkspaceState, 'items'>,
  parentId: string | null,
): WorkspaceItem[] {
  return Object.values(state.items).filter((item) => item.parentId === parentId);
}

/**
 * 바탕화면에 보이는 항목(상위 폴더가 없는 항목과 휴지통)을 넣은 차례대로 돌려준다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @param state 작업 공간 상태
 * @returns 바탕화면 항목
 */
export function getDesktopItems(state: Pick<WorkspaceState, 'items'>): WorkspaceItem[] {
  return getChildItems(state, null);
}

/**
 * 휴지통에 바로 들어 있는 항목(지운 항목)을 돌려준다.
 * @codocs [[작업 공간:휴지통]]
 * @param state 작업 공간 상태
 * @returns 지운 항목
 */
export function getTrashedItems(state: Pick<WorkspaceState, 'items'>): PlacedItem[] {
  return Object.values(state.items).filter(
    (item): item is PlacedItem => item.kind !== 'recycle-bin' && item.parentId === RECYCLE_BIN_ID,
  );
}

/**
 * 휴지통에 항목이 하나라도 있는지. 있으면 휴지통 아이콘은 찬 모양이다.
 * @codocs [[바탕화면:표시하는 항목]]
 * @param state 작업 공간 상태
 * @returns 찼으면 true
 */
export function isRecycleBinFull(state: Pick<WorkspaceState, 'items'>): boolean {
  return getTrashedItems(state).length > 0;
}

/**
 * 항목이 휴지통 안에 있는지(자신이나 상위 폴더 하나가 휴지통에 있는지) 본다.
 * @codocs [[작업 공간:휴지통]]
 * @param state 작업 공간 상태
 * @param id 항목 id
 * @returns 휴지통 안이면 true
 */
export function isItemInTrash(state: Pick<WorkspaceState, 'items'>, id: string): boolean {
  let parentId = state.items[id]?.parentId ?? null;
  const visited = new Set<string>();
  while (parentId !== null && !visited.has(parentId)) {
    if (parentId === RECYCLE_BIN_ID) {
      return true;
    }
    visited.add(parentId);
    parentId = state.items[parentId]?.parentId ?? null;
  }
  return false;
}

/**
 * 폴더의 경로(바탕화면 바로 아래 폴더부터 그 폴더까지)를 돌려준다. 탐색기 위치 칸에 쓴다.
 * 휴지통 안의 폴더는 휴지통 아래부터다. 없는 폴더는 빈 목록이다.
 * @codocs [[작업 공간:배치]]
 * @param state 작업 공간 상태
 * @param folderId 폴더 id
 * @returns 위에서부터의 폴더
 */
export function getFolderPath(
  state: Pick<WorkspaceState, 'items'>,
  folderId: string,
): FolderItem[] {
  const path: FolderItem[] = [];
  let current = state.items[folderId];
  const visited = new Set<string>();
  while (current?.kind === 'folder' && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : state.items[current.parentId];
  }
  return path;
}

/**
 * 바탕화면 아래의 폴더 트리를 돌려준다. 휴지통 안의 폴더는 뺀다. 탐색기 왼쪽 탐색 창에 쓴다.
 * @codocs [[파일 탐색기:구성]]
 * @param state 작업 공간 상태
 * @returns 바탕화면 바로 아래 폴더부터의 트리
 */
export function getFolderTree(state: Pick<WorkspaceState, 'items'>): FolderTreeNode[] {
  return buildFolderTree(state, null, new Set());
}

/**
 * 폴더 안의 모든 하위 항목 id를 돌려준다(폴더 자신은 빼고).
 * @codocs [[작업 공간:배치]]
 * @param state 작업 공간 상태
 * @param folderId 폴더 id
 * @returns 하위 항목 id
 */
export function getDescendantIds(state: Pick<WorkspaceState, 'items'>, folderId: string): string[] {
  const result: string[] = [];
  const queue = [folderId];
  const visited = new Set(queue);
  while (queue.length > 0) {
    const parentId = queue.shift();
    for (const item of Object.values(state.items)) {
      if (item.parentId === parentId && !visited.has(item.id)) {
        visited.add(item.id);
        result.push(item.id);
        queue.push(item.id);
      }
    }
  }
  return result;
}

/**
 * 휴지통에 없는 글을 최신순(작성일이 같으면 이름순)으로 돌려준다. Chrome 새 탭 페이지와 검색 추천에 쓴다.
 * @codocs [[검색:입력 전 화면]]
 * @param state 작업 공간 상태
 * @param count 최대 개수
 * @returns 글
 */
export function getLatestPosts(state: Pick<WorkspaceState, 'items'>, count: number): PostItem[] {
  return Object.values(state.items)
    .filter((item): item is PostItem => item.kind === 'post' && !isItemInTrash(state, item.id))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))
    .slice(0, count);
}

/**
 * 항목을 열 때 할 일을 정한다. 폴더와 휴지통은 그 위치의 새 탐색기 창, 글은 Chrome, 외부 링크는 실제 브라우저의 새 탭,
 * 앱(`APP_ITEM_IDS`)은 그 앱의 창이다. 휴지통 안의 항목은 열 수 없고 복원만 된다.
 * @codocs [[창 동작:열기 규칙]]
 * @codocs [[항목 모델:종류]]
 * @codocs [[파일 탐색기:휴지통 보기]]
 * @param state 작업 공간 상태
 * @param id 항목 id
 * @returns 할 일
 */
export function getItemOpenAction(
  state: Pick<WorkspaceState, 'items'>,
  id: string,
): ItemOpenAction {
  const app = getAppFromItemId(id);
  if (app !== null) {
    return { type: 'app', app };
  }
  const item = state.items[id];
  if (item === undefined || isItemInTrash(state, id)) {
    return { type: 'none' };
  }
  switch (item.kind) {
    case 'recycle-bin':
    case 'folder':
      return { type: 'explorer', folderId: item.id };
    case 'post':
      return { type: 'post', slug: item.slug };
    case 'link':
      return { type: 'external', url: item.url };
  }
}

/**
 * 앱 항목 id면 그 앱을 돌려준다.
 * @param id 항목 id
 * @returns 앱. 앱 항목이 아니면 null
 */
export function getAppFromItemId(id: string): WindowApp | null {
  return WINDOW_APPS.find((app) => APP_ITEM_IDS[app] === id) ?? null;
}

/**
 * 최근 연 항목에 넣는다. 맨 앞에 두고 같은 항목은 한 번만 둔다. 앱, 휴지통, 휴지통 안의 항목, 없는 항목은 넣지 않는다.
 * @codocs [[검색:입력 전 화면]]
 * @param state 작업 공간 상태
 * @param id 연 항목 id
 * @returns 새 상태
 */
export function recordRecentItem(state: WorkspaceState, id: string): WorkspaceState {
  const item = state.items[id];
  if (item === undefined || item.kind === 'recycle-bin' || isItemInTrash(state, id)) {
    return state;
  }
  const recentItemIds = [id, ...state.recentItemIds.filter((recentId) => recentId !== id)].slice(
    0,
    RECENT_ITEMS_LIMIT,
  );
  return { ...state, recentItemIds };
}

/**
 * 최근 연 항목을 최근 것부터 돌려준다. 휴지통에 들어간 항목은 뺀다.
 * @codocs [[검색:입력 전 화면]]
 * @param state 작업 공간 상태
 * @param count 최대 개수
 * @returns 항목
 */
export function getRecentItems(state: WorkspaceState, count: number): PlacedItem[] {
  return state.recentItemIds
    .map((id) => state.items[id])
    .filter(
      (item): item is PlacedItem =>
        item !== undefined && item.kind !== 'recycle-bin' && !isItemInTrash(state, item.id),
    )
    .slice(0, count);
}

/**
 * Start 고정됨에 넣는다. 맨 뒤에 붙이고, 이미 있거나 없는 항목·휴지통이면 그대로다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param state 작업 공간 상태
 * @param id 항목 id(앱은 `APP_ITEM_IDS`의 id)
 * @returns 새 상태
 */
export function pinToStart(state: WorkspaceState, id: string): WorkspaceState {
  const item = state.items[id];
  const isPinnable =
    getAppFromItemId(id) !== null || (item !== undefined && item.kind !== 'recycle-bin');
  if (!isPinnable || state.startPins.includes(id)) {
    return state;
  }
  return { ...state, startPins: [...state.startPins, id] };
}

/**
 * Start 고정됨에서 뺀다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param state 작업 공간 상태
 * @param id 항목 id
 * @returns 새 상태
 */
export function unpinFromStart(state: WorkspaceState, id: string): WorkspaceState {
  return { ...state, startPins: state.startPins.filter((pinId) => pinId !== id) };
}

/**
 * Start 고정됨의 순서를 바꾼다(드래그, 맨 앞으로 이동은 0). 자리는 목록 안으로 맞춘다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param state 작업 공간 상태
 * @param id 항목 id
 * @param index 옮길 자리
 * @returns 새 상태
 */
export function moveStartPin(state: WorkspaceState, id: string, index: number): WorkspaceState {
  return state.startPins.includes(id)
    ? { ...state, startPins: moveInList(state.startPins, id, index) }
    : state;
}

/**
 * Start 고정됨에 보이는 항목 id를 돌려준다. 휴지통에 들어간 항목은 숨기고, 복원하면 다시 보인다.
 * @codocs [[Start 메뉴:고정됨]]
 * @param state 작업 공간 상태
 * @returns 보이는 고정 항목 id
 */
export function getVisibleStartPins(state: WorkspaceState): string[] {
  return state.startPins.filter(
    (id) => getAppFromItemId(id) !== null || (id in state.items && !isItemInTrash(state, id)),
  );
}

/**
 * 작업 표시줄에 앱을 고정한다. 맨 뒤에 붙이고 이미 있으면 그대로다.
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param state 작업 공간 상태
 * @param app 앱
 * @returns 새 상태
 */
export function pinToTaskbar(state: WorkspaceState, app: WindowApp): WorkspaceState {
  return state.taskbarPins.includes(app)
    ? state
    : { ...state, taskbarPins: [...state.taskbarPins, app] };
}

/**
 * 작업 표시줄에서 앱 고정을 해제한다.
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param state 작업 공간 상태
 * @param app 앱
 * @returns 새 상태
 */
export function unpinFromTaskbar(state: WorkspaceState, app: WindowApp): WorkspaceState {
  return { ...state, taskbarPins: state.taskbarPins.filter((pinned) => pinned !== app) };
}

/**
 * 작업 표시줄 고정 앱의 순서를 바꾼다. 자리는 목록 안으로 맞춘다.
 * @codocs [[작업 표시줄:고정과 순서]]
 * @param state 작업 공간 상태
 * @param app 앱
 * @param index 옮길 자리
 * @returns 새 상태
 */
export function moveTaskbarPin(
  state: WorkspaceState,
  app: WindowApp,
  index: number,
): WorkspaceState {
  return state.taskbarPins.includes(app)
    ? { ...state, taskbarPins: moveInList(state.taskbarPins, app, index) }
    : state;
}

/**
 * 탐색기 위치의 보기와 정렬을 돌려준다. 정한 적이 없으면 보통 아이콘, 이름 오름차순이다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param state 작업 공간 상태
 * @param folderId 폴더 id(바탕화면은 null)
 * @returns 보기와 정렬
 */
export function getExplorerView(
  state: WorkspaceState,
  folderId: string | null,
): ExplorerFolderView {
  return state.explorerViews[folderId ?? DESKTOP_LOCATION_KEY] ?? DEFAULT_EXPLORER_VIEW;
}

/**
 * 탐색기 위치의 보기와 정렬을 바꾼다. 폴더마다 따로 기억한다.
 * @codocs [[파일 탐색기:보기와 정렬]]
 * @param state 작업 공간 상태
 * @param folderId 폴더 id(바탕화면은 null)
 * @param view 바꿀 값
 * @returns 새 상태
 */
export function setExplorerView(
  state: WorkspaceState,
  folderId: string | null,
  view: Partial<ExplorerFolderView>,
): WorkspaceState {
  const key = folderId ?? DESKTOP_LOCATION_KEY;
  return {
    ...state,
    explorerViews: {
      ...state.explorerViews,
      [key]: { ...getExplorerView(state, folderId), ...view },
    },
  };
}

/**
 * 바탕화면 아이콘의 격자 칸을 정한다(자동 정렬을 끄고 옮겼을 때). 바탕화면에 없는 항목은 무시한다.
 * @codocs [[바탕화면:아이콘 배치]]
 * @param state 작업 공간 상태
 * @param positions 항목 id별 칸
 * @returns 새 상태
 */
export function setDesktopIconPositions(
  state: WorkspaceState,
  positions: Readonly<Record<string, GridCell>>,
): WorkspaceState {
  const onDesktop = Object.entries(positions).filter(
    ([id]) => state.items[id] !== undefined && state.items[id].parentId === null,
  );
  return {
    ...state,
    desktop: {
      ...state.desktop,
      positions: { ...state.desktop.positions, ...Object.fromEntries(onDesktop) },
    },
  };
}

/**
 * 이름에 쓸 수 없는 문자(`< > : " / \ | ? *`와 제어 문자)가 있는지 본다. 모두 UTF-16 한 단위 문자라 단위마다 본다.
 * @param name 이름
 * @returns 있으면 true
 */
function hasInvalidNameCharacter(name: string): boolean {
  for (let index = 0; index < name.length; index += 1) {
    if (
      invalidNameCharacters.has(name.charAt(index)) ||
      name.charCodeAt(index) < CONTROL_CHARACTER_LIMIT
    ) {
      return true;
    }
  }
  return false;
}

/**
 * 폴더 이름을 비교할 열쇠. 대소문자와 유니코드 정규화 차이를 없앤다.
 * @param name 폴더 이름
 * @returns 비교 열쇠
 */
function getFolderNameKey(name: string): string {
  return name.normalize('NFC').toLowerCase();
}

/**
 * 기본 이름이 비어 있으면 그 이름, 아니면 `이름 (2)`부터 가장 작은 빈 번호를 붙인 이름을 돌려준다.
 * @param baseName 기본 이름
 * @param siblingNames 같은 위치의 폴더 이름
 * @returns 빈 이름
 */
function getFreeFolderName(baseName: string, siblingNames: readonly string[]): string {
  const taken = new Set(siblingNames.map(getFolderNameKey));
  if (!taken.has(getFolderNameKey(baseName))) {
    return baseName;
  }
  let number = 2;
  while (taken.has(getFolderNameKey(`${baseName} (${String(number)})`))) {
    number += 1;
  }
  return `${baseName} (${String(number)})`;
}

/**
 * 위치에 있는 폴더 이름을 돌려준다.
 * @param state 작업 공간 상태
 * @param parentId 위치
 * @param exceptId 뺄 폴더(이름을 바꾸는 폴더 자신)
 * @param exceptIds 뺄 폴더들(함께 옮기는 폴더)
 * @returns 폴더 이름
 */
function getSiblingFolderNames(
  state: Pick<WorkspaceState, 'items'>,
  parentId: string | null,
  exceptId: string | null,
  exceptIds: ReadonlySet<string> = new Set(),
): string[] {
  return getChildItems(state, parentId)
    .filter((item) => item.kind === 'folder' && item.id !== exceptId && !exceptIds.has(item.id))
    .map((item) => item.name);
}

/**
 * 위치가 바탕화면이거나 휴지통 밖의 폴더인지 본다.
 * @param items 항목
 * @param parentId 위치
 * @returns 항목을 둘 수 있으면 true
 */
function isOpenFolder(
  items: Readonly<Record<string, WorkspaceItem>>,
  parentId: string | null,
): boolean {
  if (parentId === null) {
    return true;
  }
  return items[parentId]?.kind === 'folder' && !isItemInTrash({ items }, parentId);
}

/**
 * 항목이 폴더의 하위 항목인지 본다.
 * @param state 작업 공간 상태
 * @param id 항목 id
 * @param ancestorId 폴더 id
 * @returns 하위 항목이면 true
 */
function isDescendantOf(
  state: Pick<WorkspaceState, 'items'>,
  id: string,
  ancestorId: string,
): boolean {
  let parentId = state.items[id]?.parentId ?? null;
  const visited = new Set<string>();
  while (parentId !== null && !visited.has(parentId)) {
    if (parentId === ancestorId) {
      return true;
    }
    visited.add(parentId);
    parentId = state.items[parentId]?.parentId ?? null;
  }
  return false;
}

/**
 * 글·외부 링크 항목 id 형식(`post:`, `link:`)인지 본다.
 * @param id 항목 id
 * @returns 글·외부 링크 id면 true
 */
function isSourceItemId(id: string): boolean {
  return id.startsWith('post:') || id.startsWith('link:');
}

/**
 * 상위로 올라가다 자기에게 돌아오는지 본다.
 * @param items 항목
 * @param id 항목 id
 * @returns 순환이면 true
 */
function hasParentCycle(items: Readonly<Record<string, WorkspaceItem>>, id: string): boolean {
  let parentId = items[id]?.parentId ?? null;
  const visited = new Set<string>([id]);
  while (parentId !== null) {
    if (visited.has(parentId)) {
      return true;
    }
    visited.add(parentId);
    parentId = items[parentId]?.parentId ?? null;
  }
  return false;
}

/**
 * Notion 폴더 경로의 폴더를 `Blog` 아래에 차례로 만든다. 이미 있으면 그대로 둔다.
 * @param items 항목(바꾼다)
 * @param path 폴더 경로
 */
function addNotionFolders(items: Record<string, WorkspaceItem>, path: readonly string[]): void {
  let parentId = BLOG_FOLDER_ID;
  for (let depth = 1; depth <= path.length; depth += 1) {
    const segments = path.slice(0, depth);
    const id = getNotionFolderId(segments);
    if (items[id] === undefined) {
      items[id] = {
        kind: 'folder',
        id,
        name: segments.at(-1) ?? '',
        parentId,
        trash: null,
        date: null,
      };
    }
    parentId = id;
  }
}

/**
 * 글 색인 한 줄로 글 항목을 만든다.
 * @param post 글 색인
 * @param parentId 위치
 * @param trash 휴지통 기록
 * @returns 글 항목
 */
function createPostItem(
  post: PostSummary,
  parentId: string | null,
  trash: TrashRecord | null,
): PostItem {
  return {
    kind: 'post',
    id: getPostItemId(post.slug),
    name: post.title,
    slug: post.slug,
    parentId,
    trash,
    date: post.date,
  };
}

/**
 * 외부 링크 설정 한 줄로 외부 링크 항목을 만든다.
 * @param link 외부 링크 설정
 * @param parentId 위치
 * @param trash 휴지통 기록
 * @returns 외부 링크 항목
 */
function createLinkItem(
  link: ExternalLinkConfig,
  parentId: string | null,
  trash: TrashRecord | null,
): LinkItem {
  return {
    kind: 'link',
    id: getLinkItemId(link.id),
    name: link.name,
    url: link.url,
    icon: link.icon,
    parentId,
    trash,
    date: null,
  };
}

/**
 * 없는 항목을 가리키는 고정·최근·아이콘 칸·폴더 보기를 지운다. 바탕화면에 없는 항목의 아이콘 칸도 지운다.
 * @param state 작업 공간 상태
 * @returns 정리한 상태
 */
function cleanReferences(state: WorkspaceState): WorkspaceState {
  const { items } = state;
  const positions = Object.fromEntries(
    Object.entries(state.desktop.positions).filter(([id]) => items[id]?.parentId === null),
  );
  const explorerViews = Object.fromEntries(
    Object.entries(state.explorerViews).filter(
      ([id]) =>
        id === DESKTOP_LOCATION_KEY || id === RECYCLE_BIN_ID || items[id]?.kind === 'folder',
    ),
  );
  return {
    ...state,
    desktop: { ...state.desktop, positions },
    startPins: state.startPins.filter(
      (id) => getAppFromItemId(id) !== null || (id in items && id !== RECYCLE_BIN_ID),
    ),
    recentItemIds: state.recentItemIds.filter((id) => id in items && id !== RECYCLE_BIN_ID),
    explorerViews,
  };
}

/**
 * 바탕화면 아이콘 칸에서 항목들을 지운다.
 * @param state 작업 공간 상태
 * @param ids 항목 id
 * @returns 새 상태
 */
function withoutPositions(state: WorkspaceState, ids: readonly string[]): WorkspaceState {
  const positions = Object.fromEntries(
    Object.entries(state.desktop.positions).filter(([id]) => !ids.includes(id)),
  );
  return { ...state, desktop: { ...state.desktop, positions } };
}

/**
 * 폴더 아래 트리를 만든다.
 * @param state 작업 공간 상태
 * @param parentId 위치
 * @param visited 이미 지난 폴더(순환 막기)
 * @returns 트리
 */
function buildFolderTree(
  state: Pick<WorkspaceState, 'items'>,
  parentId: string | null,
  visited: Set<string>,
): FolderTreeNode[] {
  return getChildItems(state, parentId)
    .filter((item): item is FolderItem => item.kind === 'folder' && !visited.has(item.id))
    .map((folder) => {
      visited.add(folder.id);
      return { folder, children: buildFolderTree(state, folder.id, visited) };
    });
}

/**
 * 목록에서 값을 다른 자리로 옮긴다.
 * @param list 목록
 * @param value 옮길 값
 * @param index 옮길 자리(목록 안으로 맞춘다)
 * @returns 새 목록
 */
function moveInList<T>(list: readonly T[], value: T, index: number): T[] {
  const rest = list.filter((entry) => entry !== value);
  const target = Math.min(Math.max(index, 0), rest.length);
  return [...rest.slice(0, target), value, ...rest.slice(target)];
}

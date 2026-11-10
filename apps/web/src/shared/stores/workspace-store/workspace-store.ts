import { useSyncExternalStore } from 'react';
import { create, type StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { registerStoreReset } from '@/shared/stores/store-reset/store-reset';
import { externalLinks } from '@/shared/stores/workspace-store/external-links';
import type { WindowApp } from '@/shared/utils/window-rules/window-rules';
import {
  createFolder,
  createInitialWorkspace,
  type DesktopIconSize,
  type DesktopSortKey,
  type ExplorerFolderView,
  type GridCell,
  moveFavoritePin,
  moveItems,
  moveStartPin,
  moveTaskbarPin,
  pinToFavorites,
  pinToStart,
  pinToTaskbar,
  type PostSummary,
  recordRecentItem,
  renameFolder,
  restoreItems,
  restoreTrashedItem,
  type SavedWorkspaceShape,
  setDesktopIconPositions,
  setExplorerView,
  type StartAllViewSetting,
  swapStartPin,
  toSavedWorkspace,
  trashItems,
  unpinFromFavorites,
  unpinFromStart,
  unpinFromTaskbar,
  type WorkspaceCatalog,
  type WorkspaceRejectReason,
  type WorkspaceResult,
  type WorkspaceState,
} from '@/shared/utils/workspace-rules/workspace-rules';
import {
  restoreWorkspace,
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORAGE_VERSION,
} from '@/shared/utils/workspace-storage/workspace-storage';

/** 저장소 조작의 결과. 거부되면 이유를 돌려준다(말풍선 등으로 보여 줄 때 쓴다) */
export type WorkspaceActionResult = { ok: true } | { ok: false; reason: WorkspaceRejectReason };

/**
 * 작업 공간 저장소의 조작
 * - moveItems: 항목들을 위치(폴더 id, 바탕화면은 null, 휴지통 id)로 옮긴다
 * - trashItems: 항목들을 휴지통으로 보낸다
 * - restoreItems: 휴지통의 항목들을 원래 위치로 복원한다
 * - restoreTrashedItem: 휴지통에 있는 항목(글, 폴더, 외부 링크) 하나를 주소로 열 때 복원한다(휴지통에 든 폴더 안의 항목이면 그 항목만 바탕화면으로)
 * - createFolder: 위치에 새 폴더를 만든다. 만든 폴더의 id를 돌려준다
 * - renameFolder: 폴더 이름을 바꾼다
 * - setDesktopIconSize: 바탕화면 아이콘 크기를 바꾼다
 * - setDesktopAutoArrange: 바탕화면 아이콘 자동 정렬을 켜거나 끈다
 * - setDesktopSortBy: 바탕화면 정렬 기준을 바꾼다
 * - setDesktopIconPositions: 바탕화면 아이콘의 격자 칸을 정한다
 * - pinToStart: Start 고정됨에 넣는다(맨 뒤)
 * - unpinFromStart: Start 고정됨에서 뺀다
 * - moveStartPin: Start 고정됨의 순서를 바꾼다(맨 앞으로 이동은 0)
 * - swapStartPin: Start 고정됨의 칸을 화면에 보이는 옆 칸과 자리를 바꾼다(왼쪽·오른쪽으로 이동)
 * - setStartAllView: Start 모두 목록의 보기를 바꾼다
 * - pinToTaskbar: 작업 표시줄에 앱을 고정한다
 * - unpinFromTaskbar: 작업 표시줄에서 앱 고정을 해제한다
 * - moveTaskbarPin: 작업 표시줄 고정 앱의 순서를 바꾼다
 * - pinToFavorites: 탐색기 즐겨찾기에 폴더를 고정한다(맨 뒤)
 * - unpinFromFavorites: 탐색기 즐겨찾기에서 폴더를 뺀다
 * - moveFavoritePin: 탐색기 즐겨찾기의 순서를 바꾼다(자리는 `favoritePins`의 자리)
 * - setExplorerView: 탐색기 위치(폴더 id, 바탕화면은 null)의 보기와 정렬을 바꾼다
 * - recordRecentItem: 연 항목을 최근 항목에 넣는다
 * - reset: 처음 상태(초기 구조)로 돌린다(다시 시작). 브라우저 저장분은 따로 지운다
 */
type WorkspaceActions = {
  moveItems: (ids: readonly string[], targetId: string | null) => WorkspaceActionResult;
  trashItems: (ids: readonly string[]) => WorkspaceActionResult;
  restoreItems: (ids: readonly string[]) => WorkspaceActionResult;
  restoreTrashedItem: (id: string) => WorkspaceActionResult;
  createFolder: (
    parentId: string | null,
  ) => { ok: true; id: string } | { ok: false; reason: WorkspaceRejectReason };
  renameFolder: (id: string, name: string) => WorkspaceActionResult;
  setDesktopIconSize: (iconSize: DesktopIconSize) => void;
  setDesktopAutoArrange: (isAutoArrange: boolean) => void;
  setDesktopSortBy: (sortBy: DesktopSortKey) => void;
  setDesktopIconPositions: (positions: Readonly<Record<string, GridCell>>) => void;
  pinToStart: (id: string) => void;
  unpinFromStart: (id: string) => void;
  moveStartPin: (id: string, index: number) => void;
  swapStartPin: (id: string, direction: 'left' | 'right') => void;
  setStartAllView: (view: StartAllViewSetting) => void;
  pinToTaskbar: (app: WindowApp) => void;
  unpinFromTaskbar: (app: WindowApp) => void;
  moveTaskbarPin: (app: WindowApp, index: number) => void;
  pinToFavorites: (id: string) => void;
  unpinFromFavorites: (id: string) => void;
  moveFavoritePin: (id: string, index: number) => void;
  setExplorerView: (folderId: string | null, view: Partial<ExplorerFolderView>) => void;
  recordRecentItem: (id: string) => void;
  reset: () => void;
};

/** 작업 공간 저장소. 상태와 조작이다 */
export type WorkspaceStore = WorkspaceState & WorkspaceActions;

// 작업 공간을 만드는 원본. 서버가 넘긴 글 색인은 수화할 때(`hydrateWorkspaceStore`) 채운다.
// 저장소가 처음 만들어질 때(서버 HTML, 첫 클라이언트 렌더)는 글 없이 만든 초기 구조라, 바탕화면(휴지통, Blog, 외부 링크)은 같다.
let catalog: WorkspaceCatalog = { posts: [], links: externalLinks };

/**
 * 작업 공간(항목 배치, 휴지통, 바탕화면·Start·작업 표시줄·탐색기 설정, 탐색기 즐겨찾기, 최근 항목)을 담는 저장소.
 * 규칙은 `workspace-rules.ts`의 순수 함수에 있고 여기서는 그 함수만 부른다.
 * 방문자 브라우저(localStorage)에 `persist`로 저장한다. 서버 HTML과 첫 클라이언트 렌더가 같도록 저장분을 바로 읽지 않고(`skipHydration`),
 * 마운트한 뒤 `hydrateWorkspaceStore`가 읽는다. 저장분은 Zod로 검증해 맞지 않거나 버전이 다르면 초기 구조에서 다시 시작한다.
 * 다시 시작하면 처음 상태로 돌리고 저장분을 지운다.
 * @codocs [[방문자 저장:저장하는 것]]
 * @codocs [[고정:즐겨찾기 고정]]
 * @codocs [[다시 시작:되돌리는 상태]]
 * @codocs [[기술 스택:상태 관리]]
 */
export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(createWorkspaceStore, {
    name: WORKSPACE_STORAGE_KEY,
    version: WORKSPACE_STORAGE_VERSION,
    storage: createJSONStorage<SavedWorkspaceShape>(() => localStorage),
    skipHydration: true,
    partialize: (state) => toSavedWorkspace(state),
    merge: (saved, current) => ({ ...current, ...restoreWorkspace(saved, catalog) }),
    // 버전이 다른 저장분은 옮기지 않고 초기 구조에서 다시 시작한다.
    migrate: () => toSavedWorkspace(createInitialWorkspace(catalog)),
    onRehydrateStorage: () => handleRehydrated,
  }),
);

registerStoreReset(() => {
  useWorkspaceStore.getState().reset();
  useWorkspaceStore.persist.clearStorage();
});

/**
 * 서버가 읽은 글 색인을 받아 브라우저 저장분을 읽는다. 마운트한 뒤 한 번 부른다(shell).
 * 저장분이 없거나 읽을 수 없으면 초기 구조, 있으면 지금 글 색인·외부 링크 설정과 맞춘 상태가 된다.
 * localStorage는 바로 읽혀 이 함수가 끝나면 상태가 바뀌어 있다. 읽다 실패하면 초기 구조에서 다시 시작한다.
 * @codocs [[작업 공간 맞추기:Notion과 맞추기]]
 * @codocs [[방문자 저장:저장분 읽기]]
 * @param posts 글 색인
 */
export function hydrateWorkspaceStore(posts: readonly PostSummary[]): void {
  catalog = { posts, links: externalLinks };
  Promise.resolve(useWorkspaceStore.persist.rehydrate()).catch(resetToInitial);
}

/**
 * 작업 공간 항목을 읽는다. 저장분을 읽기 전(서버 HTML과 수화 첫 렌더)의 저장소에는 글이 없으므로, 서버가 읽은 글 색인을 주면
 * 그 글 색인으로 만든 초기 구조의 항목을 돌려준다. 서버가 그리는 첫 진입 창이 글 제목과 머리(폴더 경로, 작성일)를 그리게 하기 위해서다.
 * 저장분을 읽은 뒤에는 저장소의 항목이다. 저장분이 없으면 둘은 같다.
 * @codocs [[창 동작:새로고침과 첫 진입]]
 * @codocs [[방문자 저장:저장분 읽기]]
 * @param serverPosts 서버가 읽은 글 색인. 없으면(스토리) 늘 저장소의 항목이다
 * @returns 작업 공간 항목
 */
export function useWorkspaceItems(serverPosts?: readonly PostSummary[]): WorkspaceState['items'] {
  const items = useWorkspaceStore((state) => state.items);
  const isRestored = useSyncExternalStore(subscribeRestored, getIsRestored, getIsRestoredOnServer);
  if (isRestored || serverPosts === undefined) {
    return items;
  }
  return createInitialWorkspace({ posts: serverPosts, links: externalLinks }).items;
}

/**
 * 저장분을 다 읽으면 알린다.
 * @param onChange 다 읽으면 부를 함수
 * @returns 구독을 끊는 함수
 */
function subscribeRestored(onChange: () => void): () => void {
  return useWorkspaceStore.persist.onFinishHydration(onChange);
}

/**
 * 저장분을 다 읽었는지.
 * @returns 읽었으면 true
 */
function getIsRestored(): boolean {
  return useWorkspaceStore.persist.hasHydrated();
}

/**
 * 서버와 수화 첫 렌더에서는 저장분을 읽기 전이다.
 * @returns false
 */
function getIsRestoredOnServer(): boolean {
  return false;
}

/**
 * 저장분을 읽고 난 뒤 부른다. 읽다 실패하면(저장된 JSON이 깨졌을 때) 초기 구조에서 다시 시작한다.
 * @param state 읽은 뒤의 상태. 실패하면 없다
 * @param error 실패했으면 그 오류
 */
function handleRehydrated(state: WorkspaceStore | undefined, error?: unknown): void {
  if (state === undefined || error !== undefined) {
    resetToInitial();
  }
}

/** 초기 구조에서 다시 시작한다. */
function resetToInitial(): void {
  useWorkspaceStore.getState().reset();
}

/**
 * 저장소의 처음 상태와 조작을 만든다.
 * @param set 상태를 바꾸는 함수
 * @param get 지금 상태를 읽는 함수
 * @returns 처음 상태와 조작
 */
function createWorkspaceStore(
  set: StoreApi<WorkspaceStore>['setState'],
  get: StoreApi<WorkspaceStore>['getState'],
): WorkspaceStore {
  /**
   * 규칙 결과를 반영하고 거부 이유를 돌려준다.
   * @param result 규칙 결과
   * @returns 조작 결과
   */
  function apply(result: WorkspaceResult): WorkspaceActionResult {
    if (!result.ok) {
      return result;
    }
    set(result.state);
    return { ok: true };
  }

  /**
   * 상태를 바꾸는 규칙을 반영한다.
   * @param rule 상태를 받아 새 상태를 돌려주는 규칙
   */
  function update(rule: (state: WorkspaceState) => WorkspaceState): void {
    set((state) => rule(state));
  }

  return {
    ...createInitialWorkspace(catalog),
    moveItems: (ids, targetId) => apply(moveItems(get(), ids, targetId, new Date().toISOString())),
    trashItems: (ids) => apply(trashItems(get(), ids, new Date().toISOString())),
    restoreItems: (ids) => apply(restoreItems(get(), ids)),
    restoreTrashedItem: (id) => apply(restoreTrashedItem(get(), id)),
    createFolder: (parentId) => {
      const id = crypto.randomUUID();
      const result = apply(
        createFolder(get(), parentId, { id, createdAt: new Date().toISOString() }),
      );
      return result.ok ? { ok: true, id } : result;
    },
    renameFolder: (id, name) => apply(renameFolder(get(), id, name)),
    setDesktopIconSize: (iconSize) => {
      update((state) => ({ ...state, desktop: { ...state.desktop, iconSize } }));
    },
    setDesktopAutoArrange: (isAutoArrange) => {
      update((state) => ({
        ...state,
        desktop: { ...state.desktop, isAutoArrange: isAutoArrange },
      }));
    },
    setDesktopSortBy: (sortBy) => {
      update((state) => ({ ...state, desktop: { ...state.desktop, sortBy } }));
    },
    setDesktopIconPositions: (positions) => {
      update((state) => setDesktopIconPositions(state, positions));
    },
    pinToStart: (id) => {
      update((state) => pinToStart(state, id));
    },
    unpinFromStart: (id) => {
      update((state) => unpinFromStart(state, id));
    },
    moveStartPin: (id, index) => {
      update((state) => moveStartPin(state, id, index));
    },
    swapStartPin: (id, direction) => {
      update((state) => swapStartPin(state, id, direction));
    },
    setStartAllView: (startAllView) => {
      set({ startAllView });
    },
    pinToTaskbar: (app) => {
      update((state) => pinToTaskbar(state, app));
    },
    unpinFromTaskbar: (app) => {
      update((state) => unpinFromTaskbar(state, app));
    },
    moveTaskbarPin: (app, index) => {
      update((state) => moveTaskbarPin(state, app, index));
    },
    pinToFavorites: (id) => {
      update((state) => pinToFavorites(state, id));
    },
    unpinFromFavorites: (id) => {
      update((state) => unpinFromFavorites(state, id));
    },
    moveFavoritePin: (id, index) => {
      update((state) => moveFavoritePin(state, id, index));
    },
    setExplorerView: (folderId, view) => {
      update((state) => setExplorerView(state, folderId, view));
    },
    recordRecentItem: (id) => {
      update((state) => recordRecentItem(state, id));
    },
    reset: () => {
      set(createInitialWorkspace(catalog));
    },
  };
}

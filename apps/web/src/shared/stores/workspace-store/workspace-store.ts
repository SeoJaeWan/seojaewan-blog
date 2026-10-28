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
  moveItems,
  moveStartPin,
  moveTaskbarPin,
  pinToStart,
  pinToTaskbar,
  type PostSummary,
  recordRecentItem,
  renameFolder,
  restoreItems,
  restoreTrashedPost,
  type SavedWorkspaceShape,
  setDesktopIconPositions,
  setExplorerView,
  type StartAllViewSetting,
  toSavedWorkspace,
  trashItems,
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

/** 작업 공간 저장소의 조작 */
type WorkspaceActions = {
  /** 항목들을 위치(폴더 id, 바탕화면은 null, 휴지통 id)로 옮긴다 */
  moveItems: (ids: readonly string[], targetId: string | null) => WorkspaceActionResult;
  /** 항목들을 휴지통으로 보낸다 */
  trashItems: (ids: readonly string[]) => WorkspaceActionResult;
  /** 휴지통의 항목들을 원래 위치로 복원한다 */
  restoreItems: (ids: readonly string[]) => WorkspaceActionResult;
  /** 휴지통에 있는 글 하나를 주소로 열 때 복원한다(휴지통에 든 폴더 안의 글이면 그 글만 바탕화면으로) */
  restoreTrashedPost: (id: string) => WorkspaceActionResult;
  /** 위치에 새 폴더를 만든다. 만든 폴더의 id를 돌려준다 */
  createFolder: (
    parentId: string | null,
  ) => { ok: true; id: string } | { ok: false; reason: WorkspaceRejectReason };
  /** 폴더 이름을 바꾼다 */
  renameFolder: (id: string, name: string) => WorkspaceActionResult;
  /** 바탕화면 아이콘 크기를 바꾼다 */
  setDesktopIconSize: (iconSize: DesktopIconSize) => void;
  /** 바탕화면 아이콘 자동 정렬을 켜거나 끈다 */
  setDesktopAutoArrange: (isAutoArrange: boolean) => void;
  /** 바탕화면 정렬 기준을 바꾼다 */
  setDesktopSortBy: (sortBy: DesktopSortKey) => void;
  /** 바탕화면 아이콘의 격자 칸을 정한다 */
  setDesktopIconPositions: (positions: Readonly<Record<string, GridCell>>) => void;
  /** Start 고정됨에 넣는다(맨 뒤) */
  pinToStart: (id: string) => void;
  /** Start 고정됨에서 뺀다 */
  unpinFromStart: (id: string) => void;
  /** Start 고정됨의 순서를 바꾼다(맨 앞으로 이동은 0) */
  moveStartPin: (id: string, index: number) => void;
  /** Start 모두 목록의 보기를 바꾼다 */
  setStartAllView: (view: StartAllViewSetting) => void;
  /** 작업 표시줄에 앱을 고정한다 */
  pinToTaskbar: (app: WindowApp) => void;
  /** 작업 표시줄에서 앱 고정을 해제한다 */
  unpinFromTaskbar: (app: WindowApp) => void;
  /** 작업 표시줄 고정 앱의 순서를 바꾼다 */
  moveTaskbarPin: (app: WindowApp, index: number) => void;
  /** 탐색기 위치(폴더 id, 바탕화면은 null)의 보기와 정렬을 바꾼다 */
  setExplorerView: (folderId: string | null, view: Partial<ExplorerFolderView>) => void;
  /** 연 항목을 최근 항목에 넣는다 */
  recordRecentItem: (id: string) => void;
  /** 처음 상태(초기 구조)로 돌린다(다시 시작). 브라우저 저장분은 따로 지운다 */
  reset: () => void;
};

/** 작업 공간 저장소. 상태와 조작이다 */
export type WorkspaceStore = WorkspaceState & WorkspaceActions;

// 작업 공간을 만드는 원본. 서버가 넘긴 글 색인은 수화할 때(`hydrateWorkspaceStore`) 채운다.
// 저장소가 처음 만들어질 때(서버 HTML, 첫 클라이언트 렌더)는 글 없이 만든 초기 구조라, 바탕화면(휴지통, Blog, 외부 링크)은 같다.
let catalog: WorkspaceCatalog = { posts: [], links: externalLinks };

/**
 * 작업 공간(항목 배치, 휴지통, 바탕화면·Start·작업 표시줄·탐색기 설정, 최근 항목)을 담는 저장소.
 * 규칙은 `workspace-rules.ts`의 순수 함수에 있고 여기서는 그 함수만 부른다.
 * 방문자 브라우저(localStorage)에 `persist`로 저장한다. 서버 HTML과 첫 클라이언트 렌더가 같도록 저장분을 바로 읽지 않고(`skipHydration`),
 * 마운트한 뒤 `hydrateWorkspaceStore`가 읽는다. 저장분은 Zod로 검증해 맞지 않거나 버전이 다르면 초기 구조에서 다시 시작한다.
 * 다시 시작하면 처음 상태로 돌리고 저장분을 지운다.
 * @codocs [[작업 공간:방문자별 저장]]
 * @codocs [[작업 공간:다시 시작]]
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
 * @codocs [[작업 공간:Notion과 맞추기]]
 * @codocs [[작업 공간:방문자별 저장]]
 * @param posts 글 색인
 */
export function hydrateWorkspaceStore(posts: readonly PostSummary[]): void {
  catalog = { posts, links: externalLinks };
  Promise.resolve(useWorkspaceStore.persist.rehydrate()).catch(resetToInitial);
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
    restoreTrashedPost: (id) => apply(restoreTrashedPost(get(), id)),
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
      update((state) => ({ ...state, desktop: { ...state.desktop, autoArrange: isAutoArrange } }));
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

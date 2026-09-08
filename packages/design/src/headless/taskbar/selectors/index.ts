/**
 * @file Taskbar visible identity와 현재 Resource·Window reader에서 Group과 launcher view를 파생한다.
 *
 * Pin, metadata, Window target 또는 Preview bitmap을 authoritative state로 저장하지 않는다.
 */
import type {
  ContentCatalogReader,
  ExternalShortcutCatalogReader,
  ExternalShortcutResourceRef,
  FolderCatalogReader,
} from "../../resources/index.js";
import type { WindowSession, WindowSessionId, WindowState } from "../../windows/index.js";
import type { TaskbarApplicationId, TaskbarSnapshot } from "../model/index.js";

/**
 * Taskbar selector가 최신 표시 metadata를 조회할 종류별 Catalog다.
 */
export type TaskbarMetadataReaders = Readonly<{
  content: ContentCatalogReader;
  folder: FolderCatalogReader;
  externalShortcut: ExternalShortcutCatalogReader;
}>;

/**
 * application Group의 WindowSession 하나를 나타내는 Preview target이다.
 */
export type TaskbarGroupTarget = Readonly<{
  applicationId: TaskbarApplicationId;
  sessionId: WindowSessionId;
  title: string;
  active: boolean;
  minimized: boolean;
}>;

/**
 * 현재 Pin과 WindowState에서 파생한 desktop application Group view다.
 */
export type TaskbarApplicationGroup = Readonly<{
  kind: "application-group";
  applicationId: TaskbarApplicationId;
  label: string;
  pinned: boolean;
  running: boolean;
  active: boolean;
  targets: readonly TaskbarGroupTarget[];
}>;

/**
 * 현재 Catalog 원본에서 metadata를 읽은 standalone ExternalShortcut view다.
 */
export type TaskbarExternalShortcutView = Readonly<{
  kind: "external-shortcut";
  resource: ExternalShortcutResourceRef;
  name: string;
  url: string;
  pinned: true;
  running: false;
  active: false;
  targets: readonly [];
}>;

/**
 * desktop Taskbar visible sequence에 표시할 Group 또는 standalone launcher view다.
 */
export type TaskbarVisibleView = TaskbarApplicationGroup | TaskbarExternalShortcutView;

/**
 * mobile Taskbar에 고정된 application 버튼 하나의 read model이다.
 */
export type MobileTaskbarApplicationView = Readonly<{
  kind: "application";
  applicationId: TaskbarApplicationId;
  label: string;
  active: boolean;
}>;

/**
 * mobile Taskbar에서 독립 Timestamp controller가 표시할 고정 자리다.
 */
export type MobileTaskbarTimestampView = Readonly<{
  kind: "timestamp";
}>;

/**
 * desktop Pin과 독립된 Explorer, Chrome, Timestamp 고정 mobile 읽기 모델이다.
 */
export type MobileTaskbarView = readonly [
  MobileTaskbarApplicationView,
  MobileTaskbarApplicationView,
  MobileTaskbarTimestampView,
];

const EMPTY_TARGETS: readonly [] = Object.freeze([]);

/**
 * application identity의 제품 고정 label을 반환한다.
 */
const applicationLabel = (applicationId: TaskbarApplicationId): string =>
  applicationId === "file-explorer" ? "파일 탐색기" : "Chrome";

/**
 * Window active tab의 현재 location을 최신 Catalog metadata 기반 Preview title로 투영한다.
 */
const previewTitle = (session: WindowSession, readers: TaskbarMetadataReaders): string => {
  if (session.kind === "file-explorer") {
    const tab = session.tabs.find(({ id }) => id === session.activeTabId);
    if (tab === undefined) return applicationLabel(session.applicationId);
    const location = tab.navigation.current.location;
    return location === null ? "Desktop" : (readers.folder.get(location.id)?.name ?? "Desktop");
  }
  const tab = session.tabs.find(({ id }) => id === session.activeTabId);
  if (tab === undefined) return applicationLabel(session.applicationId);
  const location = tab.navigation.current.location;
  switch (location.kind) {
    case "new-tab":
      return "새 탭";
    case "content":
      return readers.content.get(location.ref.id)?.title ?? "404";
    case "not-found":
      return location.address;
  }
};

/**
 * stackingOrder를 topmost/MRU 우선으로 뒤집어 application의 Window target을 파생한다.
 */
const selectTargets = (
  applicationId: TaskbarApplicationId,
  windowState: WindowState,
  readers: TaskbarMetadataReaders,
): readonly TaskbarGroupTarget[] => {
  const sessions = new Map(windowState.sessions.map((session) => [session.id, session]));
  return Object.freeze(
    [...windowState.stackingOrder]
      .reverse()
      .map((sessionId) => sessions.get(sessionId))
      .filter(
        (session): session is WindowSession =>
          session !== undefined && session.applicationId === applicationId,
      )
      .map((session) =>
        Object.freeze({
          applicationId,
          sessionId: session.id,
          title: previewTitle(session, readers),
          active: windowState.activeSessionId === session.id,
          minimized: session.frame.minimized,
        }),
      ),
  );
};

/**
 * TaskbarStore visible order를 current Window target과 Resource metadata를 가진 desktop view로 만든다.
 *
 * 사라진 shortcut은 Store `reconcileResources()` 전까지 결과에서 생략하며 metadata를 snapshot에 복제하지 않는다.
 */
export const selectTaskbarVisibleViews = (
  taskbar: TaskbarSnapshot,
  windowState: WindowState,
  readers: TaskbarMetadataReaders,
): readonly TaskbarVisibleView[] => {
  const views: TaskbarVisibleView[] = [];
  for (const item of taskbar.visibleItems) {
    if (item.kind === "application") {
      const targets = selectTargets(item.applicationId, windowState, readers);
      views.push(
        Object.freeze({
          kind: "application-group",
          applicationId: item.applicationId,
          label: applicationLabel(item.applicationId),
          pinned: taskbar.pinnedItems.some(
            (pinned) =>
              pinned.kind === "application" && pinned.applicationId === item.applicationId,
          ),
          running: targets.length > 0,
          active: targets.some(({ active }) => active),
          targets,
        }),
      );
      continue;
    }
    const shortcut = readers.externalShortcut.get(item.resource.id);
    if (shortcut === undefined) continue;
    views.push(
      Object.freeze({
        kind: "external-shortcut",
        resource: Object.freeze({ ...item.resource }),
        name: shortcut.name,
        url: shortcut.url,
        pinned: true,
        running: false,
        active: false,
        targets: EMPTY_TARGETS,
      }),
    );
  }
  return Object.freeze(views);
};

/**
 * desktop Pin과 무관한 File Explorer, Chrome, Timestamp 순서의 mobile 읽기 모델을 반환한다.
 *
 * 현재 유일한 Window가 있으면 그 application 버튼만 active로 표시한다.
 */
export const selectMobileTaskbarView = (windowState: WindowState): MobileTaskbarView => {
  const activeApplication = windowState.sessions[0]?.applicationId;
  return Object.freeze([
    Object.freeze({
      kind: "application",
      applicationId: "file-explorer",
      label: "파일 탐색기",
      active: activeApplication === "file-explorer",
    }),
    Object.freeze({
      kind: "application",
      applicationId: "chrome",
      label: "Chrome",
      active: activeApplication === "chrome",
    }),
    Object.freeze({ kind: "timestamp" }),
  ]);
};

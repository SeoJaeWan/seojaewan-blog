import { describe, expect, it } from "vitest";

import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
  type ResourceId,
} from "../../resources/index.js";
import type { StartSnapshot } from "../../start/index.js";
import type { WindowState } from "../../windows/index.js";
import { parseWindowSessionId } from "../../windows/windowSessionId/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import { parseFileExplorerTabId } from "../fileExplorerTabId/index.js";
import type { FileExplorerNavigationValue } from "../model/index.js";
import {
  DEFAULT_FOLDER_VIEW_SETTINGS,
  type FolderViewSettingsSnapshot,
} from "../viewSettings/index.js";
import {
  searchFileExplorerItems,
  selectFileExplorerDirectChildren,
  selectFileExplorerReadModel,
  sortFileExplorerItems,
} from "./index.js";

const sessionId = parseWindowSessionId("10000000-0000-4000-8000-000000000001");
const tabId = parseFileExplorerTabId("20000000-0000-4000-8000-000000000001");
const blog = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
const nested = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
const contentRef = createResourceRef("content", "40000000-0000-4000-8000-000000000001");
const shortcutRef = createResourceRef("external-shortcut", "50000000-0000-4000-8000-000000000001");

const workspace: WorkspaceState = Object.freeze({
  schemaVersion: 1,
  contentInbox: blog,
  folders: Object.freeze([
    Object.freeze({ ref: blog, name: "Blog" }),
    Object.freeze({ ref: nested, name: "Café Folder" }),
  ]),
  placements: Object.freeze([
    Object.freeze({ resource: blog, parent: null }),
    Object.freeze({ resource: nested, parent: blog }),
    Object.freeze({ resource: contentRef, parent: blog }),
    Object.freeze({ resource: shortcutRef, parent: blog }),
  ]),
});

const content: Content = Object.freeze({
  ref: contentRef,
  title: "CAFÉ Content",
  slug: "cafe-content",
  summary: "",
  date: "2026-09-10",
  tags: Object.freeze([]),
  cover: null,
  source: Object.freeze({ kind: "notion", pageId: "page-1" }),
});
const shortcut: ExternalShortcut = Object.freeze({
  ref: shortcutRef,
  name: "Cafe\u0301 Shortcut",
  url: "https://example.com",
});
const readers = Object.freeze({
  content: createStaticCatalog([content]),
  externalShortcut: createStaticCatalog([shortcut]),
});
const start: StartSnapshot = Object.freeze({ pinnedItems: Object.freeze([]) });

/** test별 current target과 mode를 가진 File Explorer WindowState를 만든다. */
const createWindows = (
  target: FileExplorerNavigationValue,
  mode: WindowState["mode"] = "desktop",
  expandedFolderIds: readonly ResourceId[] = [blog.id],
): WindowState =>
  Object.freeze({
    mode,
    workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
    sessions: Object.freeze([
      Object.freeze({
        kind: "file-explorer" as const,
        applicationId: "file-explorer" as const,
        id: sessionId,
        frame: Object.freeze({
          normalBounds: Object.freeze({ x: 10, y: 10, width: 900, height: 600 }),
          placement: "normal" as const,
          minimized: false,
        }),
        tabs: Object.freeze([
          Object.freeze({
            id: tabId,
            navigation: Object.freeze({
              current: Object.freeze({ location: target, scrollTop: 24 }),
              backStack: Object.freeze([]),
              forwardStack: Object.freeze([]),
            }),
            query: "CAFE\u0301",
            expandedFolderIds: Object.freeze(expandedFolderIds),
            selection: Object.freeze([contentRef]),
          }),
        ]),
        activeTabId: tabId,
        sidebarWidth: 288,
      }),
    ]),
    stackingOrder: Object.freeze([sessionId]),
    activeSessionId: sessionId,
  });

const viewSettings: FolderViewSettingsSnapshot = Object.freeze({
  surface: "desktop",
  entries: Object.freeze([
    Object.freeze({
      location: blog,
      settings: Object.freeze({
        ...DEFAULT_FOLDER_VIEW_SETTINGS,
        viewMode: "details" as const,
      }),
    }),
  ]),
});

describe("File Explorer collection selectors", () => {
  it("현재 위치의 세 Resource kind direct child만 최신 표시 이름으로 반환한다", () => {
    const items = selectFileExplorerDirectChildren(workspace, blog, readers);

    expect(items.map(({ kind, name }) => [kind, name])).toEqual([
      ["folder", "Café Folder"],
      ["content", "CAFÉ Content"],
      ["external-shortcut", "Cafe\u0301 Shortcut"],
    ]);
  });

  it("세 Resource kind 이름에 같은 NFC와 case-insensitive contains 검색을 적용한다", () => {
    const items = selectFileExplorerDirectChildren(workspace, blog, readers);

    expect(searchFileExplorerItems(items, "CAFE\u0301").map(({ kind }) => kind)).toEqual([
      "folder",
      "content",
      "external-shortcut",
    ]);
  });

  it("정렬 설정에 따라 이름과 방향을 결정적으로 적용한다", () => {
    const items = selectFileExplorerDirectChildren(workspace, blog, readers);
    const sorted = sortFileExplorerItems(items, {
      ...DEFAULT_FOLDER_VIEW_SETTINGS,
      sortDirection: "descending",
    });

    expect(sorted.map(({ name }) => name)).toEqual([
      "Cafe\u0301 Shortcut",
      "Café Folder",
      "CAFÉ Content",
    ]);
  });
});

describe("selectFileExplorerReadModel", () => {
  it("정상 desktop 위치를 tab·주소·breadcrumb·Sidebar·status·view read model로 조합한다", () => {
    const model = selectFileExplorerReadModel({
      windows: createWindows(blog),
      workspace,
      start,
      viewSettings,
      readers,
      sessionId,
    });

    expect(model).toMatchObject({
      title: "Blog",
      address: "/Blog",
      query: "CAFE\u0301",
      empty: null,
      viewSettings: { viewMode: "details" },
      status: { itemCount: 3, selectionCount: 1, searchResultCount: 3 },
      sidebar: {
        width: 288,
        currentRow: { kind: "folder", location: blog },
        expandedFolderIds: [blog.id],
      },
    });
    expect(model?.breadcrumb.map(({ name }) => name)).toEqual(["Desktop", "Blog"]);
    expect(model?.tabs).toEqual([
      expect.objectContaining({ id: tabId, title: "Blog", address: "/Blog", active: true }),
    ]);
    expect(model?.sidebar?.desktop.current).toBe(false);
  });

  it("unresolved target은 제출 주소와 오류를 유지하고 collection·선택·현재 Sidebar row를 비운다", () => {
    const unresolved = Object.freeze({
      kind: "unresolved-path" as const,
      path: "/Missing/Folder",
    }) as FileExplorerNavigationValue;
    const model = selectFileExplorerReadModel({
      windows: createWindows(unresolved),
      workspace,
      start,
      viewSettings,
      readers,
      sessionId,
    });

    expect(model).toMatchObject({
      title: "/Missing/Folder",
      address: "/Missing/Folder",
      breadcrumb: [],
      query: "",
      selection: [],
      directChildren: [],
      items: [],
      error: { kind: "unresolved-path", path: "/Missing/Folder" },
      status: { itemCount: null, selectionCount: null, searchResultCount: null },
      sidebar: { currentRow: null },
      viewSettings: null,
    });
    expect(model?.sidebar?.desktop.current).toBe(false);
  });

  it("mobile은 Sidebar·status·multi-tab projection을 숨기고 Medium Icons를 고정한다", () => {
    const model = selectFileExplorerReadModel({
      windows: createWindows(blog, "mobile"),
      workspace,
      start,
      viewSettings,
      readers,
      sessionId,
    });

    expect(model).toMatchObject({
      mode: "mobile",
      tabs: null,
      sidebar: null,
      status: null,
      viewSettings: { viewMode: "medium-icons" },
    });
  });

  it("외부 navigation으로 nested Folder가 현재 위치면 ancestor를 focus 변경 없이 표시한다", () => {
    const model = selectFileExplorerReadModel({
      windows: createWindows(nested, "desktop", []),
      workspace,
      start,
      viewSettings,
      readers,
      sessionId,
    });

    expect(model?.sidebar?.expandedFolderIds).toEqual([blog.id]);
    expect(model?.sidebar?.currentRow).toEqual({ kind: "folder", location: nested });
    expect(model?.sidebar?.visibleRows.map(({ kind }) => kind)).toEqual([
      "desktop",
      "folder",
      "folder",
    ]);
  });
});

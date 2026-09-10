import { describe, expect, it } from "vitest";

import {
  type Content,
  createResourceRef,
  type ExternalShortcut,
  type Folder,
} from "../../resources/index.js";
import type { WindowSession, WindowSessionId, WindowState } from "../../windows/index.js";
import type { TaskbarSnapshot } from "../model/index.js";
import {
  selectMobileTaskbarView,
  selectTaskbarVisibleViews,
  type TaskbarMetadataReaders,
} from "./index.js";

const folderRef = createResourceRef("folder", "60000000-0000-4000-8000-000000000001");
const contentRef = createResourceRef("content", "60000000-0000-4000-8000-000000000002");
const shortcutRef = createResourceRef("external-shortcut", "60000000-0000-4000-8000-000000000003");

/** 단일 원본을 현재 closure에서 읽는 mutable Catalog fixture를 만든다. */
const readers = () => {
  let folder: Folder = { ref: folderRef, name: "Work" };
  let content: Content = {
    ref: contentRef,
    title: "Current title",
    slug: "current",
    summary: "",
    date: "2026-09-07",
    tags: [],
    cover: null,
    source: { kind: "notion", pageId: contentRef.id },
  };
  let shortcut: ExternalShortcut = {
    ref: shortcutRef,
    name: "Current shortcut",
    url: "https://example.com/current",
  };
  const catalog: TaskbarMetadataReaders = {
    content: {
      /** Content ID 존재 여부를 확인한다. */
      has: (id) => id === content.ref.id,
      /** 현재 Content 원본을 반환한다. */
      get: (id) => (id === content.ref.id ? content : undefined),
      /** 현재 Content 원본 목록을 반환한다. */
      list: () => [content],
    },
    folder: {
      /** Folder ID 존재 여부를 확인한다. */
      has: (id) => id === folder.ref.id,
      /** 현재 Folder 원본을 반환한다. */
      get: (id) => (id === folder.ref.id ? folder : undefined),
      /** 현재 Folder 원본 목록을 반환한다. */
      list: () => [folder],
    },
    externalShortcut: {
      /** shortcut ID 존재 여부를 확인한다. */
      has: (id) => id === shortcut.ref.id,
      /** 현재 shortcut 원본을 반환한다. */
      get: (id) => (id === shortcut.ref.id ? shortcut : undefined),
      /** 현재 shortcut 원본 목록을 반환한다. */
      list: () => [shortcut],
    },
  };
  return {
    catalog,
    /** selector 다음 호출이 읽을 metadata를 모두 바꾼다. */
    update() {
      folder = { ...folder, name: "Renamed" };
      content = { ...content, title: "Updated title" };
      shortcut = { ...shortcut, name: "Updated shortcut", url: "https://example.com/updated" };
    },
  };
};

/** application과 active location을 가진 WindowSession fixture를 만든다. */
const session = (
  applicationId: "file-explorer" | "chrome",
  id: string,
  minimized = false,
): WindowSession => {
  const frame = {
    normalBounds: { x: 0, y: 0, width: 500, height: 400 },
    placement: "normal" as const,
    minimized,
  };
  if (applicationId === "file-explorer") {
    const tabId = `${id.slice(0, -1)}a` as never;
    return {
      id: id as WindowSessionId,
      kind: "file-explorer",
      applicationId,
      frame,
      tabs: [
        {
          id: tabId,
          navigation: {
            current: { location: folderRef, scrollTop: 0 },
            backStack: [],
            forwardStack: [],
          },
        },
      ],
      activeTabId: tabId,
    };
  }
  const tabId = `${id.slice(0, -1)}b` as never;
  return {
    id: id as WindowSessionId,
    kind: "chrome",
    applicationId,
    frame,
    tabs: [
      {
        id: tabId,
        navigation: {
          current: { location: { kind: "content", ref: contentRef }, scrollTop: 0 },
          backStack: [],
          forwardStack: [],
        },
        reloadRevision: 0,
      },
    ],
    activeTabId: tabId,
  };
};

describe("Taskbar selectors", () => {
  it("Group target을 topmost 순서로 파생하고 minimized Session도 running으로 유지한다", () => {
    const chromeBottom = session("chrome", "70000000-0000-4000-8000-000000000001");
    const explorer = session("file-explorer", "70000000-0000-4000-8000-000000000002", true);
    const chromeTop = session("chrome", "70000000-0000-4000-8000-000000000003");
    const windowState: WindowState = {
      mode: "desktop",
      workArea: { x: 0, y: 0, width: 1000, height: 800 },
      sessions: [chromeBottom, explorer, chromeTop],
      stackingOrder: [chromeBottom.id, explorer.id, chromeTop.id],
      activeSessionId: chromeTop.id,
    };
    const taskbar: TaskbarSnapshot = {
      pinnedItems: [
        { kind: "application", applicationId: "file-explorer" },
        { kind: "application", applicationId: "chrome" },
        { kind: "external-shortcut", resource: shortcutRef },
      ],
      visibleItems: [
        { kind: "application", applicationId: "file-explorer" },
        { kind: "application", applicationId: "chrome" },
        { kind: "external-shortcut", resource: shortcutRef },
      ],
    };
    const metadata = readers();
    const views = selectTaskbarVisibleViews(taskbar, windowState, metadata.catalog);
    const explorerGroup = views[0];
    const chromeGroup = views[1];
    expect(explorerGroup).toMatchObject({ running: true, active: false });
    expect(explorerGroup?.targets[0]).toMatchObject({ title: "Work", minimized: true });
    expect(chromeGroup?.targets.map(({ sessionId }) => sessionId)).toEqual([
      chromeTop.id,
      chromeBottom.id,
    ]);
    expect(chromeGroup).toMatchObject({ running: true, active: true });
  });

  it("Window과 Resource metadata를 snapshot에 복제하지 않고 매 selector 호출에서 다시 읽는다", () => {
    const chrome = session("chrome", "70000000-0000-4000-8000-000000000011");
    const windowState: WindowState = {
      mode: "desktop",
      workArea: { x: 0, y: 0, width: 1000, height: 800 },
      sessions: [chrome],
      stackingOrder: [chrome.id],
      activeSessionId: chrome.id,
    };
    const taskbar: TaskbarSnapshot = {
      pinnedItems: [
        { kind: "application", applicationId: "chrome" },
        { kind: "external-shortcut", resource: shortcutRef },
      ],
      visibleItems: [
        { kind: "application", applicationId: "chrome" },
        { kind: "external-shortcut", resource: shortcutRef },
      ],
    };
    const metadata = readers();
    expect(selectTaskbarVisibleViews(taskbar, windowState, metadata.catalog)).toMatchObject([
      { targets: [{ title: "Current title" }] },
      { name: "Current shortcut", url: "https://example.com/current" },
    ]);
    metadata.update();
    expect(selectTaskbarVisibleViews(taskbar, windowState, metadata.catalog)).toMatchObject([
      { targets: [{ title: "Updated title" }] },
      { name: "Updated shortcut", url: "https://example.com/updated" },
    ]);
  });

  it("mobile read model은 desktop Pin과 무관하게 Explorer→Chrome→Timestamp로 고정한다", () => {
    const chrome = session("chrome", "70000000-0000-4000-8000-000000000021");
    const mobile: WindowState = {
      mode: "mobile",
      workArea: { x: 0, y: 0, width: 390, height: 800 },
      sessions: [chrome],
      stackingOrder: [chrome.id],
      activeSessionId: chrome.id,
    };
    expect(selectMobileTaskbarView(mobile)).toEqual([
      { kind: "application", applicationId: "file-explorer", label: "파일 탐색기", active: false },
      { kind: "application", applicationId: "chrome", label: "Chrome", active: true },
      { kind: "timestamp" },
    ]);
  });
});

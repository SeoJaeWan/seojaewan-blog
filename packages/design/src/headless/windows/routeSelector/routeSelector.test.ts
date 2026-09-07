import { describe, expect, it, vi } from "vitest";

import { type InternalAddress,parseChromeTabId } from "../../chrome/index.js";
import { parseFileExplorerTabId } from "../../folders/index.js";
import { type Content, createResourceRef } from "../../resources/index.js";
import type {
  ChromeWindowSession,
  FileExplorerWindowSession,
  WindowState,
} from "../model/index.js";
import { parseWindowSessionId } from "../windowSessionId/index.js";
import { selectWindowRoute } from "./index.js";

const contentRef = createResourceRef("content", "30000000-0000-4000-8000-000000000001");
const content: Content = {
  ref: contentRef,
  title: "Canonical",
  slug: "canonical-slug",
  summary: "",
  date: "2026-09-07",
  tags: [],
  cover: null,
  source: { kind: "notion", pageId: contentRef.id },
};
const catalog = {
  has: vi.fn((id) => id === contentRef.id),
  get: vi.fn((id) => (id === contentRef.id ? content : undefined)),
  list: vi.fn(() => [content]),
};

const chromeSession = (
  sessionValue: number,
  location: ChromeWindowSession["tabs"][number]["navigation"]["current"]["location"],
): ChromeWindowSession => {
  const sessionId = parseWindowSessionId(
    `10000000-0000-4000-8000-${String(sessionValue).padStart(12, "0")}`,
  );
  const tabId = parseChromeTabId(
    `20000000-0000-4000-8000-${String(sessionValue).padStart(12, "0")}`,
  );
  return {
    id: sessionId,
    kind: "chrome",
    applicationId: "chrome",
    frame: {
      normalBounds: { x: 0, y: 0, width: 600, height: 400 },
      placement: "normal",
      minimized: false,
    },
    tabs: [
      {
        id: tabId,
        navigation: { current: { location, scrollTop: 0 }, backStack: [], forwardStack: [] },
        reloadRevision: 0,
      },
    ],
    activeTabId: tabId,
  };
};

const stateWith = (
  sessions: readonly ChromeWindowSession[],
  activeSessionId: ChromeWindowSession["id"] | null,
): WindowState => ({
  mode: "desktop",
  workArea: { x: 0, y: 0, width: 1000, height: 800 },
  sessions,
  stackingOrder: sessions.map(({ id }) => id),
  activeSessionId,
});

describe("selectWindowRoute", () => {
  it("active Chrome의 Content는 현재 Catalog slug로 canonical route를 만든다", () => {
    const active = chromeSession(1, { kind: "content", ref: contentRef });

    expect(selectWindowRoute(stateWith([active], active.id), catalog)).toBe(
      `/content/${contentRef.id}/canonical-slug`,
    );
    expect(catalog.get).toHaveBeenCalledWith(contentRef.id);
  });

  it("new-tab·Explorer와 active 부재는 root이고 404는 attempted address를 유지한다", () => {
    const newTab = chromeSession(1, { kind: "new-tab" });
    const notFound = chromeSession(2, {
      kind: "not-found",
      address: "/missing?from=test" as InternalAddress,
    });
    const explorerTabId = parseFileExplorerTabId("40000000-0000-4000-8000-000000000001");
    const explorer: FileExplorerWindowSession = {
      id: parseWindowSessionId("50000000-0000-4000-8000-000000000001"),
      kind: "file-explorer",
      applicationId: "file-explorer",
      frame: {
        normalBounds: { x: 0, y: 0, width: 600, height: 400 },
        placement: "normal",
        minimized: false,
      },
      tabs: [
        {
          id: explorerTabId,
          navigation: {
            current: { location: null, scrollTop: 0 },
            backStack: [],
            forwardStack: [],
          },
        },
      ],
      activeTabId: explorerTabId,
    };

    expect(selectWindowRoute(stateWith([newTab], newTab.id), catalog)).toBe("/");
    expect(selectWindowRoute(stateWith([notFound], notFound.id), catalog)).toBe(
      "/missing?from=test",
    );
    expect(selectWindowRoute(stateWith([newTab], null), catalog)).toBe("/");
    expect(
      selectWindowRoute(
        {
          ...stateWith([], null),
          sessions: [explorer],
          stackingOrder: [explorer.id],
          activeSessionId: explorer.id,
        },
        catalog,
      ),
    ).toBe("/");
  });

  it("inactive Chrome location 변화는 active projection과 Catalog 조회를 바꾸지 않는다", () => {
    const active = chromeSession(1, { kind: "content", ref: contentRef });
    const inactive = chromeSession(2, {
      kind: "not-found",
      address: "/inactive" as InternalAddress,
    });
    const state = stateWith([active, inactive], active.id);
    catalog.get.mockClear();

    expect(selectWindowRoute(state, catalog)).toBe(`/content/${contentRef.id}/canonical-slug`);
    expect(catalog.get).toHaveBeenCalledTimes(1);
  });
});

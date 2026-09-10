import { describe, expect, it, vi } from "vitest";

import { type InternalAddress, parseChromeTabId } from "../../chrome/index.js";
import { parseFileExplorerTabId } from "../../folders/index.js";
import { type Content, createResourceRef, createStaticCatalog } from "../../resources/index.js";
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

/**
 * 지정 identity와 위치를 가진 Chrome Session fixture를 만든다.
 */
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

/**
 * 주어진 Session과 active ID로 독립된 WindowState fixture를 만든다.
 */
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

  it.each(["new-tab", "explorer", "no-active", "not-found"] as const)(
    "%s 위치를 대응하는 주소로 반환하며 Content를 조회하지 않는다",
    (variant) => {
      const tab = chromeSession(
        1,
        variant === "not-found"
          ? { kind: "not-found", address: "/missing?from=test" as InternalAddress }
          : { kind: "new-tab" },
      );
      let state = stateWith([tab], variant === "no-active" ? null : tab.id);
      if (variant === "explorer") {
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

        state = {
          ...stateWith([], null),
          sessions: [explorer],
          stackingOrder: [explorer.id],
          activeSessionId: explorer.id,
        };
      }
      catalog.get.mockClear();
      expect(selectWindowRoute(state, catalog)).toBe(
        variant === "not-found" ? "/missing?from=test" : "/",
      );
      expect(catalog.get).not.toHaveBeenCalled();
    },
  );

  it("현재 Catalog에서 사라진 Content는 root로 복구한다", () => {
    const active = chromeSession(1, { kind: "content", ref: contentRef });
    expect(
      selectWindowRoute(stateWith([active], active.id), createStaticCatalog<Content>([])),
    ).toBe("/");
  });

  it("주소 파생은 입력 snapshot과 Catalog 원본을 변경하지 않는다", () => {
    const active = chromeSession(1, { kind: "content", ref: contentRef });
    const state = stateWith([active], active.id);
    const before = structuredClone({ state, content });
    selectWindowRoute(state, catalog);
    expect({ state, content }).toEqual(before);
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

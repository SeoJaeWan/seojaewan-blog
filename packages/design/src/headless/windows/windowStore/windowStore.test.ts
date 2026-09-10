import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChromeLocation, InternalAddress } from "../../chrome/index.js";
import { type Content, createResourceRef } from "../../resources/index.js";
import type { WorkspaceState } from "../../workspace/index.js";
import type { WindowState } from "../model/index.js";

/**
 * 테스트별 충돌 여부를 제어할 수 있는 유효한 UUID 문자열을 만든다.
 */
const uuid = (value: number) => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
const folderA = createResourceRef("folder", "20000000-0000-4000-8000-000000000001");
const folderB = createResourceRef("folder", "20000000-0000-4000-8000-000000000002");
const contentA = createResourceRef("content", "30000000-0000-4000-8000-000000000001");
const contentB = createResourceRef("content", "30000000-0000-4000-8000-000000000002");

/**
 * 주어진 Content ref를 가진 Catalog 원본 fixture를 만든다.
 */
const contentFor = (ref: typeof contentA): Content => ({
  ref,
  title: ref.id,
  slug: ref.id,
  summary: "",
  date: "2026-09-07",
  tags: [],
  cover: null,
  source: { kind: "notion", pageId: ref.id },
});

const initialWorkspace: WorkspaceState = {
  schemaVersion: 1,
  contentInbox: folderA,
  folders: [
    { ref: folderA, name: "A" },
    { ref: folderB, name: "B" },
  ],
  placements: [
    { resource: folderA, parent: null },
    { resource: folderB, parent: folderA },
    { resource: contentA, parent: folderA },
    { resource: contentB, parent: folderB },
  ],
};

/**
 * 테스트마다 WindowStore 모듈·UUID 발급기와 읽기 dependency를 새로 준비한다. 초기화는 각 테스트가 명시적으로 수행한다.
 */
const setup = async (
  ids: readonly string[] = Array.from({ length: 80 }, (_, i) => uuid(i + 1)),
) => {
  vi.resetModules();
  const generated = [...ids];
  const randomUUID = vi.fn(() => generated.shift() ?? uuid(999));
  vi.stubGlobal("crypto", { randomUUID });
  let workspaceState = initialWorkspace;
  const workspace = {
    getSnapshot: vi.fn(() => workspaceState),
  };
  const contentCatalog = {
    has: vi.fn((id) => id === contentA.id || id === contentB.id),
    get: vi.fn((id) =>
      id === contentA.id
        ? contentFor(contentA)
        : id === contentB.id
          ? contentFor(contentB)
          : undefined,
    ),
    list: vi.fn(() => [contentFor(contentA), contentFor(contentB)]),
  };
  const placementConfig = {
    defaultSize: { width: 600, height: 400 },
    minSize: { width: 320, height: 200 },
    edgeMargin: 10,
    cascadeOffset: { x: 30, y: 20 },
    titlebarRecoverySize: { width: 120, height: 32 },
  };
  const storeModule = await import("./index.js");
  const initialization = {
    workspace,
    contentCatalog,
    placementConfig,
    mode: "desktop" as const,
    workArea: { x: 0, y: 0, width: 1000, height: 800 },
  };

  return {
    ...storeModule,
    initialization,
    workspace,
    contentCatalog,
    /**
     * 현재까지 Store가 runtime ID 후보를 요청한 횟수를 반환한다.
     */
    getRandomUUIDCallCount: () => randomUUID.mock.calls.length,
    /**
     * 후속 명령이 읽을 fake Workspace snapshot을 교체한다. WindowStore 상태는 직접 변경하지 않는다.
     */
    setWorkspaceState: (next: WorkspaceState) => {
      workspaceState = next;
    },
  };
};

/**
 * 관찰한 snapshot에서 Session 순서대로 ID를 추출한다.
 */
const sessionIds = (state: WindowState) => state.sessions.map(({ id }) => id);

describe("WindowStore", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  describe("initialize", () => {
    it("초기 dependency에서 빈 snapshot을 만들고 알림을 발생시키지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const result = await WindowStore.initialize(initialization);
      expect(result).toMatchObject({ ok: true, changed: false });
      expect(WindowStore.getSnapshot()).toEqual({
        mode: "desktop",
        workArea: initialization.workArea,
        sessions: [],
        stackingOrder: [],
        activeSessionId: null,
      });
      expect(listener).not.toHaveBeenCalled();
    });
    it("잘못된 geometry 초기화 실패 후 유효한 설정으로 다시 초기화할 수 있다", async () => {
      const { WindowStore, initialization, WindowStoreNotInitializedError } = await setup();
      await expect(
        WindowStore.initialize({
          ...initialization,
          workArea: { x: 0, y: 0, width: -1, height: 10 },
        }),
      ).rejects.toThrow();
      expect(() => WindowStore.getSnapshot()).toThrow(WindowStoreNotInitializedError);
      await expect(WindowStore.initialize(initialization)).resolves.toMatchObject({ ok: true });
    });
    it("동일 dependency 재초기화는 snapshot을 교체하거나 알리지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      expect(await WindowStore.initialize({ ...initialization })).toMatchObject({
        ok: true,
        changed: false,
        value: before,
      });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("getSnapshot", () => {
    it("초기화 전에는 lifecycle 오류를 던진다", async () => {
      const { WindowStore, WindowStoreNotInitializedError } = await setup();
      expect(() => WindowStore.getSnapshot()).toThrow(WindowStoreNotInitializedError);
    });
    it("변경 전까지 같은 동결 snapshot을 반환한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const snapshot = WindowStore.getSnapshot();
      expect(WindowStore.getSnapshot()).toBe(snapshot);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.workArea)).toBe(true);
    });
  });

  describe("subscribe", () => {
    it("commit의 새 snapshot을 한 번 알리고 해제 뒤에는 알리지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const observed: WindowState[] = [];
      const unsubscribe = WindowStore.subscribe(() => observed.push(WindowStore.getSnapshot()));
      await WindowStore.createChromeWindow();
      expect(observed).toEqual([WindowStore.getSnapshot()]);
      unsubscribe();
      await WindowStore.createChromeWindow();
      expect(observed).toHaveLength(1);
    });
  });

  describe("command context", () => {
    it("생성 ID를 일반 subscriber보다 먼저 해당 명령 context에 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const events: string[] = [];
      WindowStore.subscribe(() => events.push("subscriber"));

      const result = await WindowStore.createChromeWindow(undefined, {
        onCommit: (committed) => {
          events.push(`context:${committed.change.sessionId}`);
          expect(committed.value).toBe(WindowStore.getSnapshot());
        },
      });

      expect(result).toMatchObject({ ok: true, changed: true });
      expect(events[0]).toMatch(/^context:/);
      expect(events[1]).toBe("subscriber");
    });
  });

  describe.each(["createChromeWindow", "createFileExplorerWindow"] as const)("%s", (method) => {
    it("첫 tab을 가진 visible·active 창을 추가하고 한 번 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const result =
        method === "createChromeWindow"
          ? await WindowStore.createChromeWindow()
          : await WindowStore.createFileExplorerWindow(null);
      expect(result).toMatchObject({ ok: true, changed: true });
      const state = WindowStore.getSnapshot();
      const session = state.sessions[0];
      expect(session.tabs).toHaveLength(1);
      expect(session.activeTabId).toBe(session.tabs[0].id);
      expect(session.tabs[0].navigation.current).toEqual({
        location: method === "createChromeWindow" ? { kind: "new-tab" } : null,
        scrollTop: 0,
      });
      expect(state.activeSessionId).toBe(session.id);
      expect(state.stackingOrder).toEqual([session.id]);
      expect(session.frame.minimized).toBe(false);
      expect(before.sessions).toEqual([]);
      expect(listener).toHaveBeenCalledTimes(1);
    });
    it("초기화 전 명령을 거부한다", async () => {
      const { WindowStore, WindowStoreNotInitializedError } = await setup();
      expect(() =>
        method === "createChromeWindow"
          ? WindowStore.createChromeWindow()
          : WindowStore.createFileExplorerWindow(null),
      ).toThrow(WindowStoreNotInitializedError);
    });
    it("후보 ID 충돌은 snapshot과 알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup([uuid(1), uuid(1)]);
      await WindowStore.initialize(initialization);
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const result =
        method === "createChromeWindow"
          ? await WindowStore.createChromeWindow()
          : await WindowStore.createFileExplorerWindow(null);
      expect(result).toMatchObject({ ok: false, reason: "duplicate-runtime-id" });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe.each(["activate", "minimize", "close"] as const)("%s", (method) => {
    it("대상 창의 상태를 반영하고 한 번 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      await WindowStore.createFileExplorerWindow(null);
      const [first, second] = sessionIds(WindowStore.getSnapshot());
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      await WindowStore[method](method === "activate" ? first : second);
      const state = WindowStore.getSnapshot();
      expect(state.activeSessionId).toBe(first);
      if (method === "activate") expect(state.stackingOrder).toEqual([second, first]);
      if (method === "minimize") expect(state.sessions[1].frame.minimized).toBe(true);
      if (method === "close") expect(sessionIds(state)).toEqual([first]);
      expect(before.sessions).toHaveLength(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });
    it("없는 Session은 거부하고 snapshot·알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const missing = uuid(700) as Parameters<typeof WindowStore.close>[0];
      expect(await WindowStore[method](missing)).toMatchObject({
        ok: false,
        reason: "session-not-found",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("activate", () => {
    it("최소화 창을 복원하고 stacking 최상위로 올린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.minimize(id);
      await WindowStore.createChromeWindow();
      await WindowStore.activate(id);
      expect(WindowStore.getSnapshot().activeSessionId).toBe(id);
      expect(WindowStore.getSnapshot().stackingOrder.at(-1)).toBe(id);
      expect(WindowStore.getSnapshot().sessions[0].frame.minimized).toBe(false);
    });
    it("이미 활성화된 최상위 창은 snapshot과 알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      expect(await WindowStore.activate(before.sessions[0].id)).toMatchObject({
        changed: false,
        reason: "no-op",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe.each(["minimize", "close"] as const)("%s active 선택", (method) => {
    it("비활성 창을 처리해도 현재 active 창을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      await WindowStore.createChromeWindow();
      const [first, second] = sessionIds(WindowStore.getSnapshot());
      await WindowStore[method](first);
      expect(WindowStore.getSnapshot().activeSessionId).toBe(second);
    });
    it("다음 visible 창이 없으면 active를 비운다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      await WindowStore.createChromeWindow();
      const [first, second] = sessionIds(WindowStore.getSnapshot());
      await WindowStore.minimize(first);
      await WindowStore[method](second);
      expect(WindowStore.getSnapshot().activeSessionId).toBeNull();
    });
  });

  describe.each(["toggleMaximize", "move", "resize", "setWorkArea"] as const)("%s", (method) => {
    it("숫자 상태를 반영하며 기존 snapshot을 변경하지 않고 한 번 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const before = WindowStore.getSnapshot();
      const id = before.sessions[0].id;
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      if (method === "toggleMaximize") {
        await WindowStore.toggleMaximize(id);
        expect(WindowStore.getSnapshot().sessions[0].frame).toMatchObject({
          placement: "maximized",
          normalBounds: before.sessions[0].frame.normalBounds,
        });
      } else if (method === "move") {
        await WindowStore.move(id, { x: 900, y: 700 });
        expect(WindowStore.getSnapshot().sessions[0].frame.normalBounds).toEqual({
          x: 390,
          y: 390,
          width: 600,
          height: 400,
        });
      } else if (method === "resize") {
        await WindowStore.resize(id, { width: 100, height: 100 });
        expect(WindowStore.getSnapshot().sessions[0].frame.normalBounds).toEqual({
          x: 200,
          y: 200,
          width: 320,
          height: 200,
        });
      } else {
        await WindowStore.setWorkArea({ x: 0, y: 0, width: 300, height: 200 });
        expect(WindowStore.getSnapshot().workArea).toEqual({ x: 0, y: 0, width: 300, height: 200 });
        expect(WindowStore.getSnapshot().sessions[0].frame.normalBounds).toEqual({
          x: 180,
          y: 168,
          width: 600,
          height: 400,
        });
      }
      expect(before.sessions[0].frame).toMatchObject({
        placement: "normal",
        normalBounds: { x: 200, y: 200, width: 600, height: 400 },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });
    it("잘못된 대상 또는 geometry를 거부하고 알리지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const before = WindowStore.getSnapshot();
      const id = before.sessions[0].id;
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const result =
        method === "toggleMaximize"
          ? await WindowStore.toggleMaximize(uuid(700) as typeof id)
          : method === "move"
            ? await WindowStore.move(id, { x: NaN, y: 0 })
            : method === "resize"
              ? await WindowStore.resize(id, { width: -1, height: 10 })
              : await WindowStore.setWorkArea({ x: 0, y: 0, width: -1, height: 20 });
      expect(result).toMatchObject({
        ok: false,
        reason: method === "toggleMaximize" ? "session-not-found" : "invalid-geometry",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("toggleMaximize", () => {
    it("maximized 창을 normal placement로 복원한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      const bounds = WindowStore.getSnapshot().sessions[0].frame.normalBounds;
      await WindowStore.toggleMaximize(id);
      await WindowStore.toggleMaximize(id);
      expect(WindowStore.getSnapshot().sessions[0].frame).toMatchObject({
        placement: "normal",
        normalBounds: bounds,
      });
    });
  });

  describe("gesture frame 명령", () => {
    it("위치·크기와 maximized 복원을 한 번에 반영하고 한 번만 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.toggleMaximize(id);
      const listener = vi.fn();
      WindowStore.subscribe(listener);

      const result = await WindowStore.applyGestureBounds(
        id,
        { x: 120, y: 80, width: 700, height: 500 },
        "move",
      );

      expect(result).toMatchObject({
        changed: true,
        change: { kind: "window-moved", sessionId: id },
      });
      expect(WindowStore.getSnapshot().sessions[0].frame).toMatchObject({
        placement: "normal",
        normalBounds: { x: 120, y: 80, width: 700, height: 500 },
      });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("시작 frame의 bounds·placement를 한 commit으로 정확히 복구한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.toggleMaximize(id);
      const startFrame = WindowStore.getSnapshot().sessions[0].frame;
      await WindowStore.applyGestureBounds(id, { x: 120, y: 80, width: 700, height: 500 }, "move");
      const listener = vi.fn();
      WindowStore.subscribe(listener);

      const result = await WindowStore.restoreFrame(id, startFrame);

      expect(result).toMatchObject({
        changed: true,
        change: { kind: "window-frame-restored", sessionId: id },
      });
      expect(WindowStore.getSnapshot().sessions[0].frame).toEqual(startFrame);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("화면 밖 resize에서 잡지 않은 왼쪽·위쪽 위치를 보정하지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;

      const result = await WindowStore.applyGestureBounds(
        id,
        { x: -80, y: -40, width: 700, height: 620 },
        "resize",
      );

      expect(result).toMatchObject({
        changed: true,
        change: { kind: "window-resized", sessionId: id },
      });
      expect(WindowStore.getSnapshot().sessions[0].frame.normalBounds).toEqual({
        x: -80,
        y: -40,
        width: 700,
        height: 620,
      });
    });

    it("invalid·no-op gesture frame은 snapshot과 알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const before = WindowStore.getSnapshot();
      const id = before.sessions[0].id;
      const listener = vi.fn();
      WindowStore.subscribe(listener);

      await expect(
        WindowStore.applyGestureBounds(
          id,
          { x: Number.NaN, y: 0, width: 600, height: 400 },
          "resize",
        ),
      ).resolves.toMatchObject({ changed: false, reason: "invalid-geometry" });
      await expect(WindowStore.restoreFrame(id, before.sessions[0].frame)).resolves.toMatchObject({
        changed: false,
        reason: "no-op",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe.each(["chrome", "file-explorer"] as const)("%s tab 명령", (kind) => {
    /**
     * 실제 앱별 Store 명령을 호출하는 fixture를 만든다. private 구현을 노출하지 않고 snapshot의 tab을 관찰한다.
     */
    const fixture = async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      if (kind === "chrome") await WindowStore.createChromeWindow();
      else await WindowStore.createFileExplorerWindow(null);
      const session = WindowStore.getSnapshot().sessions[0];
      /**
       * 첫 Session의 현재 tab 목록을 읽는다. 종료된 Session은 빈 목록으로 관찰한다.
       */
      const tabs = () => WindowStore.getSnapshot().sessions[0]?.tabs ?? [];
      /**
       * 명령 결과의 snapshot 교체와 구독 알림을 독립적으로 관찰할 기준을 만든다.
       */
      const observe = () => {
        const before = WindowStore.getSnapshot();
        const listener = vi.fn();
        WindowStore.subscribe(listener);
        return { before, listener };
      };
      if (session.kind === "chrome") {
        /**
         * 현재 Chrome tab ID를 얻으며 없는 index에는 유효한 형식의 미등록 ID를 제공한다.
         */
        const id = (index: number) =>
          (tabs()[index]?.id ?? uuid(700)) as typeof session.activeTabId;
        return {
          WindowStore,
          tabs,
          observe,
          session,
          /**
           * 실제 앱별 tab 추가 명령을 호출한다.
           */
          add: () => WindowStore.addChromeTab(session.id),
          /**
           * 현재 tab 목록의 지정 index를 실제 앱별 활성화 명령에 전달한다.
           */
          activate: (index: number) => WindowStore.activateChromeTab(session.id, id(index)),
          /**
           * 현재 tab 목록의 지정 index를 실제 앱별 종료 명령에 전달한다.
           */
          close: (index: number) => WindowStore.closeChromeTab(session.id, id(index)),
          /**
           * 정상 또는 누락 Resource fixture로 실제 앱별 탐색 명령을 호출한다.
           */
          navigate: (index: number, target: "a" | "b" | "missing") =>
            WindowStore.navigateChrome(session.id, id(index), {
              kind: "content",
              ref:
                target === "a"
                  ? contentA
                  : target === "b"
                    ? contentB
                    : createResourceRef("content", uuid(701)),
            }),
          /**
           * 지정 tab의 실제 뒤로 이동 명령을 호출한다.
           */
          back: (index: number) => WindowStore.goBackChrome(session.id, id(index)),
          /**
           * 지정 tab의 실제 앞으로 이동 명령을 호출한다.
           */
          forward: (index: number) => WindowStore.goForwardChrome(session.id, id(index)),
          /**
           * 지정 tab의 실제 scroll 변경 명령을 호출한다. 잘못된 숫자도 변환 없이 전달한다.
           */
          scroll: (index: number, top: number) =>
            WindowStore.setChromeScrollTop(session.id, id(index), top),
          locationA: { kind: "content", ref: contentA },
          locationB: { kind: "content", ref: contentB },
        };
      }
      /**
       * 현재 Explorer tab ID를 얻으며 없는 index에는 유효한 형식의 미등록 ID를 제공한다.
       */
      const id = (index: number) => (tabs()[index]?.id ?? uuid(700)) as typeof session.activeTabId;
      return {
        WindowStore,
        tabs,
        observe,
        session,
        /**
         * 실제 앱별 tab 추가 명령을 호출한다.
         */
        add: () => WindowStore.addFileExplorerTab(session.id),
        /**
         * 현재 tab 목록의 지정 index를 실제 앱별 활성화 명령에 전달한다.
         */
        activate: (index: number) => WindowStore.activateFileExplorerTab(session.id, id(index)),
        /**
         * 현재 tab 목록의 지정 index를 실제 앱별 종료 명령에 전달한다.
         */
        close: (index: number) => WindowStore.closeFileExplorerTab(session.id, id(index)),
        /**
         * 정상 또는 누락 Resource fixture로 실제 앱별 탐색 명령을 호출한다.
         */
        navigate: (index: number, target: "a" | "b" | "missing") =>
          WindowStore.navigateFileExplorer(
            session.id,
            id(index),
            target === "a"
              ? folderA
              : target === "b"
                ? folderB
                : createResourceRef("folder", uuid(701)),
          ),
        /**
         * 지정 tab의 실제 뒤로 이동 명령을 호출한다.
         */
        back: (index: number) => WindowStore.goBackFileExplorer(session.id, id(index)),
        /**
         * 지정 tab의 실제 앞으로 이동 명령을 호출한다.
         */
        forward: (index: number) => WindowStore.goForwardFileExplorer(session.id, id(index)),
        /**
         * 지정 tab의 실제 scroll 변경 명령을 호출한다. 잘못된 숫자도 변환 없이 전달한다.
         */
        scroll: (index: number, top: number) =>
          WindowStore.setFileExplorerScrollTop(session.id, id(index), top),
        locationA: folderA,
        locationB: folderB,
      };
    };

    describe(kind === "chrome" ? "addChromeTab" : "addFileExplorerTab", () => {
      it("끝에 기본 위치 tab을 추가·활성화하고 기존 tab을 보존한다", async () => {
        const f = await fixture();
        await f.navigate(0, "a");
        const { before, listener } = f.observe();
        await f.add();
        expect(f.tabs()).toHaveLength(2);
        expect(f.tabs()[0]).toEqual(before.sessions[0].tabs[0]);
        expect(f.tabs()[1].navigation).toEqual({
          current: { location: kind === "chrome" ? { kind: "new-tab" } : null, scrollTop: 0 },
          backStack: [],
          forwardStack: [],
        });
        expect(f.WindowStore.getSnapshot().sessions[0].activeTabId).toBe(f.tabs()[1].id);
        expect(listener).toHaveBeenCalledTimes(1);
      });
      it("ID 발급기 부재는 snapshot을 보존하고 알리지 않는다", async () => {
        const f = await fixture();
        const { before, listener } = f.observe();
        vi.stubGlobal("crypto", {});
        expect(await f.add()).toMatchObject({ ok: false, reason: "runtime-id-unavailable" });
        expect(f.WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe(kind === "chrome" ? "activateChromeTab" : "activateFileExplorerTab", () => {
      it("대상 tab만 활성화하고 history는 유지한다", async () => {
        const f = await fixture();
        await f.add();
        const { before, listener } = f.observe();
        await f.activate(0);
        expect(f.WindowStore.getSnapshot().sessions[0].activeTabId).toBe(f.tabs()[0].id);
        expect(f.tabs()).toEqual(before.sessions[0].tabs);
        expect(listener).toHaveBeenCalledTimes(1);
      });
      it("이미 활성인 tab은 snapshot을 교체하거나 알리지 않는다", async () => {
        const f = await fixture();
        const { before, listener } = f.observe();
        expect(await f.activate(0)).toMatchObject({ changed: false, reason: "no-op" });
        expect(f.WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe(kind === "chrome" ? "closeChromeTab" : "closeFileExplorerTab", () => {
      it.each([
        { active: 1, closed: 1, next: 2, label: "오른쪽" },
        { active: 2, closed: 2, next: 1, label: "왼쪽" },
        { active: 2, closed: 0, next: 2, label: "기존 active" },
      ])("종료 뒤 $label tab을 선택한다", async ({ active, closed, next }) => {
        const f = await fixture();
        await f.add();
        await f.add();
        await f.activate(active);
        const expectedId = f.tabs()[next].id;
        const { before, listener } = f.observe();
        await f.close(closed);
        expect(f.WindowStore.getSnapshot().sessions[0].activeTabId).toBe(expectedId);
        expect(f.tabs()).toHaveLength(2);
        expect(before.sessions[0].tabs).toHaveLength(3);
        expect(listener).toHaveBeenCalledTimes(1);
      });
      it("마지막 tab을 닫으면 Session을 제거한다", async () => {
        const f = await fixture();
        const { listener } = f.observe();
        await f.close(0);
        expect(f.WindowStore.getSnapshot()).toMatchObject({
          sessions: [],
          stackingOrder: [],
          activeSessionId: null,
        });
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });

    describe(kind === "chrome" ? "navigateChrome" : "navigateFileExplorer", () => {
      it("위치 이동 시 현재 scroll을 history에 보존하고 forward를 비운다", async () => {
        const f = await fixture();
        await f.navigate(0, "a");
        await f.scroll(0, 48);
        await f.navigate(0, "b");
        await f.back(0);
        const { before, listener } = f.observe();
        await f.navigate(0, "b");
        const nav = f.tabs()[0].navigation;
        expect(nav.current).toEqual({ location: f.locationB, scrollTop: 0 });
        expect(nav.backStack.at(-1)).toEqual({ location: f.locationA, scrollTop: 48 });
        expect(nav.forwardStack).toEqual([]);
        expect(before.sessions[0].tabs[0].navigation.forwardStack).toHaveLength(1);
        expect(listener).toHaveBeenCalledTimes(1);
      });
      it("존재하지 않는 Resource는 거부하고 snapshot·알림을 유지한다", async () => {
        const f = await fixture();
        const { before, listener } = f.observe();
        expect(await f.navigate(0, "missing")).toMatchObject({
          ok: false,
          reason: kind === "chrome" ? "content-not-found" : "folder-not-found",
        });
        expect(f.WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
      it("같은 위치 요청은 history·scroll·알림을 변경하지 않는다", async () => {
        const f = await fixture();
        await f.navigate(0, "a");
        await f.scroll(0, 48);
        const { before, listener } = f.observe();
        expect(await f.navigate(0, "a")).toMatchObject({ changed: false, reason: "no-op" });
        expect(f.WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
      it("다른 tab의 위치와 history를 변경하지 않는다", async () => {
        const f = await fixture();
        await f.add();
        const untouched = f.tabs()[1];
        await f.navigate(0, "a");
        expect(f.tabs()[1]).toEqual(untouched);
      });
    });

    describe.each(["back", "forward"] as const)("%s", (direction) => {
      it("저장된 위치와 scroll을 함께 복원한다", async () => {
        const f = await fixture();
        await f.navigate(0, "a");
        await f.scroll(0, 48);
        await f.navigate(0, "b");
        await f.scroll(0, 96);
        if (direction === "forward") await f.back(0);
        const { before, listener } = f.observe();
        await f[direction](0);
        expect(f.tabs()[0].navigation.current).toEqual({
          location: direction === "back" ? f.locationA : f.locationB,
          scrollTop: direction === "back" ? 48 : 96,
        });
        expect(f.WindowStore.getSnapshot()).not.toBe(before);
        expect(listener).toHaveBeenCalledTimes(1);
      });
      it("이동할 history가 없으면 상태와 알림을 유지한다", async () => {
        const f = await fixture();
        const { before, listener } = f.observe();
        expect(await f[direction](0)).toMatchObject({ changed: false, reason: "no-op" });
        expect(f.WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe(kind === "chrome" ? "setChromeScrollTop" : "setFileExplorerScrollTop", () => {
      it("현재 scroll만 변경하고 위치와 양방향 history를 보존한다", async () => {
        const f = await fixture();
        await f.navigate(0, "a");
        const { before, listener } = f.observe();
        await f.scroll(0, 64);
        expect(f.tabs()[0].navigation).toEqual({
          ...before.sessions[0].tabs[0].navigation,
          current: { location: f.locationA, scrollTop: 64 },
        });
        expect(listener).toHaveBeenCalledTimes(1);
      });
      it.each([NaN, -1, Infinity])(
        "유효하지 않은 scroll %s를 거부하고 알리지 않는다",
        async (top) => {
          const f = await fixture();
          const { before, listener } = f.observe();
          expect(await f.scroll(0, top)).toMatchObject({ ok: false, reason: "invalid-scroll-top" });
          expect(f.WindowStore.getSnapshot()).toBe(before);
          expect(listener).not.toHaveBeenCalled();
        },
      );
      it("같은 scroll 요청은 snapshot을 교체하지 않는다", async () => {
        const f = await fixture();
        const { before, listener } = f.observe();
        expect(await f.scroll(0, 0)).toMatchObject({ changed: false, reason: "no-op" });
        expect(f.WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe.each(["activate", "close", "navigate", "back", "forward", "scroll"] as const)(
      "%s 대상 검증",
      (method) => {
        it("없는 tab은 거부하고 snapshot·알림을 유지한다", async () => {
          const f = await fixture();
          const { before, listener } = f.observe();
          const result =
            method === "navigate"
              ? await f.navigate(99, "a")
              : method === "scroll"
                ? await f.scroll(99, 10)
                : await f[method](99);
          expect(result).toMatchObject({ ok: false, reason: "tab-not-found" });
          expect(f.WindowStore.getSnapshot()).toBe(before);
          expect(listener).not.toHaveBeenCalled();
        });
      },
    );
  });

  describe("refreshChrome", () => {
    it("revision만 증가시키고 위치·history·scroll을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      const chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome.kind !== "chrome") throw new Error("expected chrome");
      await WindowStore.setChromeScrollTop(chrome.id, chrome.activeTabId, 24);
      await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, {
        kind: "not-found",
        address: "/missing" as InternalAddress,
      });
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      await WindowStore.refreshChrome(chrome.id, chrome.activeTabId);
      const after = WindowStore.getSnapshot().sessions[0];
      if (after.kind !== "chrome") throw new Error("expected chrome");
      expect(after.tabs[0].navigation).toEqual(before.sessions[0].tabs[0].navigation);
      expect(after.tabs[0].reloadRevision).toBe(1);
      expect(listener).toHaveBeenCalledTimes(1);
    });
    it("없는 tab은 거부하고 snapshot·알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome.kind !== "chrome") throw new Error("expected chrome");
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      expect(
        await WindowStore.refreshChrome(chrome.id, uuid(700) as typeof chrome.activeTabId),
      ).toMatchObject({ ok: false, reason: "tab-not-found" });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("다른 dependency 재결합을 거부하고 기존 snapshot을 유지한다", async () => {
      const { WindowStore, WindowStoreAlreadyInitializedError, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const before = WindowStore.getSnapshot();

      await expect(
        WindowStore.initialize({
          ...initialization,
          workspace: {
            /**
             * fixture의 현재 Workspace snapshot을 반환한다.
             */
            getSnapshot: () => initialWorkspace,
          },
        }),
      ).rejects.toBeInstanceOf(WindowStoreAlreadyInitializedError);
      expect(WindowStore.getSnapshot()).toBe(before);
    });

    it("초기 mode를 생략하면 browser 폭을 읽지 않고 desktop으로 시작한다", async () => {
      const { WindowStore, initialization } = await setup();
      const { mode: _mode, ...withoutMode } = initialization;

      await WindowStore.initialize(withoutMode);

      expect(WindowStore.getSnapshot().mode).toBe("desktop");
    });

    it("초기 geometry dependency의 사후 변경이 새 Window 배치를 바꾸지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      initialization.placementConfig.defaultSize.width = 900;
      initialization.placementConfig.cascadeOffset.x = 400;
      initialization.workArea.width = 50;

      await WindowStore.createChromeWindow();
      expect(WindowStore.getSnapshot().workArea.width).toBe(1000);
      expect(WindowStore.getSnapshot().sessions[0]?.frame.normalBounds).toEqual({
        x: 200,
        y: 200,
        width: 600,
        height: 400,
      });
    });
  });

  describe("통합 시나리오", () => {
    it("직렬 생성은 최신 snapshot에서 중앙·cascade 배치하고 순서대로 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const observed: number[] = [];
      WindowStore.subscribe(() => observed.push(WindowStore.getSnapshot().sessions.length));

      const first = WindowStore.createFileExplorerWindow(null);
      const second = WindowStore.createChromeWindow();
      await Promise.all([first, second]);

      const state = WindowStore.getSnapshot();
      expect(observed).toEqual([1, 2]);
      expect(state.sessions[0]?.frame.normalBounds).toEqual({
        x: 200,
        y: 200,
        width: 600,
        height: 400,
      });
      expect(state.sessions[1]?.frame.normalBounds).toEqual({
        x: 230,
        y: 220,
        width: 600,
        height: 400,
      });
      expect(state.stackingOrder).toEqual(sessionIds(state));
      expect(state.activeSessionId).toBe(state.sessions[1]?.id);
    });

    it("listener 오류를 격리하고 listener의 재진입 명령을 현재 commit 뒤에 실행한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const events: string[] = [];
      let followUp: Promise<unknown> | undefined;
      WindowStore.subscribe(() => {
        events.push(`first:${WindowStore.getSnapshot().sessions.length}`);
        if (followUp === undefined) followUp = WindowStore.createChromeWindow();
      });
      WindowStore.subscribe(() => {
        throw new Error("listener failure");
      });
      const unsubscribe = WindowStore.subscribe(() => events.push("last"));

      await WindowStore.createFileExplorerWindow(null);
      await followUp;
      unsubscribe();
      await WindowStore.createChromeWindow();

      expect(events).toEqual(["first:1", "last", "first:2", "last", "first:3"]);
    });

    it("Content open은 active/MRU Chrome을 복원해 반복할 때마다 새 tab을 추가한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const chromeId = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.createFileExplorerWindow(null);
      await WindowStore.minimize(chromeId);

      await WindowStore.openContent(contentA);
      await WindowStore.openContent(contentA);
      const chrome = WindowStore.getSnapshot().sessions.find(({ id }) => id === chromeId)!;
      if (chrome.kind !== "chrome") throw new Error("expected chrome");
      expect(chrome.tabs).toHaveLength(3);
      expect(chrome.tabs.slice(1).map((tab) => tab.navigation.current.location)).toEqual([
        { kind: "content", ref: contentA },
        { kind: "content", ref: contentA },
      ]);
      expect(chrome.frame.minimized).toBe(false);
      expect(WindowStore.getSnapshot().activeSessionId).toBe(chromeId);

      await WindowStore.openContentInNewWindow(contentB);
      expect(
        WindowStore.getSnapshot().sessions.filter(({ kind }) => kind === "chrome"),
      ).toHaveLength(2);
    });

    it("mobile tab 추가와 minimize는 ID·snapshot·알림 없이 no-op이다", async () => {
      const { WindowStore, initialization, getRandomUUIDCallCount } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      const chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome?.kind !== "chrome") throw new Error("expected chrome");
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const issueCount = getRandomUUIDCallCount();

      expect(await WindowStore.addChromeTab(chrome.id)).toMatchObject({ changed: false });
      expect(await WindowStore.minimize(chrome.id)).toMatchObject({ changed: false });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
      expect(getRandomUUIDCallCount()).toBe(issueCount);

      await WindowStore.createFileExplorerWindow(null);
      const explorer = WindowStore.getSnapshot().sessions[0];
      if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
      const explorerBefore = WindowStore.getSnapshot();
      const explorerIssueCount = getRandomUUIDCallCount();
      expect(await WindowStore.addFileExplorerTab(explorer.id)).toMatchObject({ changed: false });
      expect(WindowStore.getSnapshot()).toBe(explorerBefore);
      expect(getRandomUUIDCallCount()).toBe(explorerIssueCount);
    });

    it("mobile Content 종료는 종료 시점의 최신 parent로 fresh Explorer를 연다", async () => {
      const { WindowStore, initialization, setWorkspaceState, workspace } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      const chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome?.kind !== "chrome") throw new Error("expected chrome");

      setWorkspaceState({
        ...initialWorkspace,
        placements: initialWorkspace.placements.map((placement) =>
          placement.resource.id === contentA.id ? { ...placement, parent: folderB } : placement,
        ),
      });
      await WindowStore.closeChromeTab(chrome.id, chrome.activeTabId);

      const explorer = WindowStore.getSnapshot().sessions[0];
      expect(explorer?.kind).toBe("file-explorer");
      if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
      expect(explorer.tabs[0]?.navigation.current.location).toEqual(folderB);
      expect(WindowStore.getSnapshot()).toMatchObject({
        mode: "mobile",
        activeSessionId: explorer.id,
      });
      expect(workspace.getSnapshot).toHaveBeenCalled();
    });

    it("mobile 앱 교체와 responsive 정리는 한 snapshot으로 cardinality를 지킨다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      await WindowStore.createFileExplorerWindow(folderA);
      await WindowStore.createChromeWindow({ kind: "content", ref: contentB });
      const activeBefore = WindowStore.getSnapshot().activeSessionId;
      const observed: Array<{ count: number; kinds: string[] }> = [];
      WindowStore.subscribe(() =>
        observed.push({
          count: WindowStore.getSnapshot().sessions.length,
          kinds: WindowStore.getSnapshot().sessions.map(({ kind }) => kind),
        }),
      );

      await WindowStore.setMode("mobile");
      expect(WindowStore.getSnapshot()).toMatchObject({
        mode: "mobile",
        activeSessionId: activeBefore,
        stackingOrder: [activeBefore],
      });
      await WindowStore.openFolder(folderB);
      expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
      expect(WindowStore.getSnapshot().sessions[0]?.kind).toBe("file-explorer");
      await WindowStore.openContent(contentA);
      expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
      expect(WindowStore.getSnapshot().sessions[0]?.kind).toBe("chrome");
      expect(observed.every(({ count }) => count <= 1)).toBe(true);
      expect(observed.some(({ kinds }) => kinds.length === 0)).toBe(false);
      const beforeNoOp = WindowStore.getSnapshot();
      expect(await WindowStore.setMode("mobile")).toMatchObject({ changed: false });
      expect(WindowStore.getSnapshot()).toBe(beforeNoOp);
      expect(await WindowStore.setMode("tablet" as "mobile")).toMatchObject({
        ok: false,
        changed: false,
        reason: "invalid-mode",
      });
      expect(WindowStore.getSnapshot()).toBe(beforeNoOp);
      await WindowStore.setMode("desktop");
      expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
    });

    it("mobile의 move·resize·maximize는 normalBounds를 보존하는 no-op이다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const session = WindowStore.getSnapshot().sessions[0];
      await WindowStore.setMode("mobile");
      const before = WindowStore.getSnapshot();

      expect(await WindowStore.move(session.id, { x: 500, y: 400 })).toMatchObject({
        changed: false,
      });
      expect(await WindowStore.resize(session.id, { width: 900, height: 700 })).toMatchObject({
        changed: false,
      });
      expect(await WindowStore.toggleMaximize(session.id)).toMatchObject({ changed: false });
      expect(WindowStore.getSnapshot()).toBe(before);
    });

    it("mobile replacement 후보 ID 발급 실패는 기존 Session을 보존한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");
      await WindowStore.createFileExplorerWindow(folderA);
      const before = WindowStore.getSnapshot();
      vi.stubGlobal("crypto", { randomUUID: vi.fn(() => before.sessions[0].id) });

      expect(await WindowStore.createChromeWindow()).toMatchObject({
        ok: false,
        changed: false,
        reason: "duplicate-runtime-id",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
    });

    it("mobile application launcher는 same-app no-op과 other-app 단일 commit을 구분한다", async () => {
      const { WindowStore, initialization, getRandomUUIDCallCount } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");
      const observed: WindowState[] = [];
      WindowStore.subscribe(() => observed.push(WindowStore.getSnapshot()));

      expect(await WindowStore.launchMobileApplication("file-explorer")).toMatchObject({
        changed: true,
        change: { kind: "mobile-application-launched" },
      });
      const explorer = WindowStore.getSnapshot();
      expect(explorer.sessions[0]).toMatchObject({
        kind: "file-explorer",
        tabs: [{ navigation: { current: { location: null } } }],
      });
      const issueCount = getRandomUUIDCallCount();
      expect(await WindowStore.launchMobileApplication("file-explorer")).toMatchObject({
        changed: false,
        value: explorer,
      });
      expect(getRandomUUIDCallCount()).toBe(issueCount);

      expect(await WindowStore.launchMobileApplication("chrome")).toMatchObject({
        changed: true,
        change: { kind: "mobile-application-launched" },
      });
      expect(WindowStore.getSnapshot().sessions).toHaveLength(1);
      expect(WindowStore.getSnapshot().sessions[0]).toMatchObject({
        kind: "chrome",
        tabs: [{ navigation: { current: { location: { kind: "new-tab" } } } }],
      });
      expect(observed).toHaveLength(2);
      expect(observed.every(({ sessions }) => sessions.length === 1)).toBe(true);
    });

    it("mobile Chrome의 Content open은 ID를 만들지 않고 유일한 tab history에서 navigate한다", async () => {
      const { WindowStore, initialization, getRandomUUIDCallCount } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      const before = WindowStore.getSnapshot();
      const chrome = before.sessions[0];
      if (chrome?.kind !== "chrome") throw new Error("expected chrome");
      const issueCount = getRandomUUIDCallCount();

      await WindowStore.openContent(contentB);

      const after = WindowStore.getSnapshot().sessions[0];
      if (after?.kind !== "chrome") throw new Error("expected chrome");
      expect(after.id).toBe(chrome.id);
      expect(after.activeTabId).toBe(chrome.activeTabId);
      expect(after.tabs).toHaveLength(1);
      expect(after.tabs[0]?.navigation).toMatchObject({
        current: { location: { kind: "content", ref: contentB } },
        backStack: [{ location: { kind: "content", ref: contentA } }],
      });
      expect(getRandomUUIDCallCount()).toBe(issueCount);
    });

    it("mobile launcher는 desktop에서 거부하고 snapshot을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const before = WindowStore.getSnapshot();

      expect(await WindowStore.launchMobileApplication("chrome")).toMatchObject({
        ok: false,
        changed: false,
        reason: "mobile-mode-required",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
    });
  });

  describe("openFolder", () => {
    it("Folder 외부 open은 active-tab exact match의 MRU만 재사용하고 inactive match는 새 창을 만든다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createFileExplorerWindow(folderA);
      await WindowStore.createFileExplorerWindow(folderA);
      const [lower, upper] = sessionIds(WindowStore.getSnapshot());
      await WindowStore.minimize(upper);

      await WindowStore.openFolder(folderA);
      expect(WindowStore.getSnapshot().activeSessionId).toBe(upper);
      expect(WindowStore.getSnapshot().stackingOrder.at(-1)).toBe(upper);
      await WindowStore.addFileExplorerTab(upper);
      const count = WindowStore.getSnapshot().sessions.length;
      await WindowStore.openFolder(folderA);
      expect(WindowStore.getSnapshot().sessions).toHaveLength(count);
      expect(WindowStore.getSnapshot().activeSessionId).toBe(lower);
      await WindowStore.navigateFileExplorer(
        lower,
        (
          WindowStore.getSnapshot().sessions.find(({ id }) => id === lower) as never as {
            activeTabId: Parameters<typeof WindowStore.navigateFileExplorer>[1];
          }
        ).activeTabId,
        folderB,
      );
      await WindowStore.openFolder(folderA);
      expect(WindowStore.getSnapshot().sessions).toHaveLength(count + 1);
    });

    it("각 Folder 명령은 실행 시점의 최신 Workspace snapshot을 읽는다", async () => {
      const { WindowStore, initialization, setWorkspaceState, workspace } = await setup();
      await WindowStore.initialize(initialization);
      setWorkspaceState({
        ...initialWorkspace,
        folders: initialWorkspace.folders.filter(({ ref }) => ref.id !== folderB.id),
        placements: initialWorkspace.placements.filter(
          ({ resource }) => resource.id !== folderB.id,
        ),
      });

      expect(await WindowStore.openFolder(folderB)).toMatchObject({
        ok: false,
        changed: false,
        reason: "folder-not-found",
      });
      expect(workspace.getSnapshot).toHaveBeenCalled();
      expect(WindowStore.getSnapshot().sessions).toEqual([]);
    });
  });

  describe("createChromeWindow", () => {
    it("command 입력과 반환 snapshot의 중첩 객체를 외부에서 변조할 수 없다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      const mutable = { kind: "content", ref: { ...contentA } } as ChromeLocation;
      await WindowStore.createChromeWindow(mutable);
      const snapshot = WindowStore.getSnapshot();

      (mutable as { ref: { id: string } }).ref.id = contentB.id;
      const tab =
        snapshot.sessions[0]?.kind === "chrome" ? snapshot.sessions[0].tabs[0] : undefined;
      expect(tab?.navigation.current.location).toEqual({ kind: "content", ref: contentA });
      expect(Object.isFrozen(snapshot.sessions)).toBe(true);
      expect(Object.isFrozen(snapshot.sessions[0]?.frame.normalBounds)).toBe(true);
      expect(Object.isFrozen(tab?.navigation.current.location)).toBe(true);
      expect(() => (snapshot.sessions as unknown[]).push({})).toThrow();
    });
  });

  describe("close", () => {
    it("mobile Chrome Window 종료는 active new-tab·404만 보고 다른 Content로 복귀하지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");

      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      let chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome?.kind !== "chrome") throw new Error("expected chrome");
      await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, { kind: "new-tab" });
      await WindowStore.close(chrome.id);
      expect(WindowStore.getSnapshot().sessions).toEqual([]);

      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome?.kind !== "chrome") throw new Error("expected chrome");
      await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, {
        kind: "not-found",
        address: "/missing" as InternalAddress,
      });
      await WindowStore.close(chrome.id);
      expect(WindowStore.getSnapshot().sessions).toEqual([]);
    });
  });

  describe("closeChromeTab", () => {
    it("mobile Content의 Desktop parent와 누락 placement는 fresh Desktop Explorer로 복구한다", async () => {
      const { WindowStore, initialization, setWorkspaceState } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");

      setWorkspaceState({
        ...initialWorkspace,
        placements: initialWorkspace.placements.map((placement) =>
          placement.resource.id === contentA.id ? { ...placement, parent: null } : placement,
        ),
      });
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      await WindowStore.close(WindowStore.getSnapshot().sessions[0].id);
      let explorer = WindowStore.getSnapshot().sessions[0];
      if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
      expect(explorer.tabs[0]?.navigation.current.location).toBeNull();

      setWorkspaceState({
        ...initialWorkspace,
        placements: initialWorkspace.placements.filter(
          (placement) => placement.resource.id !== contentA.id,
        ),
      });
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      await WindowStore.close(WindowStore.getSnapshot().sessions[0].id);
      explorer = WindowStore.getSnapshot().sessions[0];
      if (explorer?.kind !== "file-explorer") throw new Error("expected explorer");
      expect(explorer.tabs[0]?.navigation.current.location).toBeNull();
    });

    it("mobile Content 종료의 Explorer 후보 생성 실패는 현재 Chrome을 먼저 제거하지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.setMode("mobile");
      await WindowStore.createChromeWindow({ kind: "content", ref: contentA });
      const before = WindowStore.getSnapshot();
      vi.stubGlobal("crypto", { randomUUID: vi.fn(() => before.sessions[0].id) });

      expect(await WindowStore.close(before.sessions[0].id)).toMatchObject({
        ok: false,
        changed: false,
        reason: "duplicate-runtime-id",
      });
      expect(WindowStore.getSnapshot()).toBe(before);
    });
  });

  describe("setMode", () => {
    it("desktop의 모든 minimized Session은 mobile 전환에서 제거되고 되살아나지 않는다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      await WindowStore.createFileExplorerWindow(folderA);
      for (const session of [...WindowStore.getSnapshot().sessions].reverse()) {
        await WindowStore.minimize(session.id);
      }

      await WindowStore.setMode("mobile");
      expect(WindowStore.getSnapshot()).toMatchObject({
        mode: "mobile",
        sessions: [],
        stackingOrder: [],
        activeSessionId: null,
      });
      await WindowStore.setMode("desktop");
      expect(WindowStore.getSnapshot().sessions).toEqual([]);
    });

    it("mode 다음 workArea 순서에서 desktop frame을 보존하고 새 desktop 영역에 복구한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.move(id, { x: 350, y: 300 });
      await WindowStore.toggleMaximize(id);
      const frame = WindowStore.getSnapshot().sessions[0].frame;

      await WindowStore.setMode("mobile");
      expect(await WindowStore.setWorkArea(initialization.workArea)).toMatchObject({
        changed: false,
      });
      await WindowStore.setWorkArea({ x: 0, y: 0, width: 390, height: 700 });
      expect(WindowStore.getSnapshot().sessions[0].frame).toEqual(frame);

      await WindowStore.setMode("desktop");
      await WindowStore.setWorkArea({ x: 0, y: 0, width: 800, height: 600 });
      expect(WindowStore.getSnapshot().sessions[0].frame).toEqual(frame);
    });

    it("workArea 다음 mode 순서에서도 mobile 진입 전 desktop frame으로 복원한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createFileExplorerWindow(null);
      const id = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.move(id, { x: 350, y: 300 });
      await WindowStore.toggleMaximize(id);
      const frame = WindowStore.getSnapshot().sessions[0].frame;

      await WindowStore.setWorkArea({ x: 0, y: 0, width: 390, height: 700 });
      expect(WindowStore.getSnapshot().sessions[0].frame.normalBounds.x).not.toBe(
        frame.normalBounds.x,
      );
      expect(await WindowStore.activate(id)).toMatchObject({ changed: false });
      expect(await WindowStore.launchMobileApplication("chrome")).toMatchObject({
        ok: false,
        changed: false,
        reason: "mobile-mode-required",
      });
      await WindowStore.setMode("mobile");
      expect(WindowStore.getSnapshot().sessions[0].frame).toEqual(frame);

      await WindowStore.setWorkArea({ x: 0, y: 0, width: 800, height: 600 });
      await WindowStore.setMode("desktop");
      expect(WindowStore.getSnapshot().sessions[0].frame).toEqual(frame);
    });

    it("workArea와 mode 사이의 committed product 명령은 responsive pair를 끝낸다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome?.kind !== "chrome") throw new Error("expected chrome");
      await WindowStore.move(chrome.id, { x: 350, y: 300 });
      const desktopFrame = WindowStore.getSnapshot().sessions[0].frame;

      await WindowStore.setWorkArea({ x: 0, y: 0, width: 390, height: 700 });
      const recoveredFrame = WindowStore.getSnapshot().sessions[0].frame;
      expect(recoveredFrame).not.toEqual(desktopFrame);
      await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, {
        kind: "not-found",
        address: "/after-resize" as InternalAddress,
      });
      await WindowStore.setMode("mobile");

      expect(WindowStore.getSnapshot().sessions[0].frame).toEqual(recoveredFrame);
    });

    it.each(["mode-first", "work-area-first"] as const)(
      "mobile-created 창은 %s desktop 복귀에서 기본 배치를 한 번 적용한다",
      async (order) => {
        const { WindowStore, initialization } = await setup();
        await WindowStore.initialize(initialization);
        await WindowStore.setMode("mobile");
        await WindowStore.setWorkArea({ x: 0, y: 0, width: 390, height: 700 });
        await WindowStore.launchMobileApplication("chrome");

        if (order === "mode-first") {
          await WindowStore.setMode("desktop");
          await WindowStore.setWorkArea({ x: 0, y: 0, width: 800, height: 600 });
        } else {
          await WindowStore.setWorkArea({ x: 0, y: 0, width: 800, height: 600 });
          await WindowStore.setMode("desktop");
        }

        expect(WindowStore.getSnapshot().sessions[0]).toMatchObject({
          frame: {
            normalBounds: { x: 100, y: 100, width: 600, height: 400 },
            placement: "normal",
            minimized: false,
          },
        });
        expect(WindowStore.getSnapshot().sessions[0]).not.toHaveProperty("desktopPlacementPending");
      },
    );
  });
  describe.each(["openFolder", "openContent", "openContentInNewWindow"] as const)(
    "%s 입력 검증",
    (method) => {
      it("없는 Resource는 거부하고 snapshot과 알림을 유지한다", async () => {
        const { WindowStore, initialization } = await setup();
        await WindowStore.initialize(initialization);
        const before = WindowStore.getSnapshot();
        const listener = vi.fn();
        WindowStore.subscribe(listener);
        const result =
          method === "openFolder"
            ? await WindowStore.openFolder(createResourceRef("folder", uuid(700)))
            : await WindowStore[method](createResourceRef("content", uuid(700)));
        expect(result).toMatchObject({
          ok: false,
          reason: method === "openFolder" ? "folder-not-found" : "content-not-found",
        });
        expect(WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
      it("잘못된 kind는 거부하고 snapshot과 알림을 유지한다", async () => {
        const { WindowStore, initialization } = await setup();
        await WindowStore.initialize(initialization);
        const before = WindowStore.getSnapshot();
        const listener = vi.fn();
        WindowStore.subscribe(listener);
        const result =
          method === "openFolder"
            ? await WindowStore.openFolder(
                contentA as unknown as Parameters<typeof WindowStore.openFolder>[0],
              )
            : await WindowStore[method](
                folderA as unknown as Parameters<typeof WindowStore.openContent>[0],
              );
        expect(result).toMatchObject({ ok: false, reason: "invalid-resource-ref" });
        expect(WindowStore.getSnapshot()).toBe(before);
        expect(listener).not.toHaveBeenCalled();
      });
    },
  );

  describe("openContentInNewWindow", () => {
    it("기존 Chrome이 있어도 별도 창을 추가하고 한 번 알린다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const before = WindowStore.getSnapshot();
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      await WindowStore.openContentInNewWindow(contentB);
      const state = WindowStore.getSnapshot();
      expect(state.sessions).toHaveLength(2);
      expect(state.sessions[0]).toEqual(before.sessions[0]);
      expect(state.sessions[1].tabs[0].navigation.current.location).toEqual({
        kind: "content",
        ref: contentB,
      });
      expect(state.activeSessionId).toBe(state.sessions[1].id);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("closeChromeTab", () => {
    it("다른 앱의 tab ID를 거부하고 snapshot과 알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      await WindowStore.createFileExplorerWindow(null);
      const before = WindowStore.getSnapshot();
      const [chrome, explorer] = before.sessions;
      if (chrome.kind !== "chrome" || explorer.kind !== "file-explorer")
        throw new Error("expected apps");
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      expect(
        await WindowStore.closeChromeTab(
          chrome.id,
          explorer.activeTabId as unknown as typeof chrome.activeTabId,
        ),
      ).toMatchObject({ ok: false, changed: false });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe.each(["minimize", "move", "resize", "setWorkArea"] as const)("%s no-op", (method) => {
    it("현재 값과 같으면 snapshot과 알림을 유지한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      if (method === "minimize") await WindowStore.minimize(id);
      const before = WindowStore.getSnapshot();
      const bounds = before.sessions[0].frame.normalBounds;
      const listener = vi.fn();
      WindowStore.subscribe(listener);
      const result =
        method === "minimize"
          ? await WindowStore.minimize(id)
          : method === "move"
            ? await WindowStore.move(id, { x: bounds.x, y: bounds.y })
            : method === "resize"
              ? await WindowStore.resize(id, { width: bounds.width, height: bounds.height })
              : await WindowStore.setWorkArea(before.workArea);
      expect(result).toMatchObject({ changed: false, reason: "no-op" });
      expect(WindowStore.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("frame·history 통합 시나리오", () => {
    it("maximized 중 이동·resize·workArea 변경 후 normal bounds로 복원한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const id = WindowStore.getSnapshot().sessions[0].id;
      await WindowStore.toggleMaximize(id);
      await WindowStore.move(id, { x: 900, y: 700 });
      await WindowStore.resize(id, { width: 100, height: 100 });
      await WindowStore.setWorkArea({ x: 0, y: 0, width: 400, height: 300 });
      expect(WindowStore.getSnapshot().sessions[0].frame).toMatchObject({
        placement: "maximized",
        normalBounds: { x: 280, y: 268, width: 320, height: 200 },
      });
      await WindowStore.toggleMaximize(id);
      expect(WindowStore.getSnapshot().sessions[0].frame).toMatchObject({
        placement: "normal",
        normalBounds: { x: 280, y: 268, width: 320, height: 200 },
      });
    });
    it("Content와 404 사이에서 양방향 history와 scroll을 복원한다", async () => {
      const { WindowStore, initialization } = await setup();
      await WindowStore.initialize(initialization);
      await WindowStore.createChromeWindow();
      const chrome = WindowStore.getSnapshot().sessions[0];
      if (chrome.kind !== "chrome") throw new Error("expected chrome");
      await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, {
        kind: "content",
        ref: contentA,
      });
      await WindowStore.setChromeScrollTop(chrome.id, chrome.activeTabId, 24);
      const missing: ChromeLocation = { kind: "not-found", address: "/missing" as InternalAddress };
      await WindowStore.navigateChrome(chrome.id, chrome.activeTabId, missing);
      await WindowStore.goBackChrome(chrome.id, chrome.activeTabId);
      expect(WindowStore.getSnapshot().sessions[0].tabs[0].navigation.current).toEqual({
        location: { kind: "content", ref: contentA },
        scrollTop: 24,
      });
      await WindowStore.goForwardChrome(chrome.id, chrome.activeTabId);
      expect(WindowStore.getSnapshot().sessions[0].tabs[0].navigation.current).toEqual({
        location: missing,
        scrollTop: 0,
      });
    });
  });
});

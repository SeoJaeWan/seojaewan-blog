import { createElement } from "react";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type PrimaryPanelOperationHandle,
  type WindowState,
} from "../../../../../headless/index.js";
import { type TaskbarPanelsConnection, useTaskbarPanelsConnection } from "./index.js";

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

/** 실제 primary panel runtime을 desktop mode와 조합한다. */
const createRuntime = () => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  return createHeadlessRuntime({ adapters: { windows } });
};

/** 최신 hook 결과를 실제 Provider 아래에서 관찰한다. */
const renderConnection = () => {
  const runtime = createRuntime();
  let current: TaskbarPanelsConnection | undefined;
  const Probe = () => {
    current = useTaskbarPanelsConnection();
    return null;
  };
  const mounted = render(createElement(HeadlessRuntimeProvider, { runtime }, createElement(Probe)));
  return {
    ...mounted,
    get current(): TaskbarPanelsConnection {
      return current!;
    },
  };
};

/** Operation을 시작하고 첫 semantic commit까지 React 구독을 반영한다. */
const startCommitted = async (
  execute: () => PrimaryPanelOperationHandle,
): Promise<PrimaryPanelOperationHandle> => {
  let handle: PrimaryPanelOperationHandle | undefined;
  await act(async () => {
    handle = execute();
    await handle.committed;
  });
  return handle!;
};

afterEach(() => cleanup());

describe("useTaskbarPanelsConnection", () => {
  it("같은 operation ID로 이전 exit를 끝낸 뒤 다음 panel enter를 시작한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    expect(mounted.current.start.widget.open).toBe(true);

    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
    });

    const switching = mounted.current.search.actions.trigger();
    await act(async () => Promise.resolve());
    expect(mounted.current.start.widget.open).toBe(false);
    expect(mounted.current.search.widget.open).toBe(false);

    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(false);
      await Promise.resolve();
    });
    expect(mounted.current.search.widget.open).toBe(true);

    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await switching.settled;
    });
    expect(await switching.presented).toMatchObject({
      status: "sequence-completed",
      results: [
        { status: "completed", operationId: switching.operationId },
        { status: "completed", operationId: switching.operationId },
      ],
    });
  });

  it("widget dismiss 완료 전 query를 보존하고 실제 exit 완료 뒤에만 초기화한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.search.actions.trigger());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await opening.settled;
      await mounted.current.search.actions.updateQuery("한글  query ").settled;
    });
    expect(mounted.current.search.query).toBe("한글  query ");

    await act(async () => {
      mounted.current.search.widget.onOpenChange(false, "outside");
      await Promise.resolve();
    });
    expect(mounted.current.search.widget.open).toBe(false);
    expect(mounted.current.search.query).toBe("한글  query ");

    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(false);
      await Promise.resolve();
    });
    expect(mounted.current.search.query).toBe("");
  });

  it("Resource 실패와 오래된 성공은 보존하고 현재 성공만 close 완료에 연결한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.search.actions.trigger());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await opening.settled;
      await mounted.current.search.actions.updateQuery("보존할 검색").settled;
      await mounted.current.search.resource.track("request-failed").settled;
      await mounted.current.search.resource.settle("request-failed", "failed").settled;
    });
    expect(mounted.current.search.widget.open).toBe(true);
    expect(mounted.current.search.query).toBe("보존할 검색");

    await act(async () => {
      await mounted.current.search.resource.track("request-stale").settled;
    });
    const closing = mounted.current.search.actions.dismiss("escape");
    await act(async () => Promise.resolve());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(false);
      await closing.settled;
    });
    const reopened = await startCommitted(() => mounted.current.search.actions.trigger());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await reopened.settled;
      await mounted.current.search.actions.updateQuery("새 activation").settled;
    });

    const stale = mounted.current.search.resource.settle("request-stale", "succeeded");
    await act(async () => {
      expect(await stale.committed).toMatchObject({
        status: "no-op",
        reason: "stale-resource-open",
      });
      await stale.settled;
    });
    expect(mounted.current.search.widget.open).toBe(true);
    expect(mounted.current.search.query).toBe("새 activation");

    await act(async () => {
      await mounted.current.search.resource.track("request-current").settled;
    });
    const succeeded = mounted.current.search.resource.settle("request-current", "succeeded");
    await act(async () => Promise.resolve());
    expect(mounted.current.search.widget.open).toBe(false);
    expect(mounted.current.search.query).toBe("새 activation");
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(false);
      await succeeded.settled;
    });
    expect(mounted.current.search.query).toBe("");
  });

  it("mobile 전환은 진행 중 switch의 늦은 desktop open을 무효화한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
    });

    const switching = mounted.current.search.actions.trigger();
    await act(async () => Promise.resolve());
    const mobile = mounted.current.dismissForMobile();
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(false);
      await switching.settled;
      await mobile.settled;
    });

    expect(mounted.current.start.widget.open).toBe(false);
    expect(mounted.current.search.widget.open).toBe(false);
    expect(await switching.committed).toMatchObject({
      status: "committed",
      snapshot: { activePanel: null },
    });
  });

  it("connection unmount는 대기 중 exact phase를 중단하고 늦은 completion을 남기지 않는다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());

    act(() => mounted.unmount());
    expect(await opening.presented).toMatchObject({
      status: "aborted",
      operationId: opening.operationId,
      reason: "taskbar-panels-connection-unmounted",
    });
    await opening.settled;
  });

  it("switch 중 unmount는 같은 operation의 exit와 뒤이어 생긴 enter waiter를 모두 정리한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
    });

    const switching = mounted.current.search.actions.trigger();
    await act(async () => Promise.resolve());
    act(() => mounted.unmount());

    expect(await switching.presented).toMatchObject({
      status: "sequence-completed",
      results: [
        { status: "aborted", reason: "taskbar-panels-connection-unmounted" },
        { status: "aborted", reason: "taskbar-panels-connection-unmounted" },
      ],
    });
    await switching.settled;
  });
});

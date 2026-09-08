import { describe, expect, it, vi } from "vitest";

import type { WindowSessionId, WindowStoreResult } from "../../windows/index.js";
import type {
  TaskbarApplicationGroup,
  TaskbarExternalShortcutView,
  TaskbarGroupTarget,
} from "../selectors/index.js";
import {
  createMobileTaskbarApplicationIntent,
  createTaskbarApplicationClickIntent,
  createTaskbarCloseAllIntent,
  createTaskbarExternalShortcutIntent,
  createTaskbarPreviewClickIntent,
  executeTaskbarWindowIntent,
  executeTaskbarWindowOperationIntent,
  type TaskbarWindowCommandPort,
} from "./index.js";

/** 숫자 suffix로 테스트용 WindowSessionId를 만든다. */
const sessionId = (suffix: number) =>
  `80000000-0000-4000-8000-${String(suffix).padStart(12, "0")}` as WindowSessionId;

/** target 목록으로 Chrome application Group fixture를 만든다. */
const group = (targets: readonly TaskbarGroupTarget[]): TaskbarApplicationGroup => ({
  kind: "application-group",
  applicationId: "chrome",
  label: "Chrome",
  pinned: true,
  running: targets.length > 0,
  active: targets.some(({ active }) => active),
  targets,
});

/** ID와 active 상태로 Preview target fixture를 만든다. */
const target = (id: WindowSessionId, active: boolean): TaskbarGroupTarget => ({
  applicationId: "chrome",
  sessionId: id,
  title: "Tab",
  active,
  minimized: false,
});

/** 모든 Window command가 성공하는 spy port를 만든다. */
const commands = () => {
  const result = { ok: true, changed: false, reason: "no-op", value: {} } as WindowStoreResult;
  const port: TaskbarWindowCommandPort = {
    createFileExplorerWindow: vi.fn(() => Promise.resolve(result)),
    createChromeWindow: vi.fn(() => Promise.resolve(result)),
    activate: vi.fn(() => Promise.resolve(result)),
    minimize: vi.fn(() => Promise.resolve(result)),
    close: vi.fn(() => Promise.resolve(result)),
    launchMobileApplication: vi.fn(() => Promise.resolve(result)),
  };
  return port;
};

describe("Taskbar intents", () => {
  it("desktop Group 0/1 active/1 inactive/many click을 명시적 intent로 구분한다", () => {
    const first = target(sessionId(1), true);
    const second = target(sessionId(2), false);
    expect(createTaskbarApplicationClickIntent(group([]))).toEqual({
      type: "launch-default-application",
      applicationId: "chrome",
    });
    expect(createTaskbarApplicationClickIntent(group([first]))).toEqual({
      type: "minimize-window",
      sessionId: first.sessionId,
    });
    expect(createTaskbarApplicationClickIntent(group([{ ...first, active: false }]))).toEqual({
      type: "activate-window",
      sessionId: first.sessionId,
    });
    expect(createTaskbarApplicationClickIntent(group([first, second]))).toEqual({
      type: "open-preview",
      applicationId: "chrome",
    });
  });

  it("Preview는 exact Session activate, shortcut은 current URL의 _blank intent를 만든다", () => {
    const previewTarget = target(sessionId(11), false);
    const shortcut: TaskbarExternalShortcutView = {
      kind: "external-shortcut",
      resource: {
        kind: "external-shortcut",
        id: "80000000-0000-4000-8000-000000000012" as never,
      },
      name: "Docs",
      url: "https://example.com/current",
      pinned: true,
      running: false,
      active: false,
      targets: [],
    };
    expect(createTaskbarPreviewClickIntent(previewTarget)).toEqual({
      type: "activate-window",
      sessionId: previewTarget.sessionId,
    });
    expect(createTaskbarExternalShortcutIntent(shortcut)).toEqual({
      type: "open-external-shortcut",
      url: "https://example.com/current",
      target: "_blank",
    });
  });

  it("close-all은 생성 시 ID snapshot을 복사하고 각 대상을 한 번만 닫는다", async () => {
    const mutable = [target(sessionId(21), false), target(sessionId(22), true)];
    const intent = createTaskbarCloseAllIntent(group(mutable));
    mutable.splice(0, mutable.length, target(sessionId(23), false));
    const port = commands();
    await executeTaskbarWindowIntent(intent, port);
    expect(port.close).toHaveBeenNthCalledWith(1, sessionId(21));
    expect(port.close).toHaveBeenNthCalledWith(2, sessionId(22));
    expect(port.close).toHaveBeenCalledTimes(2);
  });

  it("close-all Operation은 캡처한 각 Session을 자기 queue로 즉시 전달한다", () => {
    const intent = createTaskbarCloseAllIntent(
      group([target(sessionId(31), false), target(sessionId(32), true)]),
    );
    const operations = { execute: vi.fn(() => ({}) as never) };

    const handles = executeTaskbarWindowOperationIntent(intent, operations);

    expect(handles).toHaveLength(2);
    expect(operations.execute).toHaveBeenNthCalledWith(1, {
      type: "close",
      sessionId: sessionId(31),
    });
    expect(operations.execute).toHaveBeenNthCalledWith(2, {
      type: "close",
      sessionId: sessionId(32),
    });
  });

  it("mobile intent는 explicit close 없이 WindowStore launchMobileApplication에 직접 연결한다", async () => {
    const port = commands();
    const intent = createMobileTaskbarApplicationIntent("file-explorer");
    await executeTaskbarWindowIntent(intent, port);
    expect(port.launchMobileApplication).toHaveBeenCalledExactlyOnceWith("file-explorer");
    expect(port.close).not.toHaveBeenCalled();
  });
});

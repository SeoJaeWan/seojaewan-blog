import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft16Regular,
  ArrowRight16Regular,
  ArrowSync16Regular,
  Document16Regular,
  Folder16Regular,
  Search16Regular,
} from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  type ControllerViewModel,
  type HeadlessFeatureRuntime,
  type HeadlessRuntime,
  HeadlessRuntimeProvider,
  TransitionRegistry,
  type WindowAction,
  type WindowFrameState,
  type WindowGestureKind,
  WindowGestures,
  type WindowGestureStore,
  WindowOperations,
  type WindowOperationStore,
  type WindowPlacementConfig,
  type WindowRect,
  type WindowSessionId,
  type WindowState,
  type WindowStoreChange,
  type WindowStoreResult,
} from "../../../../headless/index.js";
import type { WindowStoreCommandContext } from "../../../../headless/windows/index.js";
import chromeIconSrc from "../../../assets/window/chrome.png";
import fileExplorerIconSrc from "../../../assets/window/file-explorer.png";
import { TaskbarApplicationButton } from "../../taskbar/items/index.js";
import {
  createWindowPresentationBinding,
  WindowFrame,
  type WindowFrameBounds,
  type WindowFrameMode,
  type WindowFrameVariant,
  type WindowMotionDestination,
  WindowRoot,
} from "./index.js";

import "./windowFrame.stories.css";

const DESKTOP_BOUNDS: WindowFrameBounds = Object.freeze({
  height: 500,
  left: 48,
  top: 36,
  width: 840,
});

const WINDOW_PLACEMENT_CONFIG: WindowPlacementConfig = Object.freeze({
  defaultSize: Object.freeze({ width: 840, height: 500 }),
  minSize: Object.freeze({ width: 320, height: 240 }),
  edgeMargin: 8,
  cascadeOffset: Object.freeze({ x: 24, y: 24 }),
  titlebarRecoverySize: Object.freeze({ width: 120, height: 30 }),
});

/** fixture에서 Common titlebar의 application-owned tab slot을 채운다. */
const ProductTab = ({
  icon,
  title,
  variant,
}: {
  icon: string;
  title: string;
  variant: WindowFrameVariant;
}) => (
  <h2 className="window-story-tab" data-variant={variant}>
    <img alt="" aria-hidden="true" className="window-story-tab__icon" src={icon} />
    <span className="window-story-tab__title">{title}</span>
  </h2>
);

/** interaction fixture에서 titlebar 안 focusable tab 경계를 제공한다. */
const InteractiveProductTab = () => (
  <div
    aria-label="Chrome 활성 탭"
    className="window-story-tab"
    data-variant="chrome"
    role="tab"
    tabIndex={0}
  >
    <img alt="" aria-hidden="true" className="window-story-tab__icon" src={chromeIconSrc} />
    <span className="window-story-tab__title">React Server Components 정리</span>
  </div>
);

/** route fixture의 icon button을 실제 접근성 이름과 고정 geometry로 표시한다. */
const NavigationButton = ({ children, label }: { children: ReactNode; label: string }) => (
  <button aria-label={label} className="window-story-navigation__button" type="button">
    {children}
  </button>
);

/** File Explorer와 Chrome의 application-owned navigation row를 재현한다. */
const ProductNavigation = ({
  mode,
  variant,
}: {
  mode: WindowFrameMode;
  variant: WindowFrameVariant;
}) => (
  <div className="window-story-navigation" data-mode={mode} data-variant={variant}>
    <div className="window-story-navigation__history">
      <NavigationButton label="뒤로">
        <ArrowLeft16Regular aria-hidden="true" />
      </NavigationButton>
      <NavigationButton label="앞으로">
        <ArrowRight16Regular aria-hidden="true" />
      </NavigationButton>
      <NavigationButton label="새로고침">
        <ArrowSync16Regular aria-hidden="true" />
      </NavigationButton>
    </div>
    <label className="window-story-address">
      <span className="window-story-address__icon" aria-hidden="true">
        {variant === "file-explorer" ? <Folder16Regular /> : <Document16Regular />}
      </span>
      <span className="window-story-address__label">주소</span>
      <input
        aria-label={variant === "file-explorer" ? "주소" : "검색어 또는 URL 입력"}
        defaultValue={variant === "file-explorer" ? "블로그" : "React Server Components 정리"}
      />
    </label>
    {variant === "file-explorer" ? (
      <label className="window-story-search">
        <Search16Regular aria-hidden="true" />
        <span className="window-story-search__label">검색</span>
        <input aria-label="파일 탐색기 검색" defaultValue="Component" />
      </label>
    ) : null}
  </div>
);

const ARTICLE_LINES = [92, 78, 64, 88, 72, 52, 86, 68, 94, 62, 82, 58] as const;

/** 입력과 vertical scroll을 함께 관찰할 Chrome Content placeholder를 렌더링한다. */
const ChromeContent = ({ mode }: { mode: WindowFrameMode }) => (
  <article className="window-story-chrome-content" data-mode={mode}>
    <h1>React Server Components 정리</h1>
    <p>
      실제 Content renderer는 Application이 연결합니다. 이 fixture는 Common content slot의 padding과
      스크롤 경계만 확인합니다.
    </p>
    {ARTICLE_LINES.map((width, index) => (
      <span
        key={`${width}-${index}`}
        className="window-story-chrome-content__line"
        style={{ width: `${width}%` }}
      />
    ))}
  </article>
);

const FILE_NAMES = [
  "React Server Components 정리",
  "미디어 리스트 속도 개선기",
  "모노레포 디자인 시스템 구축",
  "Suspense 스트리밍 삽질기",
  "Web Vitals 개선 기록",
  "SSR에서 CSR로 바꾼 이유",
] as const;

/** 독립 scroll 영역이 있는 File Explorer body placeholder를 렌더링한다. */
const FileExplorerContent = ({ mode }: { mode: WindowFrameMode }) => (
  <div className="window-story-explorer" data-mode={mode}>
    {mode === "desktop" ? (
      <aside aria-label="파일 탐색기 사이드바" className="window-story-explorer__sidebar">
        <strong>즐겨찾기</strong>
        <span>블로그</span>
        <span>프로젝트</span>
        <span>소개</span>
      </aside>
    ) : null}
    <div className="window-story-explorer__files" role="list">
      {FILE_NAMES.map((title, index) => (
        <article key={title} className="window-story-file" role="listitem">
          <span className="window-story-file__cover" data-index={index} />
          <span title={title}>{title}</span>
        </article>
      ))}
    </div>
  </div>
);

/** Story별 제품을 구분하는 안정적인 WindowSession identity를 반환한다. */
const storySessionId = (variant: WindowFrameVariant) =>
  (variant === "file-explorer"
    ? "00000000-0000-4000-8000-000000000201"
    : "00000000-0000-4000-8000-000000000202") as WindowSessionId;

/** Story의 controlled frame 값을 실제 Window controller가 읽을 최소 runtime snapshot으로 만든다. */
const createWindowStoryRuntime = ({
  active,
  bounds,
  maximized,
  mode,
  variant,
}: {
  active: boolean;
  bounds: WindowFrameBounds;
  maximized: boolean;
  mode: WindowFrameMode;
  variant: WindowFrameVariant;
}) => {
  const id = storySessionId(variant);
  const snapshot: WindowState = Object.freeze({
    mode,
    workArea: Object.freeze(
      mode === "mobile"
        ? { x: 0, y: 0, width: 390, height: 794 }
        : { x: 0, y: 0, width: 960, height: 590 },
    ),
    sessions: Object.freeze([
      Object.freeze({
        id,
        kind: variant,
        applicationId: variant,
        frame: Object.freeze({
          normalBounds: Object.freeze({
            x: bounds.left,
            y: bounds.top,
            width: bounds.width,
            height: bounds.height,
          }),
          placement: maximized ? "maximized" : "normal",
          minimized: false,
        }),
        tabs: Object.freeze([]),
        activeTabId: `${variant}-tab` as never,
      }) as WindowState["sessions"][number],
    ]),
    stackingOrder: Object.freeze([id]),
    activeSessionId: active ? id : null,
  });
  const viewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "ready",
    snapshot,
  });
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: () => () => undefined,
    execute: (_action: WindowAction) => ({}) as never,
  }) as unknown as HeadlessFeatureRuntime<WindowState, WindowAction, never>;

  return Object.freeze({ windows }) as unknown as HeadlessRuntime;
};

/** interaction Story가 실제 headless gesture Handle과 구독 가능한 snapshot을 함께 사용할 runtime을 만든다. */
const createInteractiveWindowRuntime = (initialSnapshot: WindowState): HeadlessRuntime => {
  let snapshot = initialSnapshot;
  let viewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "ready",
    snapshot,
  });
  const listeners = new Set<() => void>();
  const sessionId = snapshot.sessions[0].id;

  /** frame을 immutable snapshot에 반영하고 실제 controller subscriber를 알린다. */
  const commitFrame = (
    frame: WindowFrameState,
    kind:
      | "window-moved"
      | "window-resized"
      | "window-frame-restored"
      | "window-maximized"
      | "window-restored" = "window-moved",
  ): WindowStoreResult => {
    snapshot = Object.freeze({
      ...snapshot,
      sessions: Object.freeze(
        snapshot.sessions.map((session) =>
          session.id === sessionId ? Object.freeze({ ...session, frame }) : session,
        ),
      ),
    });
    viewModel = Object.freeze({ status: "ready", snapshot });
    listeners.forEach((listener) => listener());
    return { ok: true, changed: true, value: snapshot, change: { kind, sessionId } };
  };

  const gestureStore: WindowGestureStore = Object.freeze({
    getSnapshot: () => snapshot,
    applyGestureBounds: (_target, bounds, kind) => {
      const session = snapshot.sessions[0];
      return Promise.resolve(
        commitFrame(
          Object.freeze({
            ...session.frame,
            normalBounds: Object.freeze({ ...bounds }),
            placement: "normal",
          }),
          kind === "move" ? "window-moved" : "window-resized",
        ),
      );
    },
    restoreFrame: (_target, frame) => Promise.resolve(commitFrame(frame, "window-frame-restored")),
  });
  const gestures = new WindowGestures(gestureStore);

  /** interaction fixture에서 현재 task가 연결하는 activate·maximize Action만 observable state로 반영한다. */
  const executeWindowAction = (action: WindowAction) => {
    if (action.type === "toggle-maximize") {
      const session = snapshot.sessions[0];
      commitFrame(
        Object.freeze({
          ...session.frame,
          placement: session.frame.placement === "maximized" ? "normal" : "maximized",
        }),
        session.frame.placement === "maximized" ? "window-restored" : "window-maximized",
      );
    }
    return {} as never;
  };

  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    execute: executeWindowAction,
  }) as unknown as HeadlessFeatureRuntime<WindowState, WindowAction, never>;

  return Object.freeze({
    windows,
    windowGestures: Object.freeze({ begin: gestures.begin.bind(gestures) }),
  }) as unknown as HeadlessRuntime;
};

/** lifecycle Story의 상태를 실제 WindowOperations와 구독 가능한 in-memory Store에 연결한다. */
const createLifecycleWindowRuntime = (
  initialSnapshot: WindowState,
  presentationBinding: ReturnType<typeof createWindowPresentationBinding>,
): HeadlessRuntime => {
  let snapshot = initialSnapshot;
  let viewModel: ControllerViewModel<WindowState> = Object.freeze({
    status: "ready",
    snapshot,
  });
  const listeners = new Set<() => void>();

  /** commit callback과 controller subscriber를 production Store 순서로 실행한다. */
  const commit = (
    next: WindowState,
    change: WindowStoreChange,
    context?: WindowStoreCommandContext,
  ): WindowStoreResult => {
    snapshot = Object.freeze(next);
    viewModel = Object.freeze({ status: "ready", snapshot });
    const result = Object.freeze({ ok: true, changed: true, value: snapshot, change });
    context?.onCommit(result);
    listeners.forEach((listener) => listener());
    return result;
  };

  /** 변경이 필요 없는 요청을 실제 Store result 형태로 끝낸다. */
  const noOp = (): WindowStoreResult => ({
    ok: true,
    changed: false,
    reason: "no-op",
    value: snapshot,
  });

  const store = Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** active 창을 최소화하고 다음 visible 최상위 창을 고른다. */
    minimize: (sessionId: WindowSessionId, context?: WindowStoreCommandContext) => {
      const target = snapshot.sessions.find((session) => session.id === sessionId);
      if (target === undefined || target.frame.minimized) return Promise.resolve(noOp());
      const sessions = Object.freeze(
        snapshot.sessions.map((session) =>
          session.id === sessionId
            ? Object.freeze({
                ...session,
                frame: Object.freeze({ ...session.frame, minimized: true }),
              })
            : session,
        ),
      );
      const nextActive = [...snapshot.stackingOrder]
        .reverse()
        .find((id) => id !== sessionId && !sessions.find((session) => session.id === id)?.frame.minimized);
      return Promise.resolve(
        commit(
          Object.freeze({ ...snapshot, sessions, activeSessionId: nextActive ?? null }),
          { kind: "window-minimized", sessionId },
          context,
        ),
      );
    },
    /** 최소화 Session을 복원해 active·topmost로 반영한다. */
    activate: (sessionId: WindowSessionId, context?: WindowStoreCommandContext) => {
      const target = snapshot.sessions.find((session) => session.id === sessionId);
      if (target === undefined) return Promise.resolve(noOp());
      const sessions = Object.freeze(
        snapshot.sessions.map((session) =>
          session.id === sessionId
            ? Object.freeze({
                ...session,
                frame: Object.freeze({ ...session.frame, minimized: false }),
              })
            : session,
        ),
      );
      return Promise.resolve(
        commit(
          Object.freeze({
            ...snapshot,
            sessions,
            stackingOrder: Object.freeze([
              ...snapshot.stackingOrder.filter((id) => id !== sessionId),
              sessionId,
            ]),
            activeSessionId: sessionId,
          }),
          { kind: "window-activated", sessionId },
          context,
        ),
      );
    },
    /** lifecycle fixture에서 사용하지 않는 close는 Session을 실제로 제거한다. */
    close: (sessionId: WindowSessionId, context?: WindowStoreCommandContext) => {
      if (!snapshot.sessions.some((session) => session.id === sessionId))
        return Promise.resolve(noOp());
      const sessions = Object.freeze(snapshot.sessions.filter((session) => session.id !== sessionId));
      const stackingOrder = Object.freeze(snapshot.stackingOrder.filter((id) => id !== sessionId));
      const activeSessionId = stackingOrder.at(-1) ?? null;
      return Promise.resolve(
        commit(
          Object.freeze({ ...snapshot, sessions, stackingOrder, activeSessionId }),
          { kind: "window-closed", sessionId },
          context,
        ),
      );
    },
    /** normal/maximized placement를 전환하고 active·topmost를 유지한다. */
    toggleMaximize: (sessionId: WindowSessionId, context?: WindowStoreCommandContext) => {
      const target = snapshot.sessions.find((session) => session.id === sessionId);
      if (target === undefined) return Promise.resolve(noOp());
      const placement = target.frame.placement === "normal" ? "maximized" : "normal";
      const sessions = Object.freeze(
        snapshot.sessions.map((session) =>
          session.id === sessionId
            ? Object.freeze({
                ...session,
                frame: Object.freeze({ ...session.frame, placement, minimized: false }),
              })
            : session,
        ),
      );
      return Promise.resolve(
        commit(
          Object.freeze({ ...snapshot, sessions, activeSessionId: sessionId }),
          {
            kind: placement === "maximized" ? "window-maximized" : "window-restored",
            sessionId,
          },
          context,
        ),
      );
    },
    /** browser pointer가 계산한 bounds를 즉시 normal placement로 반영한다. */
    applyGestureBounds: (
      sessionId: WindowSessionId,
      bounds: WindowRect,
      kind: WindowGestureKind,
    ) => {
      const target = snapshot.sessions.find((session) => session.id === sessionId);
      if (target === undefined) return Promise.resolve(noOp());
      const sessions = Object.freeze(
        snapshot.sessions.map((session) =>
          session.id === sessionId
            ? Object.freeze({
                ...session,
                frame: Object.freeze({
                  ...session.frame,
                  normalBounds: Object.freeze({ ...bounds }),
                  placement: "normal" as const,
                }),
              })
            : session,
        ),
      );
      return Promise.resolve(
        commit(Object.freeze({ ...snapshot, sessions }), {
          kind: kind === "move" ? "window-moved" : "window-resized",
          sessionId,
        }),
      );
    },
    /** Esc 취소가 gesture 시작 frame을 한 commit으로 복원한다. */
    restoreFrame: (sessionId: WindowSessionId, frame: WindowFrameState) => {
      const target = snapshot.sessions.find((session) => session.id === sessionId);
      if (target === undefined) return Promise.resolve(noOp());
      const sessions = Object.freeze(
        snapshot.sessions.map((session) =>
          session.id === sessionId ? Object.freeze({ ...session, frame }) : session,
        ),
      );
      return Promise.resolve(
        commit(Object.freeze({ ...snapshot, sessions }), {
          kind: "window-frame-restored",
          sessionId,
        }),
      );
    },
  }) as unknown as WindowOperationStore & WindowGestureStore & {
    getSnapshot(): WindowState;
    subscribe(listener: () => void): () => void;
  };
  const transitions = new TransitionRegistry();
  const operations = new WindowOperations({
    presentation: presentationBinding,
    store,
    transitions,
  });
  const gestures = new WindowGestures(store);
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: (listener: () => void) => store.subscribe(listener),
    execute: (action: WindowAction) => operations.execute(action),
  });
  return Object.freeze({
    transitions,
    windows,
    windowGestures: Object.freeze({
      begin: gestures.begin.bind(gestures),
    }),
  }) as unknown as HeadlessRuntime;
};

/** 실제 TaskbarApplicationButton icon box를 viewport 숫자로 측정한다. */
const measureApplicationIcon = (button: HTMLButtonElement | null): WindowMotionDestination | null => {
  const icon = button?.querySelector<HTMLElement>(".taskbar-application-button__icon");
  if (icon === null || icon === undefined) return null;
  const bounds = icon.getBoundingClientRect();
  return Object.freeze({
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height,
  });
};

/** 실제 Operation, presentation binding과 Taskbar icon 측정을 함께 검증하는 두 제품 fixture다. */
const LifecycleProductWindows = ({ focusControls = false }: { focusControls?: boolean }) => {
  const fileExplorerId = storySessionId("file-explorer");
  const chromeId = storySessionId("chrome");
  const taskbarButtonRef = useRef<HTMLButtonElement | null>(null);
  const [destination, setDestination] = useState<WindowMotionDestination | null>(null);
  const [showChromeNavigation, setShowChromeNavigation] = useState(true);
  const presentationBinding = useMemo(() => createWindowPresentationBinding(), []);
  const initialSnapshot = useMemo<WindowState>(
    () =>
      Object.freeze({
        mode: "desktop",
        workArea: Object.freeze({ x: 0, y: 0, width: 960, height: 590 }),
        sessions: Object.freeze([
          Object.freeze({
            id: fileExplorerId,
            kind: "file-explorer",
            applicationId: "file-explorer",
            frame: Object.freeze({
              normalBounds: Object.freeze({ x: 48, y: 36, width: 840, height: 500 }),
              placement: "normal",
              minimized: false,
            }),
            tabs: Object.freeze([]),
            activeTabId: "file-tab" as never,
          }),
          Object.freeze({
            id: chromeId,
            kind: "chrome",
            applicationId: "chrome",
            frame: Object.freeze({
              normalBounds: Object.freeze({ x: 120, y: 28, width: 720, height: 520 }),
              placement: "normal",
              minimized: false,
            }),
            tabs: Object.freeze([]),
            activeTabId: "chrome-tab" as never,
          }),
        ]),
        stackingOrder: Object.freeze([fileExplorerId, chromeId]),
        activeSessionId: chromeId,
      }),
    [chromeId, fileExplorerId],
  );
  const runtime = useMemo(
    () => createLifecycleWindowRuntime(initialSnapshot, presentationBinding),
    [initialSnapshot, presentationBinding],
  );

  /** initial layout 뒤 실제 production icon rect를 WindowRoot numeric prop으로 전달한다. */
  useLayoutEffect(() => {
    setDestination(measureApplicationIcon(taskbarButtonRef.current));
  }, []);

  /** 이동될 수 있는 Taskbar icon을 activation 직전에 다시 측정하고 restore Action을 실행한다. */
  const restoreChrome = () => {
    setDestination(measureApplicationIcon(taskbarButtonRef.current));
    runtime.windows.execute({ type: "activate", sessionId: chromeId });
  };

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <WindowRoot
        aria-label="파일 탐색기 lifecycle 창"
        placementConfig={WINDOW_PLACEMENT_CONFIG}
        presentationBinding={presentationBinding}
        sessionId={fileExplorerId}
        titleBarContent={
          <ProductTab icon={fileExplorerIconSrc} title="프로젝트" variant="file-explorer" />
        }
      >
        <ProductNavigation mode="desktop" variant="file-explorer" />
        <FileExplorerContent mode="desktop" />
      </WindowRoot>
      <WindowRoot
        aria-label="Chrome lifecycle 창"
        minimizeDestination={destination}
        placementConfig={WINDOW_PLACEMENT_CONFIG}
        presentationBinding={presentationBinding}
        sessionId={chromeId}
        titleBarContent={<ProductTab icon={chromeIconSrc} title="Motion 검증" variant="chrome" />}
      >
        {showChromeNavigation ? <ProductNavigation mode="desktop" variant="chrome" /> : null}
        <ChromeContent mode="desktop" />
      </WindowRoot>
      <div className="window-story-taskbar">
        {focusControls ? (
          <button
            aria-label="Chrome focus 대상 제거"
            onClick={() => setShowChromeNavigation(false)}
            type="button"
          >
            focus fallback
          </button>
        ) : null}
        <TaskbarApplicationButton
          application={{ applicationId: "chrome", label: "Chrome 복원", active: false, running: true }}
          onAction={restoreChrome}
          ref={taskbarButtonRef}
        />
      </div>
    </HeadlessRuntimeProvider>
  );
};

/** controller 구독으로 bounds가 실제 갱신되는 Common Window interaction fixture를 렌더링한다. */
const InteractiveProductWindow = () => {
  const id = storySessionId("chrome");
  const initialSnapshot = useMemo<WindowState>(
    () =>
      Object.freeze({
        mode: "desktop",
        workArea: Object.freeze({ x: 0, y: 0, width: 960, height: 590 }),
        sessions: Object.freeze([
          Object.freeze({
            id,
            kind: "chrome",
            applicationId: "chrome",
            frame: Object.freeze({
              normalBounds: Object.freeze({ x: 120, y: 28, width: 720, height: 520 }),
              placement: "normal",
              minimized: false,
            }),
            tabs: Object.freeze([]),
            activeTabId: "chrome-tab" as never,
          }),
        ]),
        stackingOrder: Object.freeze([id]),
        activeSessionId: id,
      }),
    [id],
  );
  const runtime = useMemo(() => createInteractiveWindowRuntime(initialSnapshot), [initialSnapshot]);

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <WindowRoot
        aria-label="Chrome gesture 창"
        placementConfig={WINDOW_PLACEMENT_CONFIG}
        sessionId={id}
        titleBarContent={<InteractiveProductTab />}
      >
        <ProductNavigation mode="desktop" variant="chrome" />
        <ChromeContent mode="desktop" />
      </WindowRoot>
    </HeadlessRuntimeProvider>
  );
};

/** 실제 controller root와 Common production parts 안에 product-specific fixture slots를 조합한다. */
const ProductWindow = ({
  active,
  bounds = DESKTOP_BOUNDS,
  maximized = false,
  mode,
  title,
  variant,
}: {
  active: boolean;
  bounds?: WindowFrameBounds;
  maximized?: boolean;
  mode: WindowFrameMode;
  title: string;
  variant: WindowFrameVariant;
}) => {
  const icon = variant === "file-explorer" ? fileExplorerIconSrc : chromeIconSrc;
  const sessionId = storySessionId(variant);
  const runtime = createWindowStoryRuntime({ active, bounds, maximized, mode, variant });

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <WindowRoot
        aria-label={`${variant === "file-explorer" ? "파일 탐색기" : "Chrome"} 창`}
        placementConfig={WINDOW_PLACEMENT_CONFIG}
        sessionId={sessionId}
        titleBarContent={<ProductTab icon={icon} title={title} variant={variant} />}
      >
        <ProductNavigation mode={mode} variant={variant} />
        {variant === "file-explorer" ? (
          <FileExplorerContent mode={mode} />
        ) : (
          <ChromeContent mode={mode} />
        )}
      </WindowRoot>
    </HeadlessRuntimeProvider>
  );
};

/** Common Window를 usable desktop과 50px taskbar가 있는 고정 visual 환경에 놓는다. */
const WindowStage = ({ children, mode }: { children: ReactNode; mode: WindowFrameMode }) => (
  <div className="window-story-stage" data-mode={mode}>
    {children}
    <div aria-hidden="true" className="window-story-taskbar">
      <img alt="" src={mode === "desktop" ? fileExplorerIconSrc : chromeIconSrc} />
    </div>
  </div>
);

/** desktop normal frame의 핵심 legacy geometry를 실제 browser에서 확인한다. */
const verifyDesktopNormalGeometry = async (canvasElement: HTMLElement, label: string) => {
  const canvas = within(canvasElement);
  const frame = canvas.getByRole("region", { name: label });
  const frameBounds = frame.getBoundingClientRect();
  const controls = within(frame).getAllByRole("button", {
    name: /최소화|최대화|닫기/,
  });

  await expect(frameBounds.width).toBe(840);
  await expect(frameBounds.height).toBe(500);
  await expect(frameBounds.left).toBe(48);
  await expect(frameBounds.top).toBe(36);
  await expect(controls).toHaveLength(3);
  for (const control of controls) {
    await expect(control.getBoundingClientRect().width).toBe(30);
    await expect(control.getBoundingClientRect().height).toBe(30);
  }
  await expect(frame.querySelectorAll(".window-resize-handle")).toHaveLength(8);
};

const meta = {
  title: "Design/Components/Common Window/Frame",
  component: WindowFrame,
  tags: ["autodocs"],
  args: {
    active: true,
    bounds: DESKTOP_BOUNDS,
    children: null,
    maximized: false,
    mode: "desktop",
    titleBar: null,
    variant: "file-explorer",
  },
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "File Explorer와 Chrome이 동일하게 소비하는 Common Window다. 제품 root는 실제 Window controller snapshot과 Action을 연결하고 " +
          "frame leaf는 props만 표시한다. navigation과 body는 아직 Application owner인 명시적 placeholder이며 완성된 File Explorer·Chrome 구현을 뜻하지 않는다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof WindowFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FileExplorerDesktop: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "actual controller snapshot의 active·normal File Explorer frame이다. 주소·검색·sidebar·scroll body는 Application owner를 표시하는 placeholder이며 바깥 frame과 controls만 production Common을 사용한다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="desktop">
      <ProductWindow active mode="desktop" title="블로그" variant="file-explorer" />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    await verifyDesktopNormalGeometry(canvasElement, "파일 탐색기 창");
    await expect(
      within(canvasElement).getByRole("textbox", { name: "파일 탐색기 검색" }),
    ).toHaveValue("Component");
  },
};

export const ChromeDesktopInactiveLongTitle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "actual controller snapshot의 inactive·normal Chrome frame이다. 긴 title과 omnibox·scroll body는 Application owner placeholder로 frame 경계만 검증한다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="desktop">
      <ProductWindow
        active={false}
        bounds={{ height: 520, left: 120, top: 28, width: 720 }}
        mode="desktop"
        title="아주 긴 제목이 Common Window의 control 영역을 침범하지 않고 한 줄로 줄어드는 Chrome Content 문서"
        variant="chrome"
      />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "Chrome 창" });
    await expect(frame).toHaveAttribute("data-active", "false");
    await expect(frame.getBoundingClientRect().width).toBe(720);
    await expect(
      within(frame).getByRole("textbox", { name: "검색어 또는 URL 입력" }),
    ).toBeVisible();
    const content = frame.querySelector<HTMLElement>(".window-frame__content");
    await expect(content).not.toBeNull();
    await expect(content?.scrollWidth).toBe(content?.clientWidth);
  },
};

export const ChromeDesktop: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "active·normal Chrome의 legacy 비교 fixture다. 고정 viewport에서 frame·titlebar·controls·header color와 content slot geometry를 비교한다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="desktop">
      <ProductWindow
        active
        bounds={{ height: 520, left: 120, top: 28, width: 720 }}
        mode="desktop"
        title="React Server Components 정리"
        variant="chrome"
      />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "Chrome 창" });
    const bounds = frame.getBoundingClientRect();
    await expect(bounds.width).toBe(720);
    await expect(bounds.height).toBe(520);
    await expect(bounds.left).toBe(120);
    await expect(bounds.top).toBe(28);
  },
};

export const FileExplorerMaximized: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "desktop usable area를 채우며 restore icon과 8방향 resize 표시를 유지하는 maximized fixture다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="desktop">
      <ProductWindow active maximized mode="desktop" title="프로젝트" variant="file-explorer" />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "파일 탐색기 창" });
    const bounds = frame.getBoundingClientRect();
    await expect(bounds.width).toBe(960);
    await expect(bounds.height).toBe(590);
    await expect(within(frame).getByRole("button", { name: "이전 크기로 복원" })).toBeVisible();
  },
};

export const ChromeMobile: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "mobile usable area 전체의 Chrome이다. desktop frame 입력은 보존하되 닫기 control만 표시하고 content padding을 줄인다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="mobile">
      <ProductWindow active mode="mobile" title="React Server Components 정리" variant="chrome" />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByRole("region", { name: "Chrome 창" });
    const bounds = frame.getBoundingClientRect();
    await expect(bounds.width).toBe(390);
    await expect(bounds.height).toBe(794);
    await expect(within(frame).getAllByRole("button")).toHaveLength(4);
    await expect(within(frame).queryByRole("button", { name: "최소화" })).toBeNull();
    await expect(frame.querySelectorAll(".window-resize-handle")).toHaveLength(0);
  },
};

export const FileExplorerMobile: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "mobile usable area 전체의 File Explorer다. sidebar·최소화·최대화·resize를 제거하고 주소와 full-width content를 유지한다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="mobile">
      <ProductWindow active mode="mobile" title="블로그" variant="file-explorer" />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "파일 탐색기 창" });
    const bounds = frame.getBoundingClientRect();
    await expect(bounds.width).toBe(390);
    await expect(bounds.height).toBe(794);
    await expect(within(frame).getAllByRole("button")).toHaveLength(4);
    await expect(within(frame).queryByRole("button", { name: "최소화" })).toBeNull();
    await expect(within(frame).queryByRole("complementary")).toBeNull();
    await expect(frame.querySelectorAll(".window-resize-handle")).toHaveLength(0);
  },
};

export const PointerGestures: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "실제 browser pointer로 8방향 resize와 Esc rollback, 빈 titlebar doubleclick, maximized drag 복원을 검증한다. navigation과 content는 Application owner인 기존 placeholder를 유지한다.",
      },
    },
  },
  render: () => (
    <WindowStage mode="desktop">
      <InteractiveProductWindow />
    </WindowStage>
  ),
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "Chrome gesture 창" });
    const original = { left: 120, top: 28, width: 720, height: 520 };
    const directions = ["n", "s", "w", "e", "nw", "ne", "sw", "se"] as const;

    for (const direction of directions) {
      const handle = frame.querySelector<HTMLElement>(`[data-direction="${direction}"]`)!;
      const handleBounds = handle.getBoundingClientRect();
      const start = {
        clientX: handleBounds.left + handleBounds.width / 2,
        clientY: handleBounds.top + handleBounds.height / 2,
      };
      await userEvent.pointer({ keys: "[MouseLeft>]", target: handle, coords: start });
      await userEvent.pointer({
        target: handle,
        coords: { clientX: start.clientX + 20, clientY: start.clientY + 10 },
      });
      await waitFor(() => expect(frame.getAttribute("data-gesture-active")).toBe("true"));
      await waitFor(async () => {
        const resized = frame.getBoundingClientRect();
        await expect(
          resized.left !== original.left ||
            resized.top !== original.top ||
            resized.width !== original.width ||
            resized.height !== original.height,
        ).toBe(true);
      });
      await userEvent.keyboard("{Escape}");
      await waitFor(async () => {
        const restored = frame.getBoundingClientRect();
        await expect(restored.left).toBe(original.left);
        await expect(restored.top).toBe(original.top);
        await expect(restored.width).toBe(original.width);
        await expect(restored.height).toBe(original.height);
      });
      await userEvent.pointer({ keys: "[/MouseLeft]", target: handle, coords: start });
    }

    const address = within(frame).getByRole("textbox", { name: "검색어 또는 URL 입력" });
    await userEvent.dblClick(address);
    await expect(frame.getAttribute("data-maximized")).toBe("false");

    const activeTab = within(frame).getByRole("tab", { name: "Chrome 활성 탭" });
    await userEvent.dblClick(activeTab);
    await expect(frame.getAttribute("data-maximized")).toBe("false");

    const dragRegion = frame.querySelector<HTMLElement>("[data-window-drag-region]")!;
    await userEvent.dblClick(dragRegion);
    await waitFor(() => expect(frame.getAttribute("data-maximized")).toBe("true"));

    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 15 },
    });
    await userEvent.pointer({
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
    await waitFor(async () => {
      const restoredForDrag = frame.getBoundingClientRect();
      await expect(restoredForDrag.left).toBe(220);
      await expect(restoredForDrag.top).toBe(10);
      await expect(restoredForDrag.width).toBe(720);
      await expect(restoredForDrag.height).toBe(520);
    });
    await userEvent.keyboard("{Escape}");
    await waitFor(async () => {
      await expect(frame.getAttribute("data-maximized")).toBe("true");
      await expect(frame.getBoundingClientRect().width).toBe(960);
      await expect(frame.getBoundingClientRect().height).toBe(590);
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
  },
};

export const MotionPresenceAndFocus: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "실제 WindowOperations queue와 WAAPI completion을 공유 binding으로 연결한다. 최소화 content·focus를 유지하고 production TaskbarApplicationButton icon의 현재 측정값으로 150ms 최소화와 200ms 복원을 검증한다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("region", { name: "Chrome lifecycle 창" });
    const explorer = canvas.getByRole("region", { name: "파일 탐색기 lifecycle 창" });
    const address = within(chrome).getByRole<HTMLInputElement>("textbox", {
      name: "검색어 또는 URL 입력",
    });
    const scrollContent = chrome.querySelector<HTMLElement>(".window-story-chrome-content");
    const taskbarButton = canvas.getByRole("button", { name: "Chrome 복원" });
    const taskbarIcon = taskbarButton.querySelector<HTMLElement>(
      ".taskbar-application-button__icon",
    );
    await waitFor(() => expect(taskbarIcon?.getBoundingClientRect().width).toBeGreaterThan(0));
    const initialIcon = taskbarIcon!.getBoundingClientRect();
    const initialValue = address.value;
    address.focus();
    if (scrollContent !== null) scrollContent.scrollTop = 48;
    const preservedScrollTop = scrollContent?.scrollTop ?? 0;
    await expect(preservedScrollTop).toBeGreaterThan(0);

    const minimizeStartedAt = performance.now();
    await userEvent.click(within(chrome).getByRole("button", { name: "최소화" }));
    await waitFor(() => expect(chrome.getAttribute("data-presentation-phase")).toBe("window-minimize"));
    const minimizeAnimation = chrome.getAnimations()[0];
    await expect(minimizeAnimation).toBeDefined();
    await expect(minimizeAnimation.effect?.getTiming().duration).toBe(150);
    const minimizeFrames = (minimizeAnimation.effect as KeyframeEffect).getKeyframes();
    await expect(String(minimizeFrames.at(-1)?.transform)).toContain(
      `${Math.round(initialIcon.left - chrome.getBoundingClientRect().left)}`,
    );
    await waitFor(() => expect(chrome.hidden).toBe(true), { timeout: 800 });
    await expect(performance.now() - minimizeStartedAt).toBeGreaterThanOrEqual(100);
    await expect(chrome.hasAttribute("inert")).toBe(true);
    await expect(chrome.getAttribute("aria-hidden")).toBe("true");
    await expect(address.value).toBe(initialValue);
    await expect(scrollContent?.scrollTop).toBe(preservedScrollTop);
    await expect(document.activeElement).toBe(explorer);

    taskbarButton.style.transform = "translateX(-180px)";
    const shiftedIcon = taskbarIcon!.getBoundingClientRect();
    await expect(shiftedIcon.left).not.toBe(initialIcon.left);
    const restoreStartedAt = performance.now();
    await userEvent.click(taskbarButton);
    await waitFor(() => expect(chrome.hidden).toBe(false));
    await waitFor(() => expect(chrome.getAttribute("data-presentation-phase")).toBe("window-restore"));
    const restoreAnimation = chrome
      .getAnimations()
      .find((animation) => animation.effect?.getTiming().duration === 200);
    if (restoreAnimation === undefined) {
      throw new Error("200ms 복원 animation을 찾지 못했습니다.");
    }
    await expect(restoreAnimation.effect?.getTiming().duration).toBe(200);
    const restoreFrames = (restoreAnimation.effect as KeyframeEffect).getKeyframes();
    await expect(String(restoreFrames[0]?.transform)).toContain(
      `${Math.round(shiftedIcon.left - chrome.getBoundingClientRect().left)}`,
    );
    await waitFor(() => expect(chrome.hasAttribute("data-presentation-phase")).toBe(false), {
      timeout: 900,
    });
    await expect(performance.now() - restoreStartedAt).toBeGreaterThanOrEqual(150);
    await expect(document.activeElement).toBe(address);
    await expect(address.value).toBe(initialValue);
    await expect(scrollContent?.scrollTop).toBe(preservedScrollTop);
  },
};

export const MotionPresenceAndFocusVisual: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "자동 캡처가 실제 minimize·restore 중간 frame을 직접 구동할 수 있는 동일 production fixture다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows />
    </div>
  ),
};

export const MotionGestureOverlap: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "진행 중인 실제 bounds WAAPI에 pointer gesture가 들어오면 animation wait만 중단하고 drag bounds를 즉시 반영하며 Esc는 gesture 시작 frame을 복원한다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("region", { name: "Chrome lifecycle 창" });
    await userEvent.click(within(chrome).getByRole("button", { name: "최대화" }));
    await waitFor(() => expect(chrome.getAttribute("data-presentation-phase")).toBe("window-maximize"));
    const boundsAnimation = chrome
      .getAnimations()
      .find((animation) => animation.effect?.getTiming().duration === 150);
    if (boundsAnimation === undefined) {
      throw new Error("진행 중인 150ms bounds animation을 찾지 못했습니다.");
    }
    await expect(boundsAnimation.playState).toBe("running");

    const dragRegion = chrome.querySelector<HTMLElement>("[data-window-drag-region]")!;
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: dragRegion,
      coords: { clientX: 240, clientY: 15 },
    });
    await waitFor(() => expect(boundsAnimation.playState).toBe("idle"));
    await waitFor(() => expect(chrome.hasAttribute("data-presentation-phase")).toBe(false));
    await userEvent.pointer({
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
    await waitFor(async () => {
      const dragged = chrome.getBoundingClientRect();
      await expect(dragged.left).toBe(220);
      await expect(dragged.top).toBe(10);
      await expect(dragged.width).toBe(720);
      await expect(dragged.height).toBe(520);
    });

    await userEvent.keyboard("{Escape}");
    await waitFor(async () => {
      await expect(chrome.getAttribute("data-maximized")).toBe("true");
      await expect(chrome.getBoundingClientRect().width).toBe(960);
      await expect(chrome.getBoundingClientRect().height).toBe(590);
    });
    await userEvent.pointer({
      keys: "[/MouseLeft]",
      target: dragRegion,
      coords: { clientX: 400, clientY: 25 },
    });
  },
};

export const FocusLifecycleEdges: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "숨긴 동안 이전 focus 요소가 사라진 복원 fallback, active close 뒤 다음 visible 창, 마지막 visible close 뒤 focus 상실을 실제 browser에서 검증한다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows focusControls />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const chrome = canvas.getByRole("region", { name: "Chrome lifecycle 창" });
    const explorer = canvas.getByRole("region", { name: "파일 탐색기 lifecycle 창" });
    within(chrome).getByRole("textbox", { name: "검색어 또는 URL 입력" }).focus();
    await userEvent.click(within(chrome).getByRole("button", { name: "최소화" }));
    await waitFor(() => expect(chrome.hidden).toBe(true), { timeout: 800 });
    await userEvent.click(canvas.getByRole("button", { name: "Chrome focus 대상 제거" }));
    await userEvent.click(canvas.getByRole("button", { name: "Chrome 복원" }));
    await waitFor(() => expect(chrome.hidden).toBe(false));
    await waitFor(() => expect(document.activeElement).toBe(chrome));

    await userEvent.click(within(chrome).getByRole("button", { name: "닫기" }));
    await waitFor(() => expect(document.querySelector('[aria-label="Chrome lifecycle 창"]')).toBeNull(), {
      timeout: 800,
    });
    await expect(document.activeElement).toBe(explorer);

    await userEvent.click(within(explorer).getByRole("button", { name: "닫기" }));
    await waitFor(
      () => expect(document.querySelector('[aria-label="파일 탐색기 lifecycle 창"]')).toBeNull(),
      { timeout: 800 },
    );
    await expect(document.activeElement).toBe(document.body);
    await expect(document.activeElement).not.toBe(
      canvas.getByRole("button", { name: "Chrome 복원" }),
    );
  },
};

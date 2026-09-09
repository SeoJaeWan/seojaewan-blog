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
import { expect, within } from "storybook/test";

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
} from "../../../../../headless/index.js";
import type { WindowStoreCommandContext } from "../../../../../headless/windows/index.js";
import chromeIconSrc from "../../../../assets/window/chrome.png";
import fileExplorerIconSrc from "../../../../assets/window/file-explorer.png";
import { TaskbarApplicationButton } from "../../../taskbar/items/index.js";
import {
  createWindowPresentationBinding,
  WindowFrame,
  type WindowFrameBounds,
  type WindowFrameMode,
  type WindowFrameVariant,
  type WindowMotionDestination,
  WindowRoot,
} from "../index.js";

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
      본문 배치와 스크롤을 확인하기 위한 예시입니다. 실제 콘텐츠는 각 앱에서 표시합니다.
      긴 글을 읽다가 창을 최소화해 보세요. 다시 열었을 때 읽던 위치가 유지되는지 확인할 수 있습니다.
      주소창에 입력한 내용도 함께 남아 있어 이어서 작업할 수 있습니다.
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
  const fileExplorerTaskbarButtonRef = useRef<HTMLButtonElement | null>(null);
  const chromeTaskbarButtonRef = useRef<HTMLButtonElement | null>(null);
  const [fileExplorerDestination, setFileExplorerDestination] =
    useState<WindowMotionDestination | null>(null);
  const [chromeDestination, setChromeDestination] = useState<WindowMotionDestination | null>(null);
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
    setFileExplorerDestination(measureApplicationIcon(fileExplorerTaskbarButtonRef.current));
    setChromeDestination(measureApplicationIcon(chromeTaskbarButtonRef.current));
  }, []);

  /** 이동될 수 있는 File Explorer icon을 activation 직전에 다시 측정하고 restore Action을 실행한다. */
  const restoreFileExplorer = () => {
    setFileExplorerDestination(measureApplicationIcon(fileExplorerTaskbarButtonRef.current));
    runtime.windows.execute({ type: "activate", sessionId: fileExplorerId });
  };

  /** 이동될 수 있는 Chrome icon을 activation 직전에 다시 측정하고 restore Action을 실행한다. */
  const restoreChrome = () => {
    setChromeDestination(measureApplicationIcon(chromeTaskbarButtonRef.current));
    runtime.windows.execute({ type: "activate", sessionId: chromeId });
  };

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <WindowRoot
        aria-label="파일 탐색기 동작 확인 창"
        minimizeDestination={fileExplorerDestination}
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
        aria-label="Chrome 동작 확인 창"
        minimizeDestination={chromeDestination}
        placementConfig={WINDOW_PLACEMENT_CONFIG}
        presentationBinding={presentationBinding}
        sessionId={chromeId}
        titleBarContent={<ProductTab icon={chromeIconSrc} title="애니메이션 확인" variant="chrome" />}
      >
        {showChromeNavigation ? <ProductNavigation mode="desktop" variant="chrome" /> : null}
        <ChromeContent mode="desktop" />
      </WindowRoot>
      <div className="window-story-taskbar">
        {focusControls ? (
          <button
            aria-label="Chrome 주소창 제거"
            onClick={() => setShowChromeNavigation(false)}
            type="button"
          >
            주소창 제거
          </button>
        ) : null}
        <TaskbarApplicationButton
          application={{
            applicationId: "file-explorer",
            label: "파일 탐색기 복원",
            active: false,
            running: true,
          }}
          onAction={restoreFileExplorer}
          ref={fileExplorerTaskbarButtonRef}
        />
        <TaskbarApplicationButton
          application={{ applicationId: "chrome", label: "Chrome 복원", active: false, running: true }}
          onAction={restoreChrome}
          ref={chromeTaskbarButtonRef}
        />
      </div>
    </HeadlessRuntimeProvider>
  );
};

/** controller 구독으로 bounds가 실제 갱신되는 Common Window interaction fixture를 렌더링한다. */
const InteractiveProductWindow = () => {
  const id = storySessionId("chrome");
  const taskbarButtonRef = useRef<HTMLButtonElement | null>(null);
  const [destination, setDestination] = useState<WindowMotionDestination | null>(null);
  const presentationBinding = useMemo(() => createWindowPresentationBinding(), []);
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
  const runtime = useMemo(
    () => createLifecycleWindowRuntime(initialSnapshot, presentationBinding),
    [initialSnapshot, presentationBinding],
  );

  useLayoutEffect(() => {
    setDestination(measureApplicationIcon(taskbarButtonRef.current));
  }, []);

  const restoreChrome = () => {
    setDestination(measureApplicationIcon(taskbarButtonRef.current));
    runtime.windows.execute({ type: "activate", sessionId: id });
  };

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <WindowRoot
        aria-label="Chrome 이동·크기 조절 창"
        minimizeDestination={destination}
        placementConfig={WINDOW_PLACEMENT_CONFIG}
        presentationBinding={presentationBinding}
        sessionId={id}
        titleBarContent={<InteractiveProductTab />}
      >
        <ProductNavigation mode="desktop" variant="chrome" />
        <ChromeContent mode="desktop" />
      </WindowRoot>
      <div className="window-story-taskbar">
        <TaskbarApplicationButton
          application={{ applicationId: "chrome", label: "Chrome 복원", active: false, running: true }}
          onAction={restoreChrome}
          ref={taskbarButtonRef}
        />
      </div>
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
          "파일 탐색기와 Chrome이 함께 사용하는 창입니다. 이동·크기 조절·최소화·최대화·닫기와 포커스 동작을 확인할 수 있습니다. 주소창과 본문은 배치를 확인하기 위한 예시이며, 탐색이나 실제 콘텐츠 표시는 각 앱에서 연결합니다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof WindowFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FileExplorerDesktop: Story = {
  name: "파일 탐색기 · 기본 창",
  parameters: {
    docs: {
      description: {
        story:
          "활성 상태의 파일 탐색기 창입니다. 창 테두리와 제목 표시줄, 창 조작 버튼을 확인합니다. 주소창·검색창·사이드바·본문은 배치를 확인하기 위한 예시 화면입니다.",
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
  name: "Chrome · 비활성 상태와 긴 제목",
  parameters: {
    docs: {
      description: {
        story:
          "비활성 상태의 Chrome 창입니다. 긴 제목과 스크롤 영역이 있을 때 창 테두리와 제목 표시줄이 어떻게 보이는지 확인합니다. 주소창과 본문은 예시 화면입니다.",
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
  name: "Chrome · 기본 창",
  parameters: {
    docs: {
      description: {
        story:
          "활성 상태의 Chrome 창입니다. 같은 화면 크기에서 기존 화면과 창 테두리·제목 표시줄·버튼·본문 영역의 배치를 비교합니다.",
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
  name: "파일 탐색기 · 최대화",
  parameters: {
    docs: {
      description: {
        story:
          "작업 표시줄을 제외한 화면을 채운 파일 탐색기 창입니다. 이전 크기로 복원하는 버튼과 창 가장자리의 크기 조절 표시를 확인합니다.",
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
  name: "Chrome · 모바일",
  parameters: {
    docs: {
      description: {
        story:
          "모바일 화면을 채운 Chrome 창입니다. 닫기 버튼만 표시하고 본문 여백을 줄입니다. 데스크톱으로 돌아가면 이전 창 크기를 유지합니다.",
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
  name: "파일 탐색기 · 모바일",
  parameters: {
    docs: {
      description: {
        story:
          "모바일 화면을 채운 파일 탐색기 창입니다. 사이드바와 크기 조절 버튼 없이 주소창과 본문을 화면 너비에 맞춰 보여 줍니다.",
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
  name: "창 이동과 크기 조절",
  parameters: {
    docs: {
      description: {
        story:
          "창 가장자리와 모서리를 직접 끌어 크기를 바꿔 보세요. Esc를 누르면 조작 전 상태로 돌아갑니다. 빈 제목 표시줄을 두 번 누르면 최대화되고, 최대화된 창도 제목 표시줄을 끌어 이동할 수 있습니다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <InteractiveProductWindow />
    </div>
  ),
};

export const MotionPresenceAndFocus: Story = {
  name: "최소화·복원과 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "Chrome 창의 최소화 버튼과 작업 표시줄 아이콘을 직접 눌러 보세요. 입력 내용과 읽던 위치가 복원 뒤에도 유지되고 포커스가 주소창으로 돌아옵니다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows />
    </div>
  ),
};

export const MotionPresenceAndFocusVisual: Story = {
  name: "최소화·복원 직접 해 보기",
  parameters: {
    docs: {
      description: {
        story:
          "최소화 버튼을 누른 뒤 작업 표시줄의 Chrome 아이콘을 눌러 복원해 보세요. 창이 줄어들고 펼쳐지는 모습과 입력 내용·스크롤 위치가 유지되는지 확인할 수 있습니다.",
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
  name: "애니메이션 도중 창 이동",
  parameters: {
    docs: {
      description: {
        story:
          "최대화 버튼을 누른 직후 제목 표시줄을 끌어 보세요. 창이 바로 마우스를 따라오며 Esc를 누르면 끌기 시작 전 상태로 돌아갑니다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows />
    </div>
  ),
};

export const FocusLifecycleEdges: Story = {
  name: "창을 닫거나 복원한 뒤 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "창을 최소화한 뒤 주소창을 제거하고 복원해 보세요. 돌아갈 입력 요소가 없으면 창 자체에 포커스를 둡니다. 창을 닫을 때는 남은 창 중 가장 앞의 창으로 포커스가 이동합니다.",
      },
    },
  },
  render: () => (
    <div className="window-story-stage" data-mode="desktop">
      <LifecycleProductWindows focusControls />
    </div>
  ),
};

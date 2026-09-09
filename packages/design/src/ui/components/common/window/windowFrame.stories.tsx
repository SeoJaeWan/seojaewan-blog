import type { ReactNode } from "react";

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
  type WindowAction,
  type WindowSessionId,
  type WindowState,
} from "../../../../headless/index.js";
import chromeIconSrc from "../../../assets/window/chrome.png";
import fileExplorerIconSrc from "../../../assets/window/file-explorer.png";
import {
  WindowFrame,
  type WindowFrameBounds,
  type WindowFrameMode,
  type WindowFrameVariant,
  WindowRoot,
} from "./index.js";

import "./windowFrame.stories.css";

const DESKTOP_BOUNDS: WindowFrameBounds = Object.freeze({
  height: 500,
  left: 48,
  top: 36,
  width: 840,
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

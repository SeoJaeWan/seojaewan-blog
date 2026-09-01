import { useState } from "react";

import { Document20Regular, Folder20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import {
  FolderCategoryItemUI,
  FolderFileCardUI,
  FolderFileGridUI,
  FolderSidebarUI,
  FolderViewerUI,
} from "../folder";
import {
  FileWindowUI,
  RouteInputUI,
  TagInputUI,
  WindowControlsUI,
  WindowFrameUI,
  type WindowFrameUIProps,
  WindowRouteBarUI,
  WindowTabUI,
  WindowTitleBarUI,
} from "./index";

import "./windowFrameUI.stories.css";

const routeOptions = [
  { label: "Projects", value: "projects" },
  { label: "Documents", value: "documents" },
  { disabled: true, label: "Archive", value: "archive" },
] as const;

const tagOptions = [
  { label: "Design system", value: "design" },
  { label: "Writing", value: "writing" },
  { disabled: true, label: "Archived", value: "archived" },
] as const;

const standardBounds = {
  blockSize: 360,
  inlineSize: 640,
  insetBlockStart: 32,
  insetInlineStart: 32,
};

const wideBounds = {
  blockSize: 480,
  inlineSize: 840,
  insetBlockStart: 32,
  insetInlineStart: 32,
};

interface WindowProductFixtureProps extends WindowFrameUIProps {
  wide?: boolean;
}

const WindowProductFixture = ({ wide = false, ...props }: WindowProductFixtureProps) => {
  const [lastGesture, setLastGesture] = useState("none");
  const [lastControl, setLastControl] = useState("none");
  const [lastHistory, setLastHistory] = useState("none");
  const [route, setRoute] = useState<string | null>("projects");
  const [tag, setTag] = useState<string | null>("design");

  return (
    <div
      className="wd-window-story-stage"
      data-testid="window-containing-block"
      data-wide={wide ? "true" : "false"}
    >
      <WindowFrameUI
        aria-label="프로젝트 탐색기 창"
        bounds={wide ? wideBounds : standardBounds}
        draggable
        onMoveCommit={(event) =>
          setLastGesture(`move:${event.bounds.insetInlineStart},${event.bounds.insetBlockStart}`)
        }
        onResizeCommit={(event) =>
          setLastGesture(
            `resize:${event.direction}:${event.bounds.inlineSize}x${event.bounds.blockSize}`,
          )
        }
        resizable
        routeBar={
          <WindowRouteBarUI
            aria-label="프로젝트 경로"
            forwardDisabled
            onNavigate={(event) => setLastHistory(event.direction)}
            tagInput={
              <TagInputUI
                label="태그 필터"
                onValueChange={(event) => {
                  setTag(event.value);
                  setLastHistory(`tag:${event.value ?? "none"}`);
                }}
                options={tagOptions}
                value={tag}
              />
            }
          >
            <RouteInputUI
              defaultInputValue="Projects"
              label="현재 경로"
              onValueChange={(event) => {
                setRoute(event.value);
                setLastHistory(`route:${event.value ?? "none"}`);
              }}
              options={routeOptions}
              value={route}
            />
          </WindowRouteBarUI>
        }
        titleBar={
          <WindowTitleBarUI
            controls={
              <WindowControlsUI
                fullscreen={props.fullscreen}
                onControl={(event) => setLastControl(event.control)}
              />
            }
          >
            <WindowTabUI
              icon={<Folder20Regular aria-hidden="true" />}
              titleContent="Projects — Window design system"
            />
          </WindowTitleBarUI>
        }
        {...props}
      >
        <FolderViewerUI
          aria-label="프로젝트 폴더 보기"
          sidebar={
            <FolderSidebarUI aria-label="프로젝트 분류">
              <FolderCategoryItemUI icon={<Folder20Regular />} label="Desktop" />
              <FolderCategoryItemUI icon={<Folder20Regular />} label="Documents" />
              <FolderCategoryItemUI icon={<Folder20Regular />} label="Projects" selected />
            </FolderSidebarUI>
          }
          sidebarLabel="프로젝트 사이드바"
        >
          <FolderFileGridUI aria-label="프로젝트 파일" cardSize="small">
            {["Window roles.md", "Primitive map.md", "Visual parity.md"].map((title) => (
              <FolderFileCardUI
                cover={<Document20Regular aria-hidden="true" />}
                key={title}
                onClick={() => setLastHistory(`file:${title}`)}
                title={title}
              />
            ))}
          </FolderFileGridUI>
        </FolderViewerUI>
        <div className="wd-window-story-probes">
          <output aria-label="마지막 창 제어">{lastControl}</output>
          <output aria-label="마지막 경로 동작">{lastHistory}</output>
          <output aria-label="마지막 창 gesture">{lastGesture}</output>
        </div>
      </WindowFrameUI>
    </div>
  );
};

const FileWindowFixture = ({
  compact = false,
  loading = false,
}: {
  compact?: boolean;
  loading?: boolean;
}) => {
  const [lastGesture, setLastGesture] = useState("none");

  return (
    <div className="wd-window-story-file-stage">
      <div className="wd-window-story-stage" data-testid="file-window-containing-block">
        <FileWindowUI
          aria-label="React 문서 창"
          bounds={compact ? { ...standardBounds, inlineSize: 480 } : standardBounds}
          draggable
          onMoveCommit={(event) =>
            setLastGesture(`move:${event.bounds.insetInlineStart},${event.bounds.insetBlockStart}`)
          }
          onResizeCommit={(event) =>
            setLastGesture(
              `resize:${event.direction}:${event.bounds.inlineSize}x${event.bounds.blockSize}`,
            )
          }
          resizable
          routeBarProps={{ "aria-label": "문서 경로", backDisabled: false, forwardDisabled: true }}
          routeInputProps={{
            defaultInputValue: "React Server Components 정리",
            label: "현재 문서 경로",
            options: routeOptions,
          }}
          title="React Server Components 정리"
          viewportProps={{ "aria-label": "파일 본문", loading }}
        >
          <article className="wd-window-story-file-content">
            <h1>React Server Components 정리</h1>
            {Array.from({ length: 12 }, (_, index) => (
              <p key={index}>
                서버에서 렌더링한 컴포넌트 결과와 브라우저 상호작용 경계를 분리하면 전송량과 초기
                실행 비용을 함께 줄일 수 있습니다. 이 문장은 FileViewport의 스크롤과 텍스트 선택
                계약을 검증하기 위한 결정적 fixture입니다.
              </p>
            ))}
          </article>
        </FileWindowUI>
      </div>
      <output aria-label="마지막 File Window gesture">{lastGesture}</output>
    </div>
  );
};

const meta = {
  title: "UI/Components/Window",
  component: WindowFrameUI,
  subcomponents: {
    Controls: WindowControlsUI,
    FileWindow: FileWindowUI,
    RouteBar: WindowRouteBarUI,
    RouteInput: RouteInputUI,
    Tab: WindowTabUI,
    TagInput: TagInputUI,
    TitleBar: WindowTitleBarUI,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "### 무엇을 제공하나요?\nWindow family는 Folder/File 공용 Frame, TitleBar, Tab, Controls, RouteBar와 UI-local pointer move/resize를 제공합니다. FileWindow는 warm chrome과 FileViewport loading·scroll·selection을 완성합니다.\n\n### 제품에서는 어디에 쓰나요?\n`Product Reference — Folder Window`와 `Product Reference — File Window`는 현재 제품의 두 결과를 구분해 보여 줍니다. IconButtonUI는 창·history action을, ComboboxUI는 route 후보 검색을, SelectUI는 Folder tag 선택을 담당합니다.\n\n### 책임 범위\n이 family는 pointer capture 중 transient bounds를 계산하고 완료 geometry를 presentation callback으로 보고합니다. Session identity, stacking, persistence, route policy와 실제 Content/Notion renderer는 headless 또는 Application이 소유합니다.",
      },
    },
    layout: "centered",
  },
} satisfies Meta<typeof WindowFrameUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const getFrame = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("region", { name: "프로젝트 탐색기 창" });

const toBrowserPoint = (element: HTMLElement, point: { x: number; y: number }) => {
  let currentDocument = element.ownerDocument;
  let frameElement = currentDocument.defaultView?.frameElement;
  let { x, y } = point;

  while (frameElement !== null && frameElement !== undefined) {
    const frameRect = frameElement.getBoundingClientRect();
    x += frameRect.left;
    y += frameRect.top;
    currentDocument = frameElement.ownerDocument;
    frameElement = currentDocument.defaultView?.frameElement;
  }

  return { x, y };
};

const expectBaseGeometry = async (canvasElement: HTMLElement) => {
  const frame = getFrame(canvasElement);
  const style = getComputedStyle(frame);

  await expect(style.width).toBe("640px");
  await expect(style.height).toBe("360px");
  await expect(
    getComputedStyle(within(frame).getByText("Projects — Window design system").closest("header")!)
      .height,
  ).toBe("30px");

  for (const name of ["최소화", "최대화", "닫기"]) {
    const control = within(frame).getByRole("button", { name });
    await expect(getComputedStyle(control).width).toBe("30px");
    await expect(getComputedStyle(control).height).toBe("30px");
  }

  await expect(getComputedStyle(frame.querySelector(".wd-tag-input-ui")!).width).toBe("160px");
};

export const Active: Story = {
  name: "Contract — active Window",
  render: () => <WindowProductFixture activity="active" />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);

    await expect(frame).toHaveAttribute("data-activity", "active");
    await expect(frame).toHaveAttribute("data-motion", "idle");
    await expectBaseGeometry(canvasElement);
  },
};

export const Background: Story = {
  name: "Contract — background Window",
  render: () => <WindowProductFixture activity="background" />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);

    await expect(frame).toHaveAttribute("data-activity", "background");
    await expectBaseGeometry(canvasElement);
  },
};

export const Fullscreen: Story = {
  name: "Contract — fullscreen Window",
  render: () => <WindowProductFixture fullscreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = getFrame(canvasElement);
    const containingBlock = canvas.getByTestId("window-containing-block");

    await expect(frame).toHaveAttribute("data-fullscreen", "true");
    await expect(getComputedStyle(frame).width).toBe(getComputedStyle(containingBlock).width);
    await expect(getComputedStyle(frame).height).toBe(getComputedStyle(containingBlock).height);
    await expect(within(frame).getByRole("button", { name: "이전 크기로 복원" })).toBeVisible();
    await expect(frame.querySelector(".wd-window-resize-handles-ui")).not.toBeVisible();
  },
};

export const Dragging: Story = {
  name: "Contract — dragging Window",
  render: () => <WindowProductFixture dragging />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);

    await expect(frame).toHaveAttribute("data-dragging", "true");
    await expect(getComputedStyle(frame).transitionDuration).toBe("0s");
    await expectBaseGeometry(canvasElement);
  },
};

export const PointerMove: Story = {
  name: "Contract — pointer capture move commit",
  render: () => <WindowProductFixture />,
  play: async ({ canvasElement }) => {
    const { cdp } = await import("vitest/browser");
    const session = cdp();
    const frame = getFrame(canvasElement);
    const canvas = within(frame);
    const titlebar = canvas.getByText("Projects — Window design system").closest("header")!;
    let capturedDuringMove = false;
    let pointerId = -1;
    titlebar.addEventListener(
      "pointerdown",
      (event) => {
        pointerId = event.pointerId;
      },
      { once: true },
    );
    titlebar.addEventListener("pointermove", (event) => {
      capturedDuringMove = titlebar.hasPointerCapture(event.pointerId);
    });
    const titleRect = titlebar.getBoundingClientRect();
    const titleStart = toBrowserPoint(titlebar, {
      x: titleRect.left + 80,
      y: titleRect.top + 15,
    });
    await session.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      ...titleStart,
    });
    await session.send("Input.dispatchMouseEvent", {
      button: "left",
      clickCount: 1,
      type: "mousePressed",
      ...titleStart,
    });
    await waitFor(() => expect(titlebar.hasPointerCapture(pointerId)).toBe(true));
    await session.send("Input.dispatchMouseEvent", {
      button: "left",
      buttons: 1,
      type: "mouseMoved",
      x: titleStart.x + 32,
      y: titleStart.y + 24,
    });
    await session.send("Input.dispatchMouseEvent", {
      button: "left",
      clickCount: 1,
      type: "mouseReleased",
      x: titleStart.x + 32,
      y: titleStart.y + 24,
    });
    await expect(pointerId).toBeGreaterThanOrEqual(0);
    await expect(capturedDuringMove).toBe(true);
    await expect(titlebar.hasPointerCapture(pointerId)).toBe(false);
    await expect(frame).toHaveAttribute("data-gesture", "none");
    await expect(canvas.getByRole("status", { name: "마지막 창 gesture" })).toHaveTextContent(
      /^move:/,
    );
    await expect(
      Number.parseFloat(frame.style.getPropertyValue("--wd-window-frame-inset-inline-start")),
    ).toBeGreaterThan(32);
    await expect(
      Number.parseFloat(frame.style.getPropertyValue("--wd-window-frame-inset-block-start")),
    ).toBeGreaterThan(32);
  },
};

export const PointerResize: Story = {
  name: "Contract — pointer capture resize direction and commit",
  render: () => (
    <WindowProductFixture
      bounds={{
        ...standardBounds,
        blockSize: 200,
        insetBlockStart: 72,
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const { userEvent: browserUserEvent } = await import("vitest/browser");
    const frame = getFrame(canvasElement);
    const stage = within(canvasElement).getByTestId("window-containing-block");
    const south = frame.querySelector<HTMLElement>('[data-direction="s"]')!;
    await expect(getComputedStyle(south.parentElement!).display).toBe("block");
    await waitFor(() => expect(frame.getBoundingClientRect().height).toBe(200));
    let pointerId = -1;
    let capturedDuringMove = false;
    south.addEventListener(
      "pointerdown",
      (event) => {
        pointerId = event.pointerId;
      },
      { once: true },
    );
    south.addEventListener("pointermove", (event) => {
      capturedDuringMove = south.hasPointerCapture(event.pointerId);
    });
    await browserUserEvent.dragAndDrop(south, stage, {
      sourcePosition: { x: 80, y: 2 },
      targetPosition: { x: 112, y: 300 },
    });
    await expect(pointerId).toBeGreaterThanOrEqual(0);
    await expect(capturedDuringMove).toBe(true);
    await expect(south.hasPointerCapture(pointerId)).toBe(false);
    await expect(
      within(frame).getByRole("status", { name: "마지막 창 gesture" }),
    ).toHaveTextContent(/^resize:s:/);
    await expect(
      Number.parseFloat(frame.style.getPropertyValue("--wd-window-frame-inline-size")),
    ).toBe(640);
    await expect(
      Number.parseFloat(frame.style.getPropertyValue("--wd-window-frame-block-size")),
    ).toBeGreaterThan(200);
  },
};

const motionStory = (
  motion: "entering" | "exiting" | "minimizing" | "restoring",
  animationName: string,
  animationDuration: string,
): Story => ({
  render: () => <WindowProductFixture motion={motion} />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);
    const style = getComputedStyle(frame);

    await expect(frame).toHaveAttribute("data-motion", motion);
    await expect(style.animationName).toBe(animationName);
    await expect(style.animationDuration).toBe(animationDuration);
    await expect(style.width).toBe("640px");
    await expect(style.height).toBe("360px");

    frame.dispatchEvent(new AnimationEvent("animationend", { animationName }));
    await expect(frame).toHaveAttribute("data-motion", motion);
  },
});

export const Entering: Story = {
  ...motionStory("entering", "wd-window-frame-enter", "0.2s"),
  name: "Contract — entering motion",
};

export const Exiting: Story = {
  ...motionStory("exiting", "wd-window-frame-exit", "0.15s"),
  name: "Contract — exiting motion",
};

export const Minimizing: Story = {
  ...motionStory("minimizing", "wd-window-frame-minimize", "0.15s"),
  name: "Contract — minimizing motion",
};

export const Restoring: Story = {
  ...motionStory("restoring", "wd-window-frame-restore", "0.2s"),
  name: "Contract — restoring motion",
};

export const ReducedMotion: Story = {
  name: "Contract — reduced motion semantic equivalence",
  render: () => <WindowProductFixture motion="entering" />,
  play: async ({ canvasElement }) => {
    const { cdp } = await import("vitest/browser");
    const session = cdp();
    const frame = getFrame(canvasElement);

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      await expect(getComputedStyle(frame).animationDuration).toBe("0s");
      await expect(getComputedStyle(frame).transitionDuration).toBe("0s");
      await expect(frame).toHaveAttribute("data-motion", "entering");
      await userEvent.click(within(frame).getByRole("button", { name: "닫기" }));
      await expect(within(frame).getByRole("status", { name: "마지막 창 제어" })).toHaveTextContent(
        "close",
      );
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  },
};

export const FolderWindowProductReference: Story = {
  name: "Product Reference — Folder Window",
  parameters: {
    docs: {
      description: {
        story:
          "Windows 탐색기형 Folder Window 안에서 모든 Window role, FolderViewer·Sidebar·Category·FileGrid·FileCard와 지정된 Primitive 소비를 함께 보여 줍니다. wide container에서 TagInputUI가 320px로 넓어지고, 경로·tag·file 선택 결과는 아래 probe에 남습니다.",
      },
    },
  },
  render: () => <WindowProductFixture wide />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const frame = getFrame(canvasElement);
    const canvas = within(frame);
    const titlebar = canvas.getByText("Projects — Window design system").closest("header")!;
    const tabIcon = titlebar.querySelector(".wd-window-tab-ui__icon")!;
    const tab = titlebar.querySelector(".wd-window-tab-ui")!;
    const routebar = canvas.getByRole("navigation", { name: "프로젝트 경로" });
    const back = canvas.getByRole("button", { name: "뒤로" });
    const routeInput = body.getByRole("combobox", { name: "현재 경로" });
    const tagInput = body.getByRole("combobox", { name: "태그 필터" });
    const tagRoot = tagInput.closest(".wd-tag-input-ui")!;
    const northEdge = frame.querySelector('[data-direction="n"]')!;
    const southeastCorner = frame.querySelector('[data-direction="se"]')!;

    await expect(getComputedStyle(titlebar).height).toBe("30px");
    await expect(getComputedStyle(tabIcon).width).toBe("18px");
    await expect(getComputedStyle(tab).minWidth).toBe("200px");
    await expect(getComputedStyle(tab).maxWidth).toBe("50%");
    await expect(tab.getBoundingClientRect().width).toBeGreaterThanOrEqual(200);
    await expect(tab.getBoundingClientRect().width).toBeLessThanOrEqual(
      titlebar.getBoundingClientRect().width / 2,
    );
    await expect(getComputedStyle(routebar).height).toBe("36px");
    await expect(getComputedStyle(back.querySelector("svg")!).width).toBe("20px");
    await expect(getComputedStyle(routeInput).fontSize).toBe("12px");
    await expect(getComputedStyle(tagRoot).width).toBe("320px");
    await expect(getComputedStyle(northEdge).height).toBe("4px");
    await expect(getComputedStyle(southeastCorner).width).toBe("8px");
    await expect(getComputedStyle(southeastCorner).height).toBe("8px");
    await expect(canvas.getByRole("navigation", { name: "프로젝트 분류" })).toBeVisible();
    await expect(canvas.getByRole("group", { name: "프로젝트 파일" })).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /\.md$/ })).toHaveLength(3);

    await userEvent.clear(routeInput);
    await userEvent.type(routeInput, "Doc");
    await userEvent.click(await body.findByRole("option", { name: "Documents" }));
    await expect(canvas.getByRole("status", { name: "마지막 경로 동작" })).toHaveTextContent(
      "route:documents",
    );

    await userEvent.click(tagInput);
    await waitFor(() => expect(body.getByRole("option", { name: "Writing" })).toBeVisible());
    await userEvent.click(body.getByRole("option", { name: "Writing" }));
    await expect(canvas.getByRole("status", { name: "마지막 경로 동작" })).toHaveTextContent(
      "tag:writing",
    );
  },
};

export const FileWindowLoading: Story = {
  name: "Contract — File Window loading",
  render: () => <FileWindowFixture loading />,
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "React 문서 창" });
    const viewport = within(frame).getByLabelText("파일 본문");
    const loading = within(viewport).getByRole("status", { name: "파일 불러오는 중" });

    await expect(frame).toHaveAttribute("data-variant", "file");
    await expect(viewport).toHaveAttribute("aria-busy", "true");
    await expect(loading).toBeVisible();
    await expect(getComputedStyle(loading.querySelector("svg")!).width).toBe("32px");
    await expect(within(viewport).queryByRole("article")).toBeNull();
  },
};

export const FileWindowProductReference: Story = {
  name: "Product Reference — File Window",
  parameters: {
    docs: {
      description: {
        story:
          "Existing File Window의 warm chrome, pill route field와 Application content slot을 보여 줍니다. FileViewport가 loading 대체 visual, full-height vertical scroll과 text selection을 소유하고 실제 Content/Notion renderer는 주입하지 않습니다.",
      },
    },
  },
  render: () => <FileWindowFixture />,
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "React 문서 창" });
    const viewport = within(frame).getByLabelText("파일 본문");
    const titlebar = frame.querySelector<HTMLElement>(".wd-window-title-bar-ui")!;
    const route = within(frame).getByRole("combobox", { name: "현재 문서 경로" });
    const firstParagraph = within(viewport).getAllByText(/서버에서 렌더링한 컴포넌트/)[0];

    await expect(frame).toHaveAttribute("data-variant", "file");
    await expect(getComputedStyle(titlebar).backgroundColor).toBe("rgba(247, 221, 208, 0.9)");
    await expect(route.closest(".wd-route-input-ui")).toHaveAttribute("data-shape", "pill");
    await expect(viewport).toHaveAttribute("aria-busy", "false");
    await expect(getComputedStyle(viewport).userSelect).toBe("text");
    await expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    viewport.scrollTop = 160;
    viewport.dispatchEvent(new Event("scroll"));
    await expect(viewport.scrollTop).toBe(160);

    const selection = canvasElement.ownerDocument.defaultView!.getSelection()!;
    const range = canvasElement.ownerDocument.createRange();
    range.selectNodeContents(firstParagraph);
    selection.removeAllRanges();
    selection.addRange(range);
    await expect(selection.toString()).toContain("서버에서 렌더링한 컴포넌트");
    selection.removeAllRanges();
  },
};

export const MobileWindowControls: Story = {
  name: "Contract — mobile chrome reduction",
  render: () => <FileWindowFixture compact />,
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByRole("region", { name: "React 문서 창" });
    await waitFor(() =>
      expect(getComputedStyle(frame.querySelector(".wd-window-resize-handles-ui")!).display).toBe(
        "none",
      ),
    );
    await expect(
      getComputedStyle(frame.querySelector<HTMLElement>('[data-control="minimize"]')!).display,
    ).toBe("none");
    await expect(
      getComputedStyle(frame.querySelector<HTMLElement>('[data-control="maximize"]')!).display,
    ).toBe("none");
    await expect(within(frame).getByRole("button", { name: "닫기" })).toBeVisible();
  },
};

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
  RouteInputUI,
  TagInputUI,
  WindowControlsUI,
  WindowFrameUI,
  type WindowFrameUIProps,
  WindowRouteBarUI,
  WindowTabUI,
  WindowTitleBarUI,
} from "./index";

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
        </div>
      </WindowFrameUI>
    </div>
  );
};

const meta = {
  title: "UI/Components/Window",
  component: WindowFrameUI,
  subcomponents: {
    Controls: WindowControlsUI,
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
          "### 무엇을 제공하나요?\nWindow family는 Frame, TitleBar, Tab, Controls, RouteBar, RouteInput과 TagInput을 실제 Component로 조합합니다. family-local resize handles도 Frame 안에서 pointer hit area를 제공합니다.\n\n### 제품에서는 어디에 쓰나요?\n`Product Reference — Folder Window`는 현재 제품에 있는 (`Existing reference`) Windows 탐색기형 Folder Window를 작은 결정적 fixture로 재현합니다. IconButtonUI는 창·history icon action을, ComboboxUI는 경로 후보 검색을, SelectUI는 태그 단일 선택을 담당합니다.\n\n### 책임 범위\n이 family는 chrome, geometry, visual state와 ID-free presentation event만 소유합니다. Session identity, route 실행, tag filtering, drag/resize lifecycle, stacking, persistence와 transition commit은 Shell 또는 사용하는 제품 기능이 소유합니다.",
      },
    },
    layout: "centered",
  },
} satisfies Meta<typeof WindowFrameUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const getFrame = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("region", { name: "프로젝트 탐색기 창" });

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

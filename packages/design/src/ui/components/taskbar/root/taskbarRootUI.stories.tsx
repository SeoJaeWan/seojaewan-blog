import { useMemo, useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import type {
  ControllerViewModel,
  HeadlessFeatureRuntime,
  HeadlessRuntime,
  TaskbarRootAction,
  WindowMode,
  WindowState,
} from "../../../../headless/index.js";
import { HeadlessRuntimeProvider } from "../../../../headless/index.js";
import { TaskbarRootUI } from "./taskbarRootUI.js";

/** Story가 지정한 공통 mode 또는 준비 전 상태를 제공하는 최소 Window runtime을 만든다. */
const createStoryRuntime = (
  mode?: WindowMode,
  executeRootAction: (action: TaskbarRootAction) => void = () => undefined,
): HeadlessRuntime => {
  const viewModel: ControllerViewModel<WindowState> =
    mode === undefined
      ? Object.freeze({ status: "not-ready", snapshot: null })
      : Object.freeze({
          status: "ready",
          snapshot: Object.freeze({
            mode,
            workArea: Object.freeze({ x: 0, y: 0, width: 1440, height: 850 }),
            sessions: Object.freeze([]),
            stackingOrder: Object.freeze([]),
            activeSessionId: null,
          }),
        });
  const windows = Object.freeze({
    getSnapshot: () => viewModel,
    getServerSnapshot: () => Object.freeze({ status: "not-ready", snapshot: null }),
    subscribe: () => () => undefined,
    execute: () => {
      throw new Error("Root Story는 Window Action을 실행하지 않습니다");
    },
  }) as unknown as HeadlessFeatureRuntime<WindowState, unknown, unknown>;

  return Object.freeze({
    taskbarRoot: Object.freeze({ execute: executeRootAction }),
    windows,
  }) as unknown as HeadlessRuntime;
};

/** production Root를 실제 provider 안에서 렌더링한다. */
const RootStory = ({
  mode,
  windowsDisabled = false,
  windowsSelected = false,
}: {
  mode?: WindowMode;
  windowsDisabled?: boolean;
  windowsSelected?: boolean;
}) => {
  const [requestCount, setRequestCount] = useState(0);
  const runtime = useMemo(
    () => createStoryRuntime(mode, () => setRequestCount((current) => current + 1)),
    [mode],
  );

  return (
    <HeadlessRuntimeProvider runtime={runtime}>
      <TaskbarRootUI
        windowsDisabled={windowsDisabled}
        windowsSelected={windowsSelected}
      />
      <output aria-label="Windows Action 횟수">{requestCount}</output>
    </HeadlessRuntimeProvider>
  );
};

/** 실제 browser에서 Root 높이·viewport 폭·좁은 폭 overflow를 확인한다. */
const verifyRootGeometry = async (canvasElement: HTMLElement, mode: WindowMode) => {
  const taskbar = within(canvasElement).getByRole("navigation", { name: "작업 표시줄" });
  const bounds = taskbar.getBoundingClientRect();

  await expect(taskbar.getAttribute("data-mode")).toBe(mode);
  await expect(bounds.height).toBe(50);
  await expect(bounds.left).toBe(0);
  await expect(bounds.right).toBe(window.innerWidth);
  await expect(document.documentElement.scrollWidth).toBe(document.documentElement.clientWidth);
};

const meta = {
  title: "Design/Components/Taskbar/Root",
  component: TaskbarRootUI,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "공통 WindowState.mode를 소비하는 화면 하단 Taskbar 제품 Root다. " +
          "glass surface와 desktop Windows Action 연결을 제공한다. " +
          "Search, 실제 실행 항목과 Timestamp는 후속 요소에서 연결한다.",
      },
      story: { iframeHeight: 180, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarRootUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  render: () => <RootStory mode="desktop" />,
  play: async ({ canvasElement }) => {
    await verifyRootGeometry(canvasElement, "desktop");
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "Windows Action 횟수" })).toHaveTextContent(
      "1",
    );
  },
};

export const WindowsSelected: Story = {
  render: () => <RootStory mode="desktop" windowsSelected />,
  play: async ({ canvasElement }) => {
    const windows = within(canvasElement).getByRole("button", { name: "시작" });
    await expect(windows).toHaveAttribute("aria-pressed", "true");
  },
};

export const WindowsDisabled: Story = {
  render: () => <RootStory mode="desktop" windowsDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "시작" }));
    await expect(canvas.getByRole("status", { name: "Windows Action 횟수" })).toHaveTextContent(
      "0",
    );
  },
};

export const Mobile: Story = {
  render: () => <RootStory mode="mobile" />,
  play: async ({ canvasElement }) => verifyRootGeometry(canvasElement, "mobile"),
};

export const NotReady: Story = {
  render: () => <RootStory />,
};

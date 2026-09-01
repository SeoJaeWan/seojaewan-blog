import { Folder20Regular, Settings20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { TaskbarItemUI, TaskbarPreviewUI, TaskbarRootUI, WindowPanelUI } from "./index";

const onTaskbarAction = fn();
const onDisabledTaskbarAction = fn();

const meta = {
  title: "UI/Components/Taskbar",
  component: TaskbarRootUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "TaskbarRootUI는 Windows taskbar의 50px surface, TaskbarItemUI는 accessible name이 있는 40px icon item과 running/active indicator를 표현합니다. TaskbarPreviewUI와 WindowPanelUI는 caller가 제공하는 content slot과 finite transition state만 보여 주며 portal, z-order, hover timer, product action과 lifecycle은 Shell이 맡습니다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarRootUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MetricsAndItemStates: Story = {
  name: "50px root와 40px item 상태",
  render: () => (
    <TaskbarRootUI aria-label="작업 표시줄" data-testid="taskbar-root">
      <TaskbarItemUI icon={<Folder20Regular />} label="대기 앱" />
      <TaskbarItemUI
        data-testid="running-item"
        icon={<Folder20Regular />}
        label="실행 중인 앱"
        onAction={onTaskbarAction}
        state="running"
      />
      <TaskbarItemUI
        data-testid="active-item"
        icon={<Settings20Regular />}
        label="활성 앱"
        onAction={onTaskbarAction}
        state="active"
      />
      <TaskbarItemUI
        disabled
        icon={<Settings20Regular />}
        label="비활성 앱"
        onAction={onDisabledTaskbarAction}
      />
    </TaskbarRootUI>
  ),
  play: async ({ canvasElement }) => {
    onTaskbarAction.mockClear();
    onDisabledTaskbarAction.mockClear();
    const canvas = within(canvasElement);
    const root = canvas.getByRole("navigation", { name: "작업 표시줄" });
    const idle = canvas.getByRole("button", { name: "대기 앱" });
    const running = canvas.getByRole("button", { name: "실행 중인 앱" });
    const active = canvas.getByRole("button", { name: "활성 앱" });
    const disabled = canvas.getByRole("button", { name: "비활성 앱" });

    await expect(root.getBoundingClientRect().height).toBeCloseTo(50, 0);

    for (const item of [idle, running, active, disabled]) {
      await expect(item.getBoundingClientRect().width).toBeCloseTo(40, 0);
      await expect(item.getBoundingClientRect().height).toBeCloseTo(40, 0);
    }

    const runningIndicator = running.querySelector<HTMLElement>(".wd-taskbar-item-ui__indicator");
    const activeIndicator = active.querySelector<HTMLElement>(".wd-taskbar-item-ui__indicator");

    await expect(running).toHaveAttribute("data-state", "running");
    await expect(active).toHaveAttribute("data-state", "active");
    await expect(active).toHaveAttribute("aria-pressed", "true");
    await expect(runningIndicator).not.toBeNull();
    await expect(activeIndicator).not.toBeNull();
    await expect(activeIndicator!.getBoundingClientRect().width).toBeGreaterThan(
      runningIndicator!.getBoundingClientRect().width,
    );

    await userEvent.click(running);
    await expect(onTaskbarAction).toHaveBeenCalledOnce();
    await expect(onTaskbarAction).toHaveBeenLastCalledWith({ type: "activate" });
    await userEvent.click(disabled);
    await expect(onDisabledTaskbarAction).not.toHaveBeenCalled();
  },
};

export const PreviewAndPanelStates: Story = {
  name: "preview와 WindowPanel transition 상태",
  render: () => (
    <div className="wd-story-stack wd-story-stack--loose">
      <div className="wd-story-cluster">
        <TaskbarPreviewUI
          aria-label="표시 중인 미리 보기"
          data-testid="preview-visible"
          preview={<div>visible preview slot</div>}
        />
        <TaskbarPreviewUI
          aria-label="진입 중인 미리 보기"
          data-testid="preview-entering"
          preview={<div>entering preview slot</div>}
          state="entering"
        />
        <TaskbarPreviewUI
          aria-label="퇴장 중인 미리 보기"
          data-testid="preview-exiting"
          preview={<div>exiting preview slot</div>}
          state="exiting"
        />
        <TaskbarPreviewUI
          data-testid="preview-hidden"
          preview={<div>hidden preview slot</div>}
          state="hidden"
        />
      </div>
      <div className="wd-story-cluster">
        <WindowPanelUI aria-label="표시 중인 시작 panel" data-testid="panel-visible" role="dialog">
          visible panel slot
        </WindowPanelUI>
        <WindowPanelUI
          aria-label="진입 중인 시작 panel"
          data-testid="panel-entering"
          role="dialog"
          state="entering"
        >
          entering panel slot
        </WindowPanelUI>
        <WindowPanelUI
          aria-label="퇴장 중인 시작 panel"
          data-testid="panel-exiting"
          role="dialog"
          state="exiting"
        >
          exiting panel slot
        </WindowPanelUI>
        <WindowPanelUI data-testid="panel-hidden" state="hidden">
          hidden panel slot
        </WindowPanelUI>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const previewEntering = canvas.getByTestId("preview-entering");
    const previewExiting = canvas.getByTestId("preview-exiting");
    const previewHidden = canvas.getByTestId("preview-hidden");
    const panelVisible = canvas.getByTestId("panel-visible");
    const panelEntering = canvas.getByTestId("panel-entering");
    const panelExiting = canvas.getByTestId("panel-exiting");
    const panelHidden = canvas.getByTestId("panel-hidden");

    await expect(previewEntering).toHaveAttribute("data-state", "entering");
    await expect(previewExiting).toHaveAttribute("data-state", "exiting");
    await expect(getComputedStyle(previewEntering).animationName).toBe(
      "wd-taskbar-preview-ui-enter",
    );
    await expect(getComputedStyle(previewExiting).animationName).toBe("wd-taskbar-preview-ui-exit");
    await expect(previewHidden).not.toBeVisible();

    await expect(panelVisible.getBoundingClientRect().height).toBeCloseTo(600, 0);
    await expect(panelEntering).toHaveAttribute("data-state", "entering");
    await expect(panelExiting).toHaveAttribute("data-state", "exiting");
    await expect(getComputedStyle(panelEntering).animationName).toBe("wd-window-panel-ui-enter");
    await expect(getComputedStyle(panelExiting).animationName).toBe("wd-window-panel-ui-exit");
    await expect(panelHidden).not.toBeVisible();
  },
};

const durationInMilliseconds = (duration: string) =>
  duration.endsWith("ms") ? Number.parseFloat(duration) : Number.parseFloat(duration) * 1000;

export const ReducedMotionSemanticResult: Story = {
  name: "reduced motion semantic 결과",
  render: () => (
    <div className="wd-story-cluster">
      <TaskbarPreviewUI
        aria-label="reduced motion 미리 보기"
        data-testid="reduced-preview"
        motion="reduced"
        preview={<div>preview slot은 그대로 표시됨</div>}
        state="entering"
      />
      <WindowPanelUI
        aria-label="reduced motion 시작 panel"
        data-testid="reduced-panel"
        motion="reduced"
        role="dialog"
        state="exiting"
      >
        panel slot은 lifecycle state와 함께 유지됨
      </WindowPanelUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const preview = canvas.getByRole("region", { name: "reduced motion 미리 보기" });
    const panel = canvas.getByRole("dialog", { name: "reduced motion 시작 panel" });

    await expect(preview).toHaveAttribute("data-state", "entering");
    await expect(panel).toHaveAttribute("data-state", "exiting");
    await expect(preview).toHaveTextContent("preview slot은 그대로 표시됨");
    await expect(panel).toHaveTextContent("panel slot은 lifecycle state와 함께 유지됨");
    await expect(
      durationInMilliseconds(getComputedStyle(preview).animationDuration),
    ).toBeLessThanOrEqual(0.01);
    await expect(
      durationInMilliseconds(getComputedStyle(panel).animationDuration),
    ).toBeLessThanOrEqual(0.01);
  },
};

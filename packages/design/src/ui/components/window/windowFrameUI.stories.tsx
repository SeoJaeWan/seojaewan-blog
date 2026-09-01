import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  WindowControlsUI,
  WindowFrameUI,
  type WindowFrameUIProps,
  WindowTitleBarUI,
} from "./index";

const storyBounds = {
  blockSize: 360,
  inlineSize: 640,
  insetBlockStart: 32,
  insetInlineStart: 32,
};

const WindowFixture = (props: WindowFrameUIProps) => (
  <div
    data-testid="window-containing-block"
    style={{ height: "424px", position: "relative", width: "704px" }}
  >
    <WindowFrameUI
      aria-label="프로젝트 창"
      bounds={storyBounds}
      titleBar={
        <WindowTitleBarUI
          controls={<WindowControlsUI fullscreen={props.fullscreen} />}
          leading="▣"
          titleContent="프로젝트"
        />
      }
      {...props}
    >
      <div style={{ padding: "24px" }}>
        <strong>Window presentation surface</strong>
        <p>WindowFrameUI는 renderable content만 표시합니다.</p>
      </div>
    </WindowFrameUI>
  </div>
);

const meta = {
  title: "UI/Components/Window",
  component: WindowFrameUI,
  subcomponents: {
    Controls: WindowControlsUI,
    TitleBar: WindowTitleBarUI,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "WindowFrameUI, WindowTitleBarUI와 WindowControlsUI는 창의 geometry, chrome과 presentation event만 표현합니다. Session, ResourceId, persistence, stacking과 실제 minimize/restore/close 동작은 Shell 또는 사용하는 쪽이 소유합니다.",
      },
    },
    layout: "centered",
  },
} satisfies Meta<typeof WindowFrameUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const getFrame = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("region", { name: "프로젝트 창" });

const expectBaseGeometry = async (canvasElement: HTMLElement) => {
  const frame = getFrame(canvasElement);
  const style = getComputedStyle(frame);

  await expect(style.width).toBe("640px");
  await expect(style.height).toBe("360px");
  await expect(
    getComputedStyle(within(frame).getByText("프로젝트").closest("header") as HTMLElement).height,
  ).toBe("30px");
  await expect(within(frame).getByRole("button", { name: "최소화" })).toBeVisible();
  await expect(within(frame).getByRole("button", { name: "최대화" })).toBeVisible();
  await expect(within(frame).getByRole("button", { name: "닫기" })).toBeVisible();
};

export const Active: Story = {
  name: "상태 — active",
  render: () => <WindowFixture activity="active" />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);

    await expect(frame).toHaveAttribute("data-activity", "active");
    await expect(frame).toHaveAttribute("data-motion", "idle");
    await expectBaseGeometry(canvasElement);
  },
};

export const Background: Story = {
  name: "상태 — background",
  render: () => <WindowFixture activity="background" />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);

    await expect(frame).toHaveAttribute("data-activity", "background");
    await expectBaseGeometry(canvasElement);
  },
};

export const Fullscreen: Story = {
  name: "상태 — fullscreen",
  render: () => <WindowFixture fullscreen />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = getFrame(canvasElement);
    const containingBlock = canvas.getByTestId("window-containing-block");

    await expect(frame).toHaveAttribute("data-fullscreen", "true");
    await expect(getComputedStyle(frame).width).toBe(getComputedStyle(containingBlock).width);
    await expect(getComputedStyle(frame).height).toBe(getComputedStyle(containingBlock).height);
    await expect(within(frame).getByRole("button", { name: "이전 크기로 복원" })).toBeVisible();
  },
};

export const Dragging: Story = {
  name: "상태 — dragging",
  render: () => <WindowFixture dragging />,
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
): Story => ({
  render: () => <WindowFixture motion={motion} />,
  play: async ({ canvasElement }) => {
    const frame = getFrame(canvasElement);

    await expect(frame).toHaveAttribute("data-motion", motion);
    await expect(getComputedStyle(frame).animationName).toBe(animationName);
    await expect(getComputedStyle(frame).width).toBe("640px");
    await expect(getComputedStyle(frame).height).toBe("360px");

    frame.dispatchEvent(new AnimationEvent("animationend", { animationName }));
    await expect(frame).toHaveAttribute("data-motion", motion);
  },
});

export const Entering: Story = {
  ...motionStory("entering", "wd-window-frame-enter"),
  name: "상태 — entering",
};

export const Exiting: Story = {
  ...motionStory("exiting", "wd-window-frame-exit"),
  name: "상태 — exiting",
};

export const Minimizing: Story = {
  ...motionStory("minimizing", "wd-window-frame-minimize"),
  name: "상태 — minimizing",
};

export const Restoring: Story = {
  ...motionStory("restoring", "wd-window-frame-restore"),
  name: "상태 — restoring",
};

export const ReducedMotion: Story = {
  name: "동작 — reduced motion semantic equivalence",
  render: () => <WindowFixture motion="entering" />,
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
      await expect(frame).toHaveAttribute("data-activity", "active");
      await expect(within(frame).getByRole("button", { name: "닫기" })).toBeEnabled();
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  },
};

const ControlEventFixture = () => {
  const [event, setEvent] = useState("없음");

  return (
    <div>
      <WindowControlsUI
        aria-label="창 제어"
        onControl={(nextEvent) => setEvent(JSON.stringify(nextEvent))}
      />
      <output aria-label="마지막 presentation event">{event}</output>
    </div>
  );
};

export const PresentationEvent: Story = {
  name: "동작 — ID-free presentation event",
  render: () => <ControlEventFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status", { name: "마지막 presentation event" });

    await expect(status).toHaveTextContent("없음");
    await userEvent.click(canvas.getByRole("button", { name: "최대화" }));
    await expect(status).toHaveTextContent('{"control":"maximize"}');
  },
};

const DisabledControlFixture = () => {
  const [event, setEvent] = useState("없음");

  return (
    <div>
      <WindowControlsUI
        aria-label="창 제어"
        disabledControls={["minimize"]}
        onControl={(nextEvent) => setEvent(nextEvent.control)}
      />
      <output aria-label="비활성 control event">{event}</output>
    </div>
  );
};

export const DisabledControl: Story = {
  name: "상태 — disabled control",
  render: () => <DisabledControlFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const minimize = canvas.getByRole("button", { name: "최소화" });
    const close = canvas.getByRole("button", { name: "닫기" });
    const status = canvas.getByRole("status", { name: "비활성 control event" });

    await expect(minimize).toBeDisabled();
    await userEvent.click(minimize);
    await expect(status).toHaveTextContent("없음");
    await expect(close).toBeEnabled();
    await userEvent.click(close);
    await expect(status).toHaveTextContent("close");
  },
};

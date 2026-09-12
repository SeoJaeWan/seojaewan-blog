import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { TaskbarPanelSurface } from "./index.js";

/** Taskbar가 차지하는 50px을 뺀 viewport 안에 실제 production surface를 표시한다. */
const renderSurface = (variant: "search" | "start") => (
  <TaskbarPanelSurface
    aria-label={`${variant} panel surface`}
    availableHeight="calc(100dvh - 50px)"
    variant={variant}
  />
);

/** legacy 반응형 수치와 현재 가용 높이 제한을 실제 browser geometry로 확인한다. */
const verifySurface = async (canvasElement: HTMLElement, variant: "search" | "start") => {
  const surface = within(canvasElement).getByLabelText(`${variant} panel surface`);
  const bounds = surface.getBoundingClientRect();
  const expectedWidth =
    window.innerWidth < 768
      ? window.innerWidth
      : window.innerWidth < 1280
        ? window.innerWidth * 0.5
        : window.innerWidth * (variant === "start" ? 0.3 : 0.4);

  await expect(bounds.width).toBe(expectedWidth);
  await expect(bounds.height).toBe(Math.min(600, window.innerHeight - 50));

  const styles = getComputedStyle(surface);
  await expect(styles.backgroundColor).toBe("rgb(249, 250, 251)");
  await expect(styles.borderColor).toBe("rgb(214, 217, 224)");
  await expect(styles.borderRadius).toBe("8px");
  await expect(styles.padding).toBe("20px 20px 0px");
};

const meta = {
  title: "Tests/Taskbar/Panel Surface",
  component: TaskbarPanelSurface,
  tags: ["!autodocs", "!dev"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Start와 Search가 공유하는 실제 panel 외형이다. props 기반 leaf Component로 배경, 테두리, 그림자, 여백과 제품별 반응형 너비를 제공한다. 본문, anchor, portal과 lifecycle은 후속 조합 Component가 소유한다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
  args: { variant: "start" },
} satisfies Meta<typeof TaskbarPanelSurface>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Start: Story = {
  name: "Start 외형",
  render: () => renderSurface("start"),
  play: async ({ canvasElement }) => verifySurface(canvasElement, "start"),
};

export const Search: Story = {
  name: "Search 외형",
  render: () => renderSurface("search"),
  play: async ({ canvasElement }) => verifySurface(canvasElement, "search"),
};

export const AvailableHeight: Story = {
  name: "가용 높이 제한",
  args: {
    "aria-label": "available height panel surface",
    availableHeight: 360,
    variant: "start",
  },
  play: async ({ canvasElement }) => {
    const surface = within(canvasElement).getByLabelText("available height panel surface");
    await expect(surface.getBoundingClientRect().height).toBe(360);
  },
};

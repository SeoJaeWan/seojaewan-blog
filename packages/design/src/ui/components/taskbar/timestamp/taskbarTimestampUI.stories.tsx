import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { TaskbarTimestampUI } from "./taskbarTimestampUI.js";

const meta = {
  title: "Design/Components/Taskbar/Timestamp",
  component: TaskbarTimestampUI,
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Taskbar 오른쪽에서 headless controller가 계산한 local 24시간제 시각과 날짜를 읽기 전용으로 표시한다. " +
          "click, tooltip, calendar와 live announce를 제공하지 않는다.",
      },
      story: { iframeHeight: 180, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarTimestampUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: { time: "15:24", date: "2026-07-10" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("15:24")).toBeVisible();
    await expect(canvas.getByText("2026-07-10")).toBeVisible();
    await expect(canvasElement.querySelector("button, a, [tabindex], [role], [title]")).toBeNull();
  },
};

export const Skeleton: Story = {
  args: { value: null },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll(".taskbar-timestamp__skeleton-line")).toHaveLength(
      2,
    );
    await expect(canvasElement.querySelector(".taskbar-timestamp__skeleton")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  },
};

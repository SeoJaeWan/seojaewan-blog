import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import {
  TaskbarPreview,
  withTaskbarDescription,
} from "../../../../../.storybook/taskbarPreview.js";
import { TaskbarTimestamp } from "./taskbarTimestamp.js";

const meta = {
  title: "Design/Components/Taskbar/Timestamp",
  component: TaskbarTimestamp,
  tags: ["autodocs"],
  render: (args) => (
    <TaskbarPreview>
      <TaskbarTimestamp {...args} />
    </TaskbarPreview>
  ),
  decorators: [withTaskbarDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Taskbar 오른쪽에서 headless controller가 계산한 local 24시간제 시각과 날짜를 읽기 전용으로 표시한다. " +
          "click, tooltip, calendar와 live announce를 제공하지 않는다.",
      },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarTimestamp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "시간과 날짜",
  parameters: {
    taskbarDescription:
      "현재 지역의 24시간제 시각과 날짜를 읽기 전용으로 보여 줍니다. 클릭·Tab 입력 대상이 아니며 이 예제에서는 시각을 고정했습니다.",
  },
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
  name: "시간 준비 중",
  parameters: {
    taskbarDescription:
      "서버 렌더링과 초기 준비 단계에는 실제 시간 대신 두 줄 자리 표시자를 보여 줍니다. 시간이 준비되면 시간·날짜로 교체됩니다.",
  },
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

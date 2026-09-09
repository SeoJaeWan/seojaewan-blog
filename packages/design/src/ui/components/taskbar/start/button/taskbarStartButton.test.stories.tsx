import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import startButtonMeta, { Default } from "./taskbarStartButton.stories.js";

/** 일반 상태 Story를 유지하면서 시작 버튼의 실제 입력 전달을 browser에서 검증한다. */
const meta = {
  ...startButtonMeta,
  title: "Tests/Taskbar/Start Button",
  tags: ["!autodocs", "!dev"],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractionTest: Story = {
  ...Default,
  name: "입력 전달 자동 검사",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "시작" });
    const actionCount = canvas.getByRole("status", { name: "Windows Action 횟수" });

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(actionCount).toHaveTextContent("1");
    await userEvent.keyboard(" ");
    await expect(actionCount).toHaveTextContent("2");
    await userEvent.click(button);
    await expect(actionCount).toHaveTextContent("3");
  },
};

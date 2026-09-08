import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { TaskbarStartButtonUI } from "./taskbarStartButtonUI.js";

/** 실제 product callback 호출 횟수를 Canvas에서 관찰할 수 있게 렌더링한다. */
const ActionFixture = ({ disabled = false, selected = false }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <TaskbarStartButtonUI
        disabled={disabled}
        onAction={() => setCount((current) => current + 1)}
        selected={selected}
      />
      <output aria-label="Windows Action 횟수">{count}</output>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start Button",
  component: TaskbarStartButtonUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "desktop Taskbar에서 Windows 요청을 보내는 시작 버튼이다. " +
          "Base UI Button을 직접 조합하며 panel 관계와 open 상태는 소유하지 않는다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarStartButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: { selected: true },
};

export const Hover: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("button", { name: "시작" }));
  },
};

export const Pressed: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: within(canvasElement).getByRole("button", { name: "시작" }),
    });
  },
};

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "시작" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Interaction: Story = {
  render: () => <ActionFixture />,
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

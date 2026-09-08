import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { TaskbarSearchUI } from "./taskbarSearchUI.js";

/** 실제 product callback 호출 횟수를 Canvas에서 관찰할 수 있게 렌더링한다. */
const ActionFixture = ({ disabled = false, selected = false }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <TaskbarSearchUI
        disabled={disabled}
        onAction={() => setCount((current) => current + 1)}
        selected={selected}
      />
      <output aria-label="Search Action 횟수">{count}</output>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Search",
  component: TaskbarSearchUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "desktop Taskbar에서 Search 요청을 보내는 220×30px trigger다. " +
          "Base UI Button을 직접 조합하며 panel, query, recent와 panel focus는 소유하지 않는다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarSearchUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "검색 열기" });
    const icon = button.querySelector<HTMLElement>(".taskbar-search__icon");
    const label = button.querySelector<HTMLElement>(".taskbar-search__label");

    await expect(icon).not.toBeNull();
    await expect(label).not.toBeNull();

    const iconRect = icon!.getBoundingClientRect();
    const labelRect = label!.getBoundingClientRect();
    await expect(iconRect.right).toBeLessThanOrEqual(labelRect.left);
  },
};

export const Selected: Story = {
  args: { selected: true },
};

export const Hover: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("button", { name: "검색 열기" }));
  },
};

export const Pressed: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: within(canvasElement).getByRole("button", { name: "검색 열기" }),
    });
  },
};

export const Focus: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "검색 열기" });
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
    const button = canvas.getByRole("button", { name: "검색 열기" });
    const actionCount = canvas.getByRole("status", { name: "Search Action 횟수" });

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

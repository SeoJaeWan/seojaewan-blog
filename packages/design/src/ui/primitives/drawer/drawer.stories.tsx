import type { Meta, StoryObj } from "@storybook/react-vite";

import { Drawer } from "./drawer";

const meta = {
  component: Drawer,
  parameters: {
    layout: "fullscreen",
  },
  title: "Primitives/Drawer",
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Right: Story = {
  args: {
    children: <button type="button">빠른 작업 실행</button>,
    description: "선택한 창에 대한 빠른 작업을 표시합니다.",
    placement: "right",
    title: "빠른 작업",
    triggerLabel: "빠른 작업 열기",
  },
};

export const Bottom: Story = {
  args: {
    children: "작은 화면을 위한 하단 Drawer 내용",
    description: "화면 아래쪽에서 표시되는 Drawer입니다.",
    placement: "bottom",
    title: "하단 작업",
    triggerLabel: "하단 Drawer 열기",
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";

import { DrawerUI } from "./drawer-ui";

const meta = {
  component: DrawerUI,
  title: "Primitives/DrawerUI",
} satisfies Meta<typeof DrawerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Right: Story = {
  args: {
    children: (
      <>
        <DrawerUI.Trigger>빠른 작업 열기</DrawerUI.Trigger>
        <DrawerUI.Portal>
          <DrawerUI.Backdrop />
          <DrawerUI.Viewport>
            <DrawerUI.Content>
              <DrawerUI.Title>빠른 작업</DrawerUI.Title>
              <DrawerUI.Description>선택한 창에 대한 작업입니다.</DrawerUI.Description>
              <DrawerUI.Close>닫기</DrawerUI.Close>
            </DrawerUI.Content>
          </DrawerUI.Viewport>
        </DrawerUI.Portal>
      </>
    ),
    placement: "right",
  },
};

export const Left: Story = {
  args: {
    ...Right.args,
    placement: "left",
  },
};

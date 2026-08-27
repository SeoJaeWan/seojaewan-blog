import type { Meta, StoryObj } from "@storybook/react-vite";

import { SheetUI } from "./sheet-ui";

const meta = {
  component: SheetUI,
  title: "Primitives/SheetUI",
} satisfies Meta<typeof SheetUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Bottom: Story = {
  args: {
    children: (
      <>
        <SheetUI.Trigger>하단 시트 열기</SheetUI.Trigger>
        <SheetUI.Portal>
          <SheetUI.Backdrop />
          <SheetUI.Viewport>
            <SheetUI.Content>
              <SheetUI.Handle />
              <SheetUI.Title>하단 작업</SheetUI.Title>
              <SheetUI.Description>아래로 스와이프해 닫을 수 있습니다.</SheetUI.Description>
              <SheetUI.Close>닫기</SheetUI.Close>
            </SheetUI.Content>
          </SheetUI.Viewport>
        </SheetUI.Portal>
      </>
    ),
  },
};

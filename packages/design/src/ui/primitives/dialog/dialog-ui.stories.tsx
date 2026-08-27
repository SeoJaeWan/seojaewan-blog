import type { Meta, StoryObj } from "@storybook/react-vite";

import { DialogUI } from "./dialog-ui";

const meta = {
  component: DialogUI,
  title: "Primitives/DialogUI",
} satisfies Meta<typeof DialogUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <DialogUI.Trigger>설정 열기</DialogUI.Trigger>
        <DialogUI.Portal>
          <DialogUI.Backdrop />
          <DialogUI.Content>
            <DialogUI.Title>설정</DialogUI.Title>
            <DialogUI.Description>개인 설정을 변경합니다.</DialogUI.Description>
            <label>
              표시 이름
              <input defaultValue="Seo Jae-wan" />
            </label>
            <DialogUI.Close>완료</DialogUI.Close>
          </DialogUI.Content>
        </DialogUI.Portal>
      </>
    ),
  },
};

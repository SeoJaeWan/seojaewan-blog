import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { CollapsibleUI } from "./index";

const meta = {
  title: "UI/Primitives/CollapsibleUI",
  component: CollapsibleUI.Root,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "CollapsibleUI는 trigger로 연결된 panel을 펼치거나 접는 disclosure primitive입니다. 텍스트 값을 입력하는 InputUI나 미리 정의된 값을 고르는 ComboboxUI·SelectUI와 달리, 관련 콘텐츠의 표시 여부만 다룹니다.",
      },
    },
  },
} satisfies Meta<typeof CollapsibleUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Documents disclosure가 접힌 상태에서 시작합니다. trigger에 Enter를 누르면 연결된 Project files panel이 나타나고 aria-expanded와 aria-controls가 그 결과를 설명합니다.",
      },
    },
  },
  render: (args) => (
    <CollapsibleUI.Root {...args}>
      <CollapsibleUI.Trigger>Documents</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Project files</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Documents" });

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const panel = await canvas.findByText("Project files");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", panel.id);
  },
};

export const InitiallyOpen: Story = {
  args: {
    defaultOpen: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Pictures disclosure가 이미 펼쳐진 초기 상태입니다. 별도 행동 없이 trigger는 열린 상태를 나타내고 연결된 Saved pictures panel이 Canvas에 보입니다.",
      },
    },
  },
  render: (args) => (
    <CollapsibleUI.Root {...args}>
      <CollapsibleUI.Trigger>Pictures</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Saved pictures</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Downloads disclosure를 펼칠 수 없는 비활성 상태입니다. trigger를 실행할 수 없으므로 Downloaded files panel은 닫힌 결과로 유지됩니다.",
      },
    },
  },
  render: (args) => (
    <CollapsibleUI.Root {...args}>
      <CollapsibleUI.Trigger>Downloads</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Downloaded files</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
};

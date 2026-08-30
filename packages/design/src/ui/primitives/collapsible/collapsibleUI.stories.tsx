import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { CollapsibleUI } from "./index";

const meta = {
  title: "UI/Primitives/CollapsibleUI",
  component: CollapsibleUI.Root,
  subcomponents: {
    Trigger: CollapsibleUI.Trigger,
    Panel: CollapsibleUI.Panel,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "CollapsibleUI는 한 영역의 관련 콘텐츠를 펼치거나 접는 disclosure에 사용합니다. action 목록을 호출하면 MenuUI를, 값을 입력하거나 고르면 InputUI·ComboboxUI·SelectUI를 선택합니다. public Root 안에 Trigger와 Panel을 조합하며 Root가 open/disabled 상태를, Trigger가 aria-expanded·aria-controls와 keyboard activation을, Panel이 연결된 콘텐츠를 표현합니다. consumer는 Trigger의 읽을 수 있는 이름과 Panel 콘텐츠를 제공해야 하고, CollapsibleUI는 tree selection, 데이터 로딩이나 공개할 business 콘텐츠를 소유하지 않습니다.",
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

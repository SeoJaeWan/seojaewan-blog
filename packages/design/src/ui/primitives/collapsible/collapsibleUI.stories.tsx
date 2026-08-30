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
          "### What is it?\nCollapsibleUI는 문서 흐름 안의 관련 콘텐츠를 펼치거나 접는 in-flow disclosure Primitive입니다. portal이나 modal isolation 없이 Trigger와 연결된 Panel의 가시성을 바꿉니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Folder의 category disclosure**입니다. `Product Reference — Existing Folder Category` Story가 category와 content의 Existing state를 작은 local fixture로 보여 줍니다.\n\n### When should I use it?\nFolder category처럼 같은 화면의 계층과 문맥을 유지한 채 하위 콘텐츠를 필요할 때만 드러내는 영역에 사용합니다.\n\n### When should I choose something else?\nanchor에 떠 있는 일시적 panel에는 PopoverUI를, 배경 focus·pointer를 격리해야 하는 흐름에는 DialogUI를 사용합니다. action 목록에는 MenuUI가 맞습니다.\n\n### What states and interaction contract matter?\nCollapsed/Expanded와 Disabled 상태, native keyboard activation, Trigger의 aria-expanded·aria-controls와 연결된 Panel 가시성이 중요합니다. disclosure는 focus를 별도 surface로 옮기거나 route를 변경하지 않습니다.\n\n### Who owns what?\nPrimitive는 open/disabled state와 Trigger-Panel accessibility mechanics를 소유합니다. Consumer는 읽을 수 있는 category 이름과 Panel 콘텐츠를 제공합니다. Folder category 데이터, 선택 상태, loading, item action과 route는 higher layer가 소유합니다.",
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

const ExistingFolderCategoryProductReference = () => (
  <section
    aria-label="Existing Folder category reference"
    className="wd-story-stage wd-story-stack"
    data-product-state="existing"
    data-product-surface="existing-folder-category-disclosure"
  >
    <p>Existing Folder · Existing state</p>
    <CollapsibleUI.Root>
      <CollapsibleUI.Trigger>Frontend category</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>
        <p>Folder category contents</p>
        <ul>
          <li>React notes</li>
          <li>CSS notes</li>
        </ul>
      </CollapsibleUI.Panel>
    </CollapsibleUI.Root>
    <p>Category selection and route remain higher-layer responsibilities.</p>
  </section>
);

export const ProductReference: Story = {
  name: "Product Reference — Existing Folder Category",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Folder category disclosure. Reference state: Existing. Primitive 범위는 in-flow Trigger-Panel disclosure와 aria-expanded·aria-controls까지입니다. category 데이터, 현재 selection, loading, item action과 route는 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingFolderCategoryProductReference />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Frontend category" });

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByText("Folder category contents")).not.toBeInTheDocument();

    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const panel = await canvas.findByText("Folder category contents");
    await expect(trigger).toHaveFocus();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", panel.parentElement?.id);
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
  },
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

import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";

import { FolderCategoryItemUI, FolderSidebarFileItemUI } from "../../components/folder";
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
          "### 무엇인가요?\nCollapsibleUI는 같은 문서 흐름 안의 관련 내용을 펼치고 접는 disclosure Primitive입니다. 새 surface를 띄우지 않고 Trigger와 연결된 Panel만 보여 주거나 숨깁니다.\n\n### 제품에서는 어디에 쓰나요?\n제품 기준은 **Existing Folder의 category disclosure**입니다. `Product Reference — Existing Folder Category` Story에서 Folder category와 그 아래 파일 묶음의 계층을 확인합니다.\n\n### 언제 쓰나요?\nFolder category처럼 현재 화면과 계층을 그대로 유지하면서 하위 내용만 필요할 때 보여 줄 때 씁니다.\n\n### 다른 surface는 언제 고르나요?\n기준 대상 위에 작은 panel을 띄우면 PopoverUI를, 배경 focus와 pointer를 막아야 하면 DialogUI를 씁니다. 항목 실행 목록에는 MenuUI가 맞습니다.\n\n### 꼭 지켜야 할 동작은 무엇인가요?\n접힘·펼침·비활성 상태, keyboard 실행, Trigger의 `aria-expanded`·`aria-controls`, 연결된 Panel의 가시성이 중요합니다. disclosure는 focus를 다른 surface로 옮기지 않습니다.\n\n### 누가 무엇을 소유하나요?\nPrimitive는 open·disabled 상태와 Trigger-Panel 접근성 연결을 소유합니다. Folder category 데이터, 선택, loading, item action과 route는 Folder owner가 소유합니다.",
      },
    },
  },
} satisfies Meta<typeof CollapsibleUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

const getChevron = (trigger: HTMLElement) => {
  const chevron = trigger.querySelector<SVGElement>(".wd-collapsible-ui__trigger-icon");

  if (!chevron) {
    throw new Error("Collapsible trigger chevron not found");
  }

  return chevron;
};

const getRotation = (element: Element) => {
  const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);

  return Math.round((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI);
};

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
    await expect(getRotation(getChevron(trigger))).toBe(0);
    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const panel = await canvas.findByText("Project files");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", panel.id);
    await waitFor(() => expect(getRotation(getChevron(trigger))).toBe(90));
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

export const WidthCompositionContract: Story = {
  name: "폭 계약 — intrinsic과 composition",
  parameters: {
    docs: {
      description: {
        story:
          "기본 Collapsible trigger는 내용만큼만 차지하고, Folder 같은 상위 계층이 width를 명시하면 그 allocation을 채우는지 확인합니다.",
      },
    },
  },
  render: () => (
    <div className="wd-story-stage wd-story-stack" style={{ width: "22rem" }}>
      <CollapsibleUI.Root data-testid="collapsible-intrinsic-root" style={{ width: "100%" }}>
        <CollapsibleUI.Trigger data-testid="collapsible-intrinsic-trigger">
          Intrinsic category
        </CollapsibleUI.Trigger>
        <CollapsibleUI.Panel>Intrinsic files</CollapsibleUI.Panel>
      </CollapsibleUI.Root>
      <CollapsibleUI.Root data-testid="collapsible-composed-root" style={{ width: "100%" }}>
        <CollapsibleUI.Trigger data-testid="collapsible-composed-trigger" style={{ width: "100%" }}>
          상위 Folder가 전체 폭을 소유하는 category
        </CollapsibleUI.Trigger>
        <CollapsibleUI.Panel>Composed files</CollapsibleUI.Panel>
      </CollapsibleUI.Root>
    </div>
  ),
  play: async ({ canvas }) => {
    const intrinsicRoot = canvas.getByTestId("collapsible-intrinsic-root");
    const intrinsicTrigger = canvas.getByTestId("collapsible-intrinsic-trigger");
    const composedRoot = canvas.getByTestId("collapsible-composed-root");
    const composedTrigger = canvas.getByTestId("collapsible-composed-trigger");

    await expect(intrinsicTrigger.getBoundingClientRect().width).toBeLessThan(
      intrinsicRoot.getBoundingClientRect().width,
    );
    await expect(composedTrigger.getBoundingClientRect().width).toBeCloseTo(
      composedRoot.getBoundingClientRect().width,
      0,
    );
    await expect(getComputedStyle(intrinsicTrigger).display).toBe("inline-flex");
    await expect(getComputedStyle(intrinsicTrigger).flexGrow).toBe("0");
  },
};

const ExistingFolderCategoryProductReference = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-label="Existing Folder category reference"
      className="wd-story-stage wd-story-stack"
      data-product-state="existing"
      data-product-surface="existing-folder-category-disclosure"
    >
      <p>Existing Folder · category</p>
      <output aria-label="Folder category 상태">
        {isOpen ? "프로젝트 category 펼쳐짐" : "프로젝트 category 접힘"}
      </output>
      <ul>
        <FolderCategoryItemUI
          disclosureLabel="프로젝트 category 표시 전환"
          label="프로젝트 (2)"
          onOpenChange={setIsOpen}
          open={isOpen}
          panelProps={{ "aria-label": "프로젝트 category 내용", role: "region" }}
        >
          <FolderSidebarFileItemUI title="블로그 개편.md" />
          <FolderSidebarFileItemUI title="디자인 시스템.md" />
        </FolderCategoryItemUI>
      </ul>
    </section>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Folder Category",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Folder category disclosure. Reference state: Existing. production FolderCategoryItemUI와 FolderSidebarFileItemUI가 CollapsibleUI를 소비하는 실제 DOM 경로에서 disclosure와 child row를 확인합니다. category 데이터, 선택, loading, item action과 route는 Folder owner가 소유합니다.",
      },
    },
  },
  render: () => <ExistingFolderCategoryProductReference />,
  play: async ({ canvas }) => {
    const reference = canvas.getByRole("region", { name: "Existing Folder category reference" });
    const trigger = canvas.getByRole("button", { name: "프로젝트 category 표시 전환" });
    const status = canvas.getByRole("status", { name: "Folder category 상태" });

    await expect(reference).toHaveAttribute("data-product-state", "existing");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(getChevron(trigger)).toHaveAttribute("aria-hidden", "true");
    await expect(getRotation(getChevron(trigger))).toBe(0);
    await expect(
      canvas.queryByRole("region", { name: "프로젝트 category 내용" }),
    ).not.toBeInTheDocument();
    await expect(status).toHaveTextContent("프로젝트 category 접힘");

    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const panel = await canvas.findByRole("region", { name: "프로젝트 category 내용" });
    await expect(trigger).toHaveFocus();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", panel.id);
    await waitFor(() => expect(getRotation(getChevron(trigger))).toBe(90));
    await expect(status).toHaveTextContent("프로젝트 category 펼쳐짐");
    await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.keyboard("{Enter}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveFocus();
    await expect(status).toHaveTextContent("프로젝트 category 접힘");
    await waitFor(() => expect(getRotation(getChevron(trigger))).toBe(0));
  },
};

export const ReducedMotion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "reduced-motion 환경에서도 disclosure의 chevron 방향은 open 상태를 즉시 나타냅니다. transform transition만 제거하며 keyboard toggle과 trigger focus는 유지됩니다.",
      },
    },
  },
  render: () => (
    <CollapsibleUI.Root>
      <CollapsibleUI.Trigger>Reduced motion folder</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Reduced motion files</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
  play: async ({ canvas }) => {
    const { cdp } = await import("vitest/browser");
    const session = cdp();
    const trigger = canvas.getByRole("button", { name: "Reduced motion folder" });
    const chevron = getChevron(trigger);

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      await expect(getComputedStyle(chevron).transitionDuration).toBe("0s");
      await expect(getRotation(chevron)).toBe(0);

      trigger.focus();
      await userEvent.keyboard("{Enter}");

      await expect(trigger).toHaveFocus();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(getRotation(chevron)).toBe(90);
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
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

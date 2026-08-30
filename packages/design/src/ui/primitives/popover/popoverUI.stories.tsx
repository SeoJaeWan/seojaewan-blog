import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ButtonUI } from "../button";
import { InputUI } from "../input";
import { PopoverUI } from "./index";

const PopoverExample = ({
  defaultOpen = false,
  side = "bottom",
}: {
  defaultOpen?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [outsideActionCount, setOutsideActionCount] = useState(0);
  const [outsideActionResult, setOutsideActionResult] = useState("아직 실행되지 않음");

  return (
    <div className="wd-story-stage wd-story-stage--centered wd-story-stack">
      <ButtonUI
        onClick={() => {
          setOutsideActionCount((count) => count + 1);
          setOutsideActionResult("외부 action이 실행되며 Popover가 dismiss되고 focus가 남음");
        }}
      >
        Outside action
      </ButtonUI>
      <dl className="wd-story-probe">
        <dt>Outside action 실행 횟수</dt>
        <dd data-testid="popover-outside-count">{outsideActionCount}</dd>
        <dt>현재 상태</dt>
        <dd data-testid="popover-surface-status">
          {isOpen ? "Popover 열림 — 외부 action 사용 가능" : "Popover 닫힘 — 외부 action 사용 가능"}
        </dd>
        <dt>마지막 결과</dt>
        <dd data-testid="popover-outside-result">{outsideActionResult}</dd>
      </dl>
      <PopoverUI open={isOpen} onOpenChange={setIsOpen}>
        <PopoverUI.Trigger>Account</PopoverUI.Trigger>
        <PopoverUI.Content side={side}>
          <PopoverUI.Title>Account details</PopoverUI.Title>
          <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
          <label className="wd-story-field">
            Display name
            <InputUI aria-label="Display name" />
          </label>
          <PopoverUI.Close>Done</PopoverUI.Close>
        </PopoverUI.Content>
      </PopoverUI>
    </div>
  );
};

const meta = {
  component: PopoverUI,
  subcomponents: {
    Trigger: PopoverUI.Trigger,
    Content: PopoverUI.Content,
    Title: PopoverUI.Title,
    Description: PopoverUI.Description,
    Close: PopoverUI.Close,
  },
  parameters: {
    docs: {
      description: {
        component:
          "### What is it?\nPopoverUI는 trigger에 anchor된 보조 surface를 portal에 렌더링하면서 주변 action을 계속 허용하는 non-modal Primitive입니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Taskbar의 Start panel, Search panel과 hover preview panel**입니다. `Product Reference — Existing Taskbar Panels` Story가 세 panel의 Existing state를 작은 local fixture로 식별합니다.\n\n### When should I use it?\nTaskbar trigger와 공간적으로 연결된 panel처럼 사용자가 주변 desktop·taskbar action을 계속 사용할 수 있어야 하는 일시적 보조 콘텐츠에 사용합니다.\n\n### When should I choose something else?\n페이지 나머지와 focus·pointer를 격리해야 하는 흐름에는 DialogUI를, 문서 흐름 안의 콘텐츠를 펼치고 접는 데에는 CollapsibleUI를 사용합니다.\n\n### What states and interaction contract matter?\nClosed/Open과 anchor placement 상태, accessible dialog naming, portal rendering, initial focus, Escape·outside-interaction dismissal, trigger focus 복원과 reduced-motion이 중요합니다. outside pointer action은 surface를 닫은 뒤에도 실행됩니다.\n\n### Who owns what?\nPrimitive는 anchor·portal·focus·dismissal mechanics를 소유합니다. Consumer는 읽을 수 있는 panel 이름, 콘텐츠와 controlled open policy를 제공합니다. Taskbar panel dimensions, Start items, Search query/results, hover timing·preview 데이터와 route는 higher layer가 소유합니다.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "UI/Primitives/PopoverUI",
} satisfies Meta<typeof PopoverUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "anchor인 Account trigger만 보이는 닫힌 상태입니다. 주변 Outside action은 계속 실행할 수 있고 counter와 마지막 결과가 Canvas에 표시됩니다.",
      },
    },
  },
  render: () => <PopoverExample />,
};

export const Open: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "anchor 아래에 non-modal surface가 열린 상태입니다. 초기 focus는 입력으로 이동하지만 외부 영역을 격리하지 않으며, Canvas의 현재 상태가 Outside action 사용 가능 여부를 보여 줍니다.",
      },
    },
  },
  render: () => <PopoverExample defaultOpen />,
};

export const Placement: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "같은 compound part를 유지하면서 Content를 anchor 오른쪽에 배치한 상태입니다. placement만 달라지고 non-modal 외부 action 계약은 그대로입니다.",
      },
    },
  },
  render: () => <PopoverExample defaultOpen side="right" />,
};

export const PortalAndDismissal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "trigger로 연 Content가 Canvas 밖 portal에 렌더링되고 입력으로 초기 focus를 옮깁니다. Outside action을 누르면 action counter가 증가하면서 surface가 dismiss되고 그 action에 focus가 남습니다. 다시 연 surface는 Escape로 닫히고 trigger로 focus를 복원합니다.",
      },
    },
  },
  render: () => <PopoverExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const outside = canvas.getByRole("button", { name: "Outside action" });
    const outsideCount = canvas.getByTestId("popover-outside-count");
    const surfaceStatus = canvas.getByTestId("popover-surface-status");
    const outsideResult = canvas.getByTestId("popover-outside-result");
    const trigger = canvas.getByRole("button", { name: "Account" });

    await userEvent.click(trigger);

    const dialog = await page.findByRole("dialog", { name: "Account details" });
    await expect(canvasElement.contains(dialog)).toBe(false);
    await expect(page.getByRole("textbox", { name: "Display name" })).toHaveFocus();
    await expect(surfaceStatus).toHaveTextContent("Popover 열림 — 외부 action 사용 가능");

    await userEvent.click(outside);
    await waitFor(() => expect(page.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(outside).toHaveFocus();
    await expect(outsideCount).toHaveTextContent("1");
    await expect(surfaceStatus).toHaveTextContent("Popover 닫힘 — 외부 action 사용 가능");
    await expect(outsideResult).toHaveTextContent(
      "외부 action이 실행되며 Popover가 dismiss되고 focus가 남음",
    );

    await userEvent.click(trigger);
    await page.findByRole("dialog", { name: "Account details" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await expect(outsideCount).toHaveTextContent("1");
    await expect(outsideResult).toHaveTextContent("Popover가 dismiss되고 focus가 남음");
  },
};

const ExistingTaskbarPanelsProductReference = () => {
  const [openPanel, setOpenPanel] = useState<"start" | "search" | "hover" | null>(null);
  const [outsideActionResult, setOutsideActionResult] = useState("아직 실행되지 않음");

  return (
    <section
      aria-label="Existing Taskbar panel reference"
      className="wd-story-stage wd-story-stack"
      data-product-state="existing"
      data-product-surface="existing-taskbar-panels"
    >
      <p>Existing Taskbar · Existing state</p>
      <dl className="wd-story-probe">
        <dt>Start panel</dt>
        <dd>Existing · non-modal</dd>
        <dt>Search panel</dt>
        <dd>Existing · non-modal</dd>
        <dt>Hover preview panel</dt>
        <dd>Existing · non-modal; hover timing is higher-layer</dd>
      </dl>
      <div className="wd-story-cluster">
        <PopoverUI
          open={openPanel === "start"}
          onOpenChange={(isOpen) => setOpenPanel(isOpen ? "start" : null)}
        >
          <PopoverUI.Trigger>Start</PopoverUI.Trigger>
          <PopoverUI.Content>
            <PopoverUI.Title>Taskbar Start panel</PopoverUI.Title>
            <PopoverUI.Description>Minimal local Start panel reference.</PopoverUI.Description>
            <PopoverUI.Close>Close Start</PopoverUI.Close>
          </PopoverUI.Content>
        </PopoverUI>

        <PopoverUI
          open={openPanel === "search"}
          onOpenChange={(isOpen) => setOpenPanel(isOpen ? "search" : null)}
        >
          <PopoverUI.Trigger>Search</PopoverUI.Trigger>
          <PopoverUI.Content>
            <PopoverUI.Title>Taskbar Search panel</PopoverUI.Title>
            <PopoverUI.Description>Minimal local Search panel reference.</PopoverUI.Description>
            <InputUI aria-label="Search Taskbar reference" placeholder="Search" />
            <PopoverUI.Close>Close Search</PopoverUI.Close>
          </PopoverUI.Content>
        </PopoverUI>

        <PopoverUI
          open={openPanel === "hover"}
          onOpenChange={(isOpen) => setOpenPanel(isOpen ? "hover" : null)}
        >
          <PopoverUI.Trigger>Folder preview</PopoverUI.Trigger>
          <PopoverUI.Content>
            <PopoverUI.Title>Taskbar hover preview panel</PopoverUI.Title>
            <PopoverUI.Description>
              Minimal local preview; product hover timing stays outside the Primitive.
            </PopoverUI.Description>
            <PopoverUI.Close>Close preview</PopoverUI.Close>
          </PopoverUI.Content>
        </PopoverUI>

        <ButtonUI onClick={() => setOutsideActionResult("Desktop action 실행됨")}>
          Open desktop item
        </ButtonUI>
      </div>
      <output aria-label="Taskbar outside action 상태">{outsideActionResult}</output>
    </section>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Taskbar Panels",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Taskbar Start/Search/hover preview panels. Reference state: Existing. 세 panel은 anchor된 non-modal 선택의 parity를 보여 줍니다. Primitive 범위는 portal, focus와 dismissal까지이며 panel dimensions, Start/Search content, hover timing, selection과 route는 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingTaskbarPanelsProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const searchTrigger = canvas.getByRole("button", { name: "Search" });
    const startTrigger = canvas.getByRole("button", { name: "Start" });
    const outsideAction = canvas.getByRole("button", { name: "Open desktop item" });
    const outsideStatus = canvas.getByRole("status", {
      name: "Taskbar outside action 상태",
    });

    await userEvent.click(searchTrigger);
    const searchPanel = await page.findByRole("dialog", { name: "Taskbar Search panel" });
    await expect(canvasElement.contains(searchPanel)).toBe(false);
    await expect(page.getByRole("textbox", { name: "Search Taskbar reference" })).toHaveFocus();

    await userEvent.click(outsideAction);
    await waitFor(() => expect(searchPanel).not.toBeInTheDocument());
    await expect(outsideAction).toHaveFocus();
    await expect(outsideStatus).toHaveTextContent("Desktop action 실행됨");

    await userEvent.click(startTrigger);
    await page.findByRole("dialog", { name: "Taskbar Start panel" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Taskbar Start panel" })).not.toBeInTheDocument(),
    );
    await expect(startTrigger).toHaveFocus();
  },
};

export const ReducedMotion: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "reduced-motion 환경에서 열린 non-modal surface입니다. Content의 transition duration이 0초가 되는 것을 관찰하며 anchor, portal과 외부 action 의미는 유지됩니다.",
      },
    },
  },
  render: () => <PopoverExample defaultOpen />,
  play: async ({ canvasElement }) => {
    const { cdp } = await import("vitest/browser");
    const session = cdp();
    const page = within(canvasElement.ownerDocument.body);

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      const dialog = await page.findByRole("dialog", { name: "Account details" });
      await expect(getComputedStyle(dialog).transitionDuration).toBe("0s");
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  },
};

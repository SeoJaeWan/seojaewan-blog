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
          "### 무엇인가요?\nPopoverUI는 누른 대상 가까이에 작은 보조 화면을 띄우는 non-modal Primitive입니다. 주변 화면을 막지 않습니다.\n\n### 제품에서는 어디에 쓰나요?\n주요 기준은 **Existing Taskbar의 클릭 panel**입니다. `Product Reference — Existing Taskbar Click Panel` Story에서 Start 버튼과 panel의 관계를 확인합니다. hover로 여는 미리보기는 정책이 다르므로 `Product Reference — Existing Taskbar Hover Preview` Story에 따로 둡니다.\n\n### 언제 쓰나요?\nTaskbar 버튼처럼 panel이 기준 대상에 붙어 있어야 하고, 열린 동안에도 주변 화면을 막지 않아야 할 때 씁니다.\n\n### 다른 surface는 언제 고르나요?\n배경의 focus와 pointer를 막아야 하면 DialogUI를, 같은 문서 흐름 안의 내용을 펼치고 접으면 CollapsibleUI를 씁니다.\n\n### 꼭 지켜야 할 동작은 무엇인가요?\n열림 상태, 기준 대상과의 배치, 접근 가능한 이름, portal, focus, Escape·바깥 누르기 닫힘, trigger로 돌아오는 focus가 중요합니다. click·hover·outside 정책은 소비자가 한 시나리오씩 분리해 정합니다.\n\n### 누가 무엇을 소유하나요?\nPrimitive는 anchor·portal·focus·dismissal mechanics를 소유합니다. Taskbar panel 크기, Start 항목, hover 지연 시간, 미리보기 데이터와 route는 Taskbar owner가 소유합니다.",
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

export const WidthAndViewportContract: Story = {
  name: "폭 계약 — override와 viewport 경계",
  parameters: {
    docs: {
      description: {
        story:
          "Popover surface가 소비자가 명시한 작은 폭을 받아들이고, 긴 내용이 있어도 Base UI available width와 viewport 충돌 경계 안에 머무는지 확인합니다.",
      },
    },
  },
  render: () => (
    <div
      className="wd-story-stage"
      style={{
        alignItems: "flex-end",
        boxSizing: "border-box",
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <PopoverUI defaultOpen>
        <PopoverUI.Trigger>폭 경계 열기</PopoverUI.Trigger>
        <PopoverUI.Content
          align="end"
          data-testid="popover-width-content"
          initialFocus={false}
          style={{ width: "18rem" }}
        >
          <PopoverUI.Title>Popover width contract</PopoverUI.Title>
          <PopoverUI.Description data-testid="popover-width-long-content">
            https://example.com/a-deliberately-long-unbroken-popover-value-that-must-not-grow-the-surface
          </PopoverUI.Description>
          <PopoverUI.Close>닫기</PopoverUI.Close>
        </PopoverUI.Content>
      </PopoverUI>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const content = await page.findByTestId("popover-width-content");
    const rectangle = content.getBoundingClientRect();
    const viewportWidth = canvasElement.ownerDocument.documentElement.clientWidth;

    await expect(rectangle.width).toBeCloseTo(288, 0);
    await expect(rectangle.left).toBeGreaterThanOrEqual(0);
    await expect(rectangle.right).toBeLessThanOrEqual(viewportWidth);
    await expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
    await expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(
      viewportWidth,
    );
  },
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

const ExistingTaskbarClickPanelReference = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastResult, setLastResult] = useState("Start panel 닫힘");

  return (
    <section
      aria-label="Existing Taskbar click panel reference"
      className="wd-story-stage wd-story-stack"
      data-product-state="existing"
      data-product-surface="existing-taskbar-click-panel"
    >
      <p>Existing Taskbar · 클릭으로 여는 Start panel</p>
      <output aria-label="Taskbar Start panel 상태">{lastResult}</output>
      <PopoverUI
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);
          setLastResult(nextOpen ? "Start panel 열림" : "Start panel 닫힘");
        }}
      >
        <PopoverUI.Trigger>Start</PopoverUI.Trigger>
        <PopoverUI.Content>
          <PopoverUI.Title>Taskbar Start panel</PopoverUI.Title>
          <PopoverUI.Description>
            고정된 앱과 최근 문서를 확인하는 보조 panel입니다.
          </PopoverUI.Description>
          <ul>
            <li>계산기</li>
            <li>메모장</li>
          </ul>
          <PopoverUI.Close>Start panel 닫기</PopoverUI.Close>
        </PopoverUI.Content>
      </PopoverUI>
    </section>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Taskbar Click Panel",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Taskbar Start click panel. Reference state: Existing. 클릭한 Start 버튼에 붙는 non-modal panel의 열기와 닫기만 보여 줍니다. panel 크기, 앱 데이터와 route는 Taskbar owner가 소유합니다.",
      },
    },
  },
  render: () => <ExistingTaskbarClickPanelReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Start" });
    const status = canvas.getByRole("status", { name: "Taskbar Start panel 상태" });

    await expect(status).toHaveTextContent("Start panel 닫힘");
    await userEvent.click(trigger);
    const panel = await page.findByRole("dialog", { name: "Taskbar Start panel" });
    const close = page.getByRole("button", { name: "Start panel 닫기" });
    await expect(canvasElement.contains(panel)).toBe(false);
    await expect(panel).not.toHaveAttribute("aria-modal", "true");
    await expect(close).toHaveFocus();
    await expect(status).toHaveTextContent("Start panel 열림");

    await userEvent.click(close);
    await waitFor(() => expect(panel).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
    await expect(status).toHaveTextContent("Start panel 닫힘");
  },
};

const ExistingTaskbarHoverPreviewReference = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-label="Existing Taskbar hover preview reference"
      className="wd-story-stage wd-story-stack"
      data-product-state="existing"
      data-product-surface="existing-taskbar-hover-preview"
    >
      <p>Existing Taskbar · hover로 보는 창 미리보기</p>
      <output aria-label="Taskbar hover preview 상태">
        {isOpen ? "창 미리보기 열림" : "창 미리보기 닫힘"}
      </output>
      <PopoverUI open={isOpen} onOpenChange={setIsOpen}>
        <PopoverUI.Trigger
          onPointerEnter={() => setIsOpen(true)}
          onPointerLeave={() => setIsOpen(false)}
        >
          Folder
        </PopoverUI.Trigger>
        <PopoverUI.Content initialFocus={false}>
          <PopoverUI.Title>Folder 창 미리보기</PopoverUI.Title>
          <PopoverUI.Description>
            열려 있는 Folder 창 한 개를 작게 확인합니다.
          </PopoverUI.Description>
        </PopoverUI.Content>
      </PopoverUI>
    </section>
  );
};

export const HoverPreviewProductReference: Story = {
  name: "Product Reference — Existing Taskbar Hover Preview",
  parameters: {
    docs: {
      description: {
        story:
          "Surface: Existing Taskbar hover preview. Reference state: Existing. hover 진입과 이탈만 다루는 별도 시나리오입니다. 지연 시간과 창 미리보기 데이터는 Taskbar owner가 소유합니다.",
      },
    },
  },
  render: () => <ExistingTaskbarHoverPreviewReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Folder" });
    const status = canvas.getByRole("status", { name: "Taskbar hover preview 상태" });

    await expect(status).toHaveTextContent("창 미리보기 닫힘");
    await userEvent.hover(trigger);
    const preview = await page.findByRole("dialog", { name: "Folder 창 미리보기" });
    await expect(preview).not.toHaveAttribute("aria-modal", "true");
    await expect(status).toHaveTextContent("창 미리보기 열림");

    await userEvent.unhover(trigger);
    await waitFor(() => expect(preview).not.toBeInTheDocument());
    await expect(status).toHaveTextContent("창 미리보기 닫힘");
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

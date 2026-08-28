import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { PopoverUI } from "./popoverUI";

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
    <div style={{ display: "grid", gap: 12, minHeight: 240, placeItems: "center" }}>
      <button
        type="button"
        onClick={() => {
          setOutsideActionCount((count) => count + 1);
          setOutsideActionResult("외부 action이 실행되며 Popover가 dismiss되고 focus가 남음");
        }}
      >
        Outside action
      </button>
      <dl style={{ margin: 0 }}>
        <dt>Outside action 실행 횟수</dt>
        <dd data-testid="popover-outside-count" style={{ marginInlineStart: 0 }}>
          {outsideActionCount}
        </dd>
        <dt>현재 상태</dt>
        <dd data-testid="popover-surface-status" style={{ marginInlineStart: 0 }}>
          {isOpen ? "Popover 열림 — 외부 action 사용 가능" : "Popover 닫힘 — 외부 action 사용 가능"}
        </dd>
        <dt>마지막 결과</dt>
        <dd data-testid="popover-outside-result" style={{ marginInlineStart: 0 }}>
          {outsideActionResult}
        </dd>
      </dl>
      <PopoverUI open={isOpen} onOpenChange={setIsOpen}>
        <PopoverUI.Trigger>Account</PopoverUI.Trigger>
        <PopoverUI.Content side={side}>
          <PopoverUI.Title>Account details</PopoverUI.Title>
          <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
          <label>
            Display name
            <input aria-label="Display name" />
          </label>
          <PopoverUI.Close>Done</PopoverUI.Close>
        </PopoverUI.Content>
      </PopoverUI>
    </div>
  );
};

const meta = {
  component: PopoverExample,
  parameters: {
    docs: {
      description: {
        component:
          "PopoverUI는 trigger anchor에 종속되어 주변 action을 막지 않는 non-modal 보조 surface를 위한 compound family입니다. Root 역할의 PopoverUI에 Trigger, Content, Title, Description, Close part를 조합하며 Content는 portal로 렌더링됩니다. 페이지 나머지와 focus를 격리해야 하는 modal 흐름에는 semantic sibling인 DialogUI를 선택하며, 두 family가 서로를 구현에 사용하지는 않습니다.",
      },
    },
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "UI/Primitives/PopoverUI",
} satisfies Meta<typeof PopoverExample>;

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
};

export const Open: Story = {
  args: { defaultOpen: true },
  parameters: {
    docs: {
      description: {
        story:
          "anchor 아래에 non-modal surface가 열린 상태입니다. 초기 focus는 입력으로 이동하지만 외부 영역을 격리하지 않으며, Canvas의 현재 상태가 Outside action 사용 가능 여부를 보여 줍니다.",
      },
    },
  },
};

export const Placement: Story = {
  args: { defaultOpen: true, side: "right" },
  parameters: {
    docs: {
      description: {
        story:
          "같은 compound part를 유지하면서 Content를 anchor 오른쪽에 배치한 상태입니다. placement만 달라지고 non-modal 외부 action 계약은 그대로입니다.",
      },
    },
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

export const ReducedMotion: Story = {
  args: { defaultOpen: true },
  parameters: {
    docs: {
      description: {
        story:
          "reduced-motion 환경에서 열린 non-modal surface입니다. Content의 transition duration이 0초가 되는 것을 관찰하며 anchor, portal과 외부 action 의미는 유지됩니다.",
      },
    },
  },
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

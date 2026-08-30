import { useRef, useState } from "react";

import { Delete16Regular, Open16Regular, Rename16Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ButtonUI } from "../button";
import { MenuUI } from "../menu";
import { ContextMenuUI } from "./index";

type ActionParts = Pick<typeof MenuUI, "Item" | "Separator">;

const SharedVisibleActionPath = ({ parts }: { parts: ActionParts }) => (
  <>
    <parts.Item>Open</parts.Item>
    <parts.Item disabled>Unavailable</parts.Item>
    <parts.Separator />
    <parts.Item variant="danger">Delete</parts.Item>
  </>
);

const VisibleEntryPointsFixture = () => (
  <main className="wd-story-stage wd-story-stack--loose">
    <section>
      <h2>항상 보이는 Menu 버튼</h2>
      <p>미리 발견할 수 있는 Actions 버튼을 눌러 action 목록을 여세요.</p>
      <MenuUI.Root>
        <MenuUI.Trigger>Actions</MenuUI.Trigger>
        <MenuUI.Content aria-label="Visible menu actions">
          <SharedVisibleActionPath parts={MenuUI} />
        </MenuUI.Content>
      </MenuUI.Root>
    </section>
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger className="wd-story-target">
        이 대상의 보조 action은 마우스 오른쪽 클릭 또는 길게 누르기로 여세요. 위 Menu와 Open,
        Unavailable, Delete라는 같은 action 의미를 제공하지만 호출 방식은 다릅니다. 이 Story는
        비교를 위해 action fixture만 공유하며 ContextMenuUI의 production 구현이 MenuUI를 직접
        사용하는 것은 아닙니다.
      </ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="Context actions">
        <SharedVisibleActionPath parts={ContextMenuUI} />
      </ContextMenuUI.Content>
    </ContextMenuUI.Root>
  </main>
);

const SubmenuFixture = () => (
  <ContextMenuUI.Root>
    <ContextMenuUI.Trigger className="wd-story-stage wd-story-target">
      Right-click for sharing actions
    </ContextMenuUI.Trigger>
    <ContextMenuUI.Content aria-label="Context sharing actions">
      <ContextMenuUI.Item>Copy link</ContextMenuUI.Item>
      <ContextMenuUI.Submenu.Root>
        <ContextMenuUI.Submenu.Trigger>Send to</ContextMenuUI.Submenu.Trigger>
        <ContextMenuUI.Submenu.Content aria-label="Context send submenu">
          <ContextMenuUI.Item>Email</ContextMenuUI.Item>
          <ContextMenuUI.Item>Messages</ContextMenuUI.Item>
        </ContextMenuUI.Submenu.Content>
      </ContextMenuUI.Submenu.Root>
    </ContextMenuUI.Content>
  </ContextMenuUI.Root>
);

const ControlledReplacementFixture = () => {
  const [activeMenu, setActiveMenu] = useState<"first" | "second" | null>(null);
  const restoreFocusRef = useRef<HTMLButtonElement>(null);

  const setMenuOpen = (menu: "first" | "second", open: boolean) => {
    setActiveMenu((current) => (open ? menu : current === menu ? null : current));
  };

  return (
    <div className="wd-story-stage wd-story-stack">
      <p aria-live="polite" role="status">
        현재 메뉴:{" "}
        {activeMenu === "first" ? "첫 번째" : activeMenu === "second" ? "두 번째" : "닫힘"}
      </p>
      <ButtonUI ref={restoreFocusRef}>Pre-replacement focus</ButtonUI>
      <ContextMenuUI.Root
        onOpenChange={(open) => setMenuOpen("first", open)}
        open={activeMenu === "first"}
      >
        <ContextMenuUI.Trigger>First surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="First actions" finalFocus={restoreFocusRef}>
          <ContextMenuUI.Item>First action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
      <ContextMenuUI.Root
        onOpenChange={(open) => setMenuOpen("second", open)}
        open={activeMenu === "second"}
      >
        <ContextMenuUI.Trigger>Second surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="Second actions" finalFocus={restoreFocusRef}>
          <ContextMenuUI.Item>Second action</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>
    </div>
  );
};

const ExistingDesktopTargetActionsFixture = () => (
  <ContextMenuUI.Root>
    <ContextMenuUI.Trigger className="wd-story-stage wd-story-target" tabIndex={0}>
      Existing Desktop target: Portfolio
    </ContextMenuUI.Trigger>
    <ContextMenuUI.Content aria-label="Portfolio target-specific context actions">
      <ContextMenuUI.Item icon={<Open16Regular />} trailing="Enter">
        Open
      </ContextMenuUI.Item>
      <ContextMenuUI.Item icon={<Rename16Regular />} trailing="F2">
        Rename
      </ContextMenuUI.Item>
      <ContextMenuUI.Separator />
      <ContextMenuUI.Item icon={<Delete16Regular />} trailing="Del" variant="danger">
        Delete
      </ContextMenuUI.Item>
    </ContextMenuUI.Content>
  </ContextMenuUI.Root>
);

const meta = {
  title: "UI/Primitives/ContextMenuUI",
  component: ContextMenuUI.Root,
  subcomponents: {
    Trigger: ContextMenuUI.Trigger,
    Content: ContextMenuUI.Content,
    Item: ContextMenuUI.Item,
    CheckboxItem: ContextMenuUI.CheckboxItem,
    RadioGroup: ContextMenuUI.RadioGroup,
    RadioItem: ContextMenuUI.RadioItem,
    Separator: ContextMenuUI.Separator,
    "Submenu.Root": ContextMenuUI.Submenu.Root,
    "Submenu.Trigger": ContextMenuUI.Submenu.Trigger,
    "Submenu.Content": ContextMenuUI.Submenu.Content,
  },
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "상태: Existing. 무엇: ContextMenuUI는 특정 target에서만 제공하는 보조 action 목록입니다. 언제: 오른쪽 클릭·keyboard·long press로 target-specific action을 호출할 때 사용하고, Desktop View·Sort처럼 미리 발견해야 하는 action은 visible Trigger의 MenuUI를 선택합니다. 구조: Root 안에 호출 영역 Trigger와 Content를 두고 Item, CheckboxItem, RadioGroup·RadioItem, Separator와 Submenu를 조합하며 각 Item은 consumer가 주입하는 icon·label·trailing을 분리해 표시합니다. 동작: family가 28px row density, open/dismiss, roving focus, disabled/selected 상태, focus 복원과 호출 좌표 배치를 제공합니다. consumer 입력: target, action 이름, icon, shortcut·상태 trailing, 선택 상태와 callbacks입니다. 비소유: 권한, 명령 실행, 라우팅과 제품별 목록 조립은 소유하지 않습니다. 제품 reference: Existing target-specific context action 경로이며 Shell이 target context, section 구성, 전역 single-active 교체와 Action Gateway 실행을 소유합니다.",
      },
    },
  },
} satisfies Meta<typeof ContextMenuUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const VisibleMenuAndContextEntryPoints: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "같은 Open·Unavailable·Delete action 의미를 두 entry point로 비교합니다. Menu는 항상 보이는 Actions 버튼으로 열고, ContextMenu는 대상 위에서 오른쪽 클릭 또는 길게 누르므로 action은 같아도 발견·호출 방식이 다릅니다.",
      },
    },
  },
  render: () => <VisibleEntryPointsFixture />,
};
export const PointerAndKeyboardInvocation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "대상 위의 오른쪽 클릭과 Shift+F10 keyboard 호출을 차례로 검증합니다. browser play가 ContextMenu item의 실제 28px 높이와 200px Content 폭을 computed style로 확인하고, 첫 목록은 Escape로 닫은 뒤 keyboard로 다시 열어 동일한 contextual action 목록을 Canvas에 남깁니다.",
      },
    },
  },
  render: () => <SubmenuFixture />,
  play: async ({ canvasElement }) => {
    const surface = within(canvasElement).getByText("Right-click for sharing actions");
    const body = within(document.body);

    await userEvent.pointer({ keys: "[MouseRight]", target: surface });
    const menu = await body.findByRole("menu", { name: "Context sharing actions" });
    const item = body.getByRole("menuitem", { name: "Copy link" });
    await waitFor(() => expect(menu).toBeVisible());
    await expect(getComputedStyle(item).height).toBe("28px");
    await expect(getComputedStyle(item).minHeight).toBe("28px");
    await expect(getComputedStyle(menu).minWidth).toBe("200px");
    await userEvent.keyboard("{Escape}");

    surface.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await waitFor(() =>
      expect(body.getByRole("menu", { name: "Context sharing actions" })).toBeVisible(),
    );
  },
};
export const Submenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "ContextMenu Content 안에서 Send to Submenu를 조합한 기본 상태입니다. 대상의 contextual 목록을 연 뒤 계층 action으로 이동하면 Email과 Messages가 중첩 목록에 나타납니다.",
      },
    },
  },
  render: () => <SubmenuFixture />,
};
export const ControlledReplacement: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "두 controlled ContextMenu 중 새 대상을 호출하면 기존 목록을 닫고 새 목록으로 교체합니다. Canvas status가 첫 번째→두 번째→닫힘 이력을 보여 주며, 마지막 Escape 뒤 focus는 교체 전 버튼으로 복원됩니다.",
      },
    },
  },
  render: () => <ControlledReplacementFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const restoreFocus = canvas.getByRole("button", { name: "Pre-replacement focus" });
    const status = canvas.getByRole("status");

    restoreFocus.focus();
    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByText("First surface"),
    });
    await waitFor(() => expect(page.getByRole("menu", { name: "First actions" })).toBeVisible());
    await expect(status).toHaveTextContent("현재 메뉴: 첫 번째");

    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByText("Second surface"),
    });
    await waitFor(() => expect(page.getByRole("menu", { name: "Second actions" })).toBeVisible());
    await expect(status).toHaveTextContent("현재 메뉴: 두 번째");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "First actions" })).not.toBeInTheDocument(),
    );

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Second actions" })).not.toBeInTheDocument(),
    );
    await expect(restoreFocus).toHaveFocus();
    await expect(status).toHaveTextContent("현재 메뉴: 닫힘");
  },
};
export const ExistingDesktopTargetSpecificContextActions: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Existing Desktop target의 Open·Rename·Delete context action 경로를 최소 구성으로 보여 줍니다. icon과 shortcut fixture는 consumer가 ReactNode로 주입하며 ContextMenu family가 28px row 안의 label과 분리해 표시합니다. 실제 target 해석, section 결정, single-active 교체와 Action Gateway 실행은 Shell 책임입니다.",
      },
    },
  },
  render: () => <ExistingDesktopTargetActionsFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByText("Existing Desktop target: Portfolio"),
    });
    const openItem = await page.findByRole("menuitem", { name: "Open" });
    const icon = openItem.querySelector<HTMLElement>(".wd-context-menu-ui__item-icon");
    const label = openItem.querySelector<HTMLElement>(".wd-context-menu-ui__item-label");
    const trailing = openItem.querySelector<HTMLElement>(".wd-context-menu-ui__item-trailing");

    await expect(getComputedStyle(openItem).height).toBe("28px");
    await expect(getComputedStyle(openItem).minHeight).toBe("28px");
    await expect(icon?.getAttribute("aria-hidden")).toBe("true");
    await expect(trailing?.getAttribute("aria-hidden")).toBe("true");
    await expect(
      (icon?.getBoundingClientRect().right ?? 0) <= (label?.getBoundingClientRect().left ?? 0),
    ).toBe(true);
    await expect(
      (label?.getBoundingClientRect().right ?? 0) <= (trailing?.getBoundingClientRect().left ?? 0),
    ).toBe(true);
  },
};
export const TouchLongPress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "touchstart를 유지해 길게 누르기 임계값을 넘기면 대상 위치에 contextual action 목록이 열립니다. touchend 뒤에도 열린 목록이 Canvas에 남아 long-press 결과를 확인할 수 있습니다.",
      },
    },
  },
  render: () => <SubmenuFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const surface = canvas.getByText("Right-click for sharing actions");

    const touchStart = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, "touches", {
      value: [{ clientX: 32, clientY: 32, identifier: 1, target: surface }],
    });
    surface.dispatchEvent(touchStart);

    await waitFor(
      () => expect(page.getByRole("menu", { name: "Context sharing actions" })).toBeVisible(),
      { timeout: 1200 },
    );
    surface.dispatchEvent(new Event("touchend", { bubbles: true, cancelable: true }));
  },
};
export const NarrowViewport: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "좁은 mobile viewport에서 Menu 버튼과 ContextMenu 대상의 두 entry point를 비교합니다. 같은 action 의미와 서로 다른 호출 방식이 작은 화면에서도 유지되는지 확인합니다.",
      },
    },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <VisibleEntryPointsFixture />,
};

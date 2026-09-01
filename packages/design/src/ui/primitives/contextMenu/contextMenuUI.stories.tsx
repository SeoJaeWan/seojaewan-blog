import { useRef, useState } from "react";

import { Delete16Regular, Open16Regular, Rename16Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";

import { ButtonUI } from "../button";
import { MenuUI } from "../menu";
import { ContextMenuUI } from "./index";

type ActionParts = Pick<typeof MenuUI, "Item" | "Separator">;

const SharedVisibleActionPath = ({
  onAction,
  parts,
}: {
  onAction: (action: string) => void;
  parts: ActionParts;
}) => (
  <>
    <parts.Item onClick={() => onAction("Open")}>Open</parts.Item>
    <parts.Item disabled>Unavailable</parts.Item>
    <parts.Separator />
    <parts.Item onClick={() => onAction("Delete")} variant="danger">
      Delete
    </parts.Item>
  </>
);

const VisibleEntryPointsFixture = () => {
  const [menuResult, setMenuResult] = useState("선택 전");
  const [contextResult, setContextResult] = useState("선택 전");

  return (
    <main className="wd-story-stage wd-story-stack--loose">
      <section>
        <h2>항상 보이는 Menu control</h2>
        <p>자주 쓰는 작업은 화면에 보이는 Actions 버튼에서 시작합니다.</p>
        <output aria-label="Visible Menu 실행 결과">실행 결과: {menuResult}</output>
        <MenuUI.Root>
          <MenuUI.Trigger>Actions</MenuUI.Trigger>
          <MenuUI.Content aria-label="Visible menu actions">
            <SharedVisibleActionPath onAction={setMenuResult} parts={MenuUI} />
          </MenuUI.Content>
        </MenuUI.Root>
      </section>
      <section>
        <h2>대상에서 여는 ContextMenu</h2>
        <p>Portfolio 바로가기 위에서 오른쪽 클릭하거나 길게 눌러 보조 작업을 엽니다.</p>
        <output aria-label="ContextMenu 실행 결과">실행 결과: {contextResult}</output>
        <ContextMenuUI.Root>
          <ContextMenuUI.Trigger
            aria-label="Portfolio 바로가기"
            className="wd-story-target"
            tabIndex={0}
          >
            Portfolio 바로가기
          </ContextMenuUI.Trigger>
          <ContextMenuUI.Content aria-label="Context actions">
            <SharedVisibleActionPath onAction={setContextResult} parts={ContextMenuUI} />
          </ContextMenuUI.Content>
        </ContextMenuUI.Root>
      </section>
    </main>
  );
};

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

const longKoreanContextLabel =
  "선택한 바로가기를 새 창에서 열고 모든 공동 작업자에게 바로 공유하는 매우 긴 작업";
const longUnbrokenContextLabel =
  "OpenTheSelectedShortcutInANewWindowAndShareItWithEveryCollaboratorImmediately";
const longUrlContextLabel =
  "https://example.com/desktop/shortcuts/portfolio/very-long-resource-name-without-breaks";

const ViewportBoundContextFixture = () => (
  <div
    className="wd-story-stage"
    style={{
      boxSizing: "border-box",
      display: "flex",
      inlineSize: "100%",
      justifyContent: "flex-end",
    }}
  >
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger
        aria-label="Viewport context target"
        className="wd-story-target"
        style={{ inlineSize: "10rem" }}
        tabIndex={0}
      >
        Right-click near the edge
      </ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="Viewport-bound context menu">
        <ContextMenuUI.Item icon={<Open16Regular />} trailing="Ctrl+Shift+K">
          {longKoreanContextLabel}
        </ContextMenuUI.Item>
        <ContextMenuUI.Submenu.Root>
          <ContextMenuUI.Submenu.Trigger trailing="Shift+F10">
            {longUnbrokenContextLabel}
          </ContextMenuUI.Submenu.Trigger>
          <ContextMenuUI.Submenu.Content aria-label="Viewport-bound context submenu">
            <ContextMenuUI.Item icon={<Open16Regular />} trailing="Alt+Enter">
              {longUrlContextLabel}
            </ContextMenuUI.Item>
          </ContextMenuUI.Submenu.Content>
        </ContextMenuUI.Submenu.Root>
      </ContextMenuUI.Content>
    </ContextMenuUI.Root>
  </div>
);

const expectContextSurfaceInsideViewport = async (surface: HTMLElement) => {
  const documentElement = surface.ownerDocument.documentElement;
  const viewportWidth = documentElement.clientWidth;
  const rect = surface.getBoundingClientRect();

  await expect(rect.left).toBeGreaterThanOrEqual(7);
  await expect(rect.right).toBeLessThanOrEqual(viewportWidth - 7);
  await expect(rect.width).toBeLessThanOrEqual(viewportWidth - 16);
  await expect(documentElement.scrollWidth).toBeLessThanOrEqual(viewportWidth);
};

const expectContextEllipsisAndSlots = async (item: HTMLElement) => {
  const label = item.querySelector<HTMLElement>(".wd-menu-ui__item-label");
  const trailing = item.querySelector<HTMLElement>(".wd-menu-ui__item-trailing");

  if (!label || !trailing) {
    throw new Error("Expected the context menu item label and trailing slots");
  }

  const itemRect = item.getBoundingClientRect();
  const trailingRect = trailing.getBoundingClientRect();

  await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
  await expect(getComputedStyle(label).textOverflow).toBe("ellipsis");
  await expect(getComputedStyle(trailing).flexShrink).toBe("0");
  await expect(trailingRect.width).toBeGreaterThan(0);
  await expect(trailingRect.right).toBeLessThanOrEqual(itemRect.right);
};

const PlacementMotionFixture = () => (
  <div
    className="wd-story-stage"
    style={{ display: "grid", gap: "240px", minHeight: "560px", padding: "80px" }}
  >
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger aria-label="Bottom placement target" tabIndex={0}>
        Bottom placement target
      </ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="Bottom reveal actions" side="bottom">
        <ContextMenuUI.Item>Bottom action</ContextMenuUI.Item>
      </ContextMenuUI.Content>
    </ContextMenuUI.Root>
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger aria-label="Top placement target" tabIndex={0}>
        Top placement target
      </ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="Top reveal actions" side="top">
        <ContextMenuUI.Item>Top action</ContextMenuUI.Item>
      </ContextMenuUI.Content>
    </ContextMenuUI.Root>
  </div>
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

const onDesktopTargetAction = fn();

type ExistingDesktopTargetActionsFixtureProps = {
  headingId?: string;
  menuLabel?: string;
  resultLabel?: string;
  targetLabel?: string;
};

const ExistingDesktopTargetActionsFixture = ({
  headingId = "portfolio-target-title",
  menuLabel = "Portfolio target-specific context actions",
  resultLabel = "Desktop Portfolio 작업 실행 결과",
  targetLabel = "Portfolio Desktop 대상",
}: ExistingDesktopTargetActionsFixtureProps = {}) => {
  const [result, setResult] = useState("선택 전");

  const runAction = (action: string) => {
    setResult(action);
    onDesktopTargetAction(action);
  };

  return (
    <main className="wd-story-stage">
      <article
        className="wd-story-reference"
        data-product-state="existing"
        data-product-surface="existing-desktop-target-actions"
      >
        <p className="wd-story-reference__badge">제품 예시 · 기존 Desktop 대상</p>
        <div className="wd-story-reference__layout">
          <section aria-labelledby={headingId} className="wd-story-reference__frame">
            <h2 className="wd-story-reference__heading" id={headingId}>
              Portfolio 바로가기
            </h2>
            <p>오른쪽 클릭, Shift+F10 또는 길게 누르기로 이 대상의 보조 작업을 엽니다.</p>
            <ContextMenuUI.Root>
              <ContextMenuUI.Trigger
                aria-label={targetLabel}
                className="wd-story-target"
                tabIndex={0}
              >
                Portfolio
              </ContextMenuUI.Trigger>
              <ContextMenuUI.Content aria-label={menuLabel}>
                <ContextMenuUI.Item
                  icon={<Open16Regular />}
                  onClick={() => runAction("Portfolio 열기")}
                  trailing="Enter"
                >
                  Open
                </ContextMenuUI.Item>
                <ContextMenuUI.Item
                  icon={<Rename16Regular />}
                  onClick={() => runAction("Portfolio 이름 바꾸기")}
                  trailing="F2"
                >
                  Rename
                </ContextMenuUI.Item>
                <ContextMenuUI.Separator />
                <ContextMenuUI.Item
                  icon={<Delete16Regular />}
                  onClick={() => runAction("Portfolio 삭제")}
                  trailing="Del"
                  variant="danger"
                >
                  Delete
                </ContextMenuUI.Item>
              </ContextMenuUI.Content>
            </ContextMenuUI.Root>
            <output aria-label={resultLabel}>{result}</output>
          </section>
          <p className="wd-story-reference__note">
            ContextMenu는 선택한 Desktop 대상에만 필요한 보조 작업을 보여 줍니다. 실행 결과는 이
            fixture 안에만 남으며 실제 파일이나 route는 바꾸지 않습니다.
          </p>
        </div>
      </article>
    </main>
  );
};

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
          "### 무엇이며 어디에 쓰나요?\nContextMenuUI는 특정 대상에서만 필요한 보조 작업 목록입니다. Desktop 바로가기처럼 먼저 대상을 고른 뒤 오른쪽 클릭, Shift+F10 또는 길게 누르는 맥락에 사용합니다. 화면에서 먼저 발견해야 하는 보기·정렬 작업에는 visible trigger의 MenuUI를 사용합니다.\n\n### 제품에서는 어떻게 보이나요?\n기준 제품은 **기존 Desktop의 Portfolio 바로가기**이며 production Taskbar에서는 TaskbarContextMenuUI가 이 Primitive를 조합합니다. pointer·keyboard와 long-press Story에서 호출 방식과 local 실행 결과를 확인할 수 있습니다.\n\n### 어떤 상태와 구성을 확인하나요?\nRoot에 호출 대상 Trigger와 Content를 두고 Item, CheckboxItem, RadioGroup·RadioItem, Separator와 Submenu를 조합합니다. 열림과 닫힘, roving focus, 비활성·선택 상태, submenu, dismiss와 focus 복원을 확인합니다.\n\n### 누가 무엇을 맡나요?\nContextMenuUI는 target invocation, open·dismiss, focus와 keyboard mechanics를 맡습니다. Taskbar family는 widget-local lifecycle을, headless는 target·section·entry와 제품 action을 소유하며 Application이 selection callback을 연결합니다.",
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
          "같은 Open·Unavailable·Delete 작업을 서로 다른 제품 맥락에서 비교합니다. Menu는 항상 보이는 Actions 버튼에서 시작하고, ContextMenu는 Portfolio 바로가기를 오른쪽 클릭하거나 길게 눌러 시작합니다. 선택한 결과는 각 entry point 아래에 따로 남습니다.",
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
          "첫 Portfolio Desktop 대상은 오른쪽 클릭으로 열고 Escape로 닫습니다. 이어 독립된 Portfolio 대상에서 Shift+F10으로 목록을 열고 keyboard로 Open을 실행하면 callback이 한 번 호출되며 local 결과가 ‘Portfolio 열기’로 바뀝니다.",
      },
    },
  },
  render: () => (
    <div className="wd-story-stack--loose">
      <ExistingDesktopTargetActionsFixture
        headingId="portfolio-pointer-target-title"
        menuLabel="Portfolio pointer context actions"
        resultLabel="Portfolio pointer 작업 실행 결과"
        targetLabel="Portfolio pointer 대상"
      />
      <ExistingDesktopTargetActionsFixture
        headingId="portfolio-keyboard-target-title"
        menuLabel="Portfolio keyboard context actions"
        resultLabel="Portfolio keyboard 작업 실행 결과"
        targetLabel="Portfolio keyboard 대상"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    onDesktopTargetAction.mockClear();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const pointerSurface = canvas.getByLabelText("Portfolio pointer 대상");
    const keyboardSurface = canvas.getByLabelText("Portfolio keyboard 대상");
    const result = canvas.getByRole("status", { name: "Portfolio keyboard 작업 실행 결과" });

    await userEvent.pointer({ keys: "[MouseRight]", target: pointerSurface });
    const menu = await page.findByRole("menu", {
      name: "Portfolio pointer context actions",
    });
    const item = page.getByRole("menuitem", { name: "Open" });
    await waitFor(() => expect(menu).toBeVisible());
    await expect(getComputedStyle(item).height).toBe("28px");
    await expect(getComputedStyle(item).minHeight).toBe("28px");
    await expect(getComputedStyle(menu).minWidth).toBe("200px");
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        page.queryByRole("menu", { name: "Portfolio pointer context actions" }),
      ).not.toBeInTheDocument(),
    );

    keyboardSurface.focus();
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await fireEvent.contextMenu(keyboardSurface);
    const reopenedMenu = await page.findByRole("menu", {
      name: "Portfolio keyboard context actions",
    });
    await waitFor(() => expect(reopenedMenu).toBeVisible());
    const openAction = within(reopenedMenu).getByRole("menuitem", { name: "Open" });
    openAction.focus();
    await userEvent.keyboard("{Enter}");
    await expect(onDesktopTargetAction).toHaveBeenCalledOnce();
    await expect(onDesktopTargetAction).toHaveBeenCalledWith("Portfolio 열기");
    await expect(result).toHaveTextContent("Portfolio 열기");
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
export const PlacementAwareOpeningReveal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Base UI가 충돌 회피까지 반영해 Content에 기록한 실제 top/bottom side로 160ms opening reveal 방향을 정합니다. 같은 browser play가 legacy easing, reduced motion, 200px surface, 28px row와 Escape dismiss를 함께 확인합니다.",
      },
    },
  },
  render: () => <PlacementMotionFixture />,
  play: async ({ canvasElement }) => {
    const { cdp } = await import("vitest/browser");
    const session = cdp();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);

    const inspectStartingDirection = async (
      targetName: string,
      menuName: string,
      expectedSide: "bottom" | "top",
    ) => {
      await userEvent.pointer({
        keys: "[MouseRight]",
        target: canvas.getByLabelText(targetName),
      });
      const menu = await page.findByRole("menu", { name: menuName });
      await expect(menu).toHaveAttribute("data-side", expectedSide);
      await waitFor(() =>
        expect(getComputedStyle(menu).transitionProperty).toBe("clip-path, opacity"),
      );

      menu.setAttribute("data-starting-style", "");
      const style = getComputedStyle(menu);
      await expect(style.transitionProperty).toBe("clip-path, opacity");
      await expect(style.transitionDuration).toBe("0.16s, 0.16s");
      await expect(style.transitionTimingFunction).toBe(
        "cubic-bezier(0.22, 1, 0.36, 1), cubic-bezier(0.22, 1, 0.36, 1)",
      );
      await expect(style.clipPath).toBe(
        expectedSide === "bottom" ? "inset(0px 0px 100%)" : "inset(100% 0px 0px)",
      );
      await expect(style.minWidth).toBe("200px");
      await expect(getComputedStyle(within(menu).getByRole("menuitem")).height).toBe("28px");
      menu.removeAttribute("data-starting-style");

      await userEvent.keyboard("{Escape}");
      await waitFor(() =>
        expect(page.queryByRole("menu", { name: menuName })).not.toBeInTheDocument(),
      );
    };

    await inspectStartingDirection("Bottom placement target", "Bottom reveal actions", "bottom");
    await inspectStartingDirection("Top placement target", "Top reveal actions", "top");

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      await userEvent.pointer({
        keys: "[MouseRight]",
        target: canvas.getByLabelText("Bottom placement target"),
      });
      const reducedMenu = await page.findByRole("menu", { name: "Bottom reveal actions" });
      reducedMenu.setAttribute("data-starting-style", "");
      await expect(getComputedStyle(reducedMenu).transitionDuration).toBe("0s");
      reducedMenu.removeAttribute("data-starting-style");
      reducedMenu.setAttribute("data-ending-style", "");
      await expect(getComputedStyle(reducedMenu).transitionDuration).toBe("0s");
      reducedMenu.removeAttribute("data-ending-style");
      await userEvent.keyboard("{Escape}");
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  },
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
  name: "제품 예시 — 기존 Desktop 대상 작업",
  parameters: {
    docs: {
      description: {
        story:
          "기존 Desktop의 Portfolio 바로가기에서 Open·Rename·Delete 보조 작업을 호출합니다. ContextMenuUI는 target invocation과 목록의 open·focus·dismiss mechanics를 맡고, fixture는 선택 결과를 local 상태로 남깁니다. 실제 target·section·entry는 headless가 계산하고 Application이 action 실행을 연결합니다.",
      },
    },
  },
  render: () => <ExistingDesktopTargetActionsFixture />,
  play: async ({ canvasElement }) => {
    onDesktopTargetAction.mockClear();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const result = canvas.getByRole("status", { name: "Desktop Portfolio 작업 실행 결과" });

    await userEvent.pointer({
      keys: "[MouseRight]",
      target: canvas.getByLabelText("Portfolio Desktop 대상"),
    });
    await userEvent.click(await page.findByRole("menuitem", { name: "Rename" }));

    await expect(onDesktopTargetAction).toHaveBeenCalledOnce();
    await expect(onDesktopTargetAction).toHaveBeenCalledWith("Portfolio 이름 바꾸기");
    await expect(result).toHaveTextContent("Portfolio 이름 바꾸기");
  },
};
export const TouchLongPress: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Portfolio Desktop 대상의 touchstart를 유지해 길게 누르기 임계값을 넘기면 같은 보조 작업 목록이 열립니다. touchend 뒤에도 목록이 열린 상태로 남아 pointer·keyboard와 구별되는 호출 결과를 확인할 수 있습니다.",
      },
    },
  },
  render: () => <ExistingDesktopTargetActionsFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const surface = canvas.getByLabelText("Portfolio Desktop 대상");

    const touchStart = new Event("touchstart", { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, "touches", {
      value: [{ clientX: 32, clientY: 32, identifier: 1, target: surface }],
    });
    surface.dispatchEvent(touchStart);

    await waitFor(
      () =>
        expect(
          page.getByRole("menu", { name: "Portfolio target-specific context actions" }),
        ).toBeVisible(),
      { timeout: 1200 },
    );
    surface.dispatchEvent(new Event("touchend", { bubbles: true, cancelable: true }));
  },
};
export const IntrinsicViewportBoundary: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "긴 한국어·공백 없는 영문·URL action과 shortcut·submenu indicator를 좁은 viewport 오른쪽 가장자리에서 검증합니다. ContextMenu surface는 호출 target 폭을 따르지 않고 intrinsic 폭을 유지하되 available viewport 안에서 label만 ellipsis 됩니다.",
      },
    },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <ViewportBoundContextFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const target = canvas.getByLabelText("Viewport context target");

    await userEvent.pointer({ keys: "[MouseRight]", target });
    const menu = await page.findByRole("menu", { name: "Viewport-bound context menu" });
    await waitFor(() => expect(menu).toBeVisible());
    await expectContextSurfaceInsideViewport(menu);
    await expect(
      Math.abs(menu.getBoundingClientRect().width - target.getBoundingClientRect().width),
    ).toBeGreaterThan(1);

    const koreanItem = page.getByRole("menuitem", { name: longKoreanContextLabel });
    await expectContextEllipsisAndSlots(koreanItem);

    const submenuTrigger = page.getByRole("menuitem", { name: longUnbrokenContextLabel });
    await expectContextEllipsisAndSlots(submenuTrigger);
    const submenuArrow = submenuTrigger.querySelector<HTMLElement>(
      ".wd-context-menu-ui__submenu-trigger-arrow",
    );
    if (!submenuArrow) {
      throw new Error("Expected the context submenu indicator slot");
    }
    await expect(getComputedStyle(submenuArrow).flexShrink).toBe("0");

    koreanItem.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(submenuTrigger).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    const submenu = await page.findByRole("menu", {
      name: "Viewport-bound context submenu",
    });
    const urlItem = await page.findByRole("menuitem", { name: longUrlContextLabel });
    await expect(urlItem).toHaveFocus();
    await expectContextSurfaceInsideViewport(submenu);
    await expectContextEllipsisAndSlots(urlItem);

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        page.queryByRole("menu", { name: "Viewport-bound context submenu" }),
      ).not.toBeInTheDocument(),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        page.queryByRole("menu", { name: "Viewport-bound context menu" }),
      ).not.toBeInTheDocument(),
    );
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

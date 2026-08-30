import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ButtonUI } from "../button";
import { MenuUI } from "./index";

const StoryFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="wd-story-stage">{children}</div>
);

const EmptyFixture = () => (
  <StoryFrame>
    <MenuUI.Root>
      <MenuUI.Trigger>Empty menu</MenuUI.Trigger>
      <MenuUI.Content aria-label="Empty menu">
        <MenuUI.Item disabled>No actions available</MenuUI.Item>
      </MenuUI.Content>
    </MenuUI.Root>
  </StoryFrame>
);

const SingleFixture = () => (
  <StoryFrame>
    <MenuUI.Root>
      <MenuUI.Trigger>Single action</MenuUI.Trigger>
      <MenuUI.Content aria-label="Single action menu">
        <MenuUI.Item>Open</MenuUI.Item>
      </MenuUI.Content>
    </MenuUI.Root>
  </StoryFrame>
);

const MultipleStatesFixture = () => {
  const [selected, setSelected] = useState(true);
  const [density, setDensity] = useState("comfortable");

  return (
    <StoryFrame>
      <p role="status">
        현재 선택: 옵션 {selected ? "켬" : "끔"} · 밀도{" "}
        {density === "compact" ? "좁게" : "편안하게"}
      </p>
      <MenuUI.Root>
        <MenuUI.Trigger>Multiple actions</MenuUI.Trigger>
        <MenuUI.Content aria-label="Multiple action states">
          <MenuUI.Item>Open</MenuUI.Item>
          <MenuUI.Item disabled>Unavailable</MenuUI.Item>
          <MenuUI.CheckboxItem checked={selected} onCheckedChange={setSelected}>
            Selected option
          </MenuUI.CheckboxItem>
          <MenuUI.RadioGroup onValueChange={setDensity} value={density}>
            <MenuUI.RadioItem value="compact">Compact</MenuUI.RadioItem>
            <MenuUI.RadioItem value="comfortable">Comfortable</MenuUI.RadioItem>
          </MenuUI.RadioGroup>
          <MenuUI.Separator />
          <MenuUI.Item variant="danger">Delete</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>
    </StoryFrame>
  );
};

const SubmenuFixture = () => (
  <StoryFrame>
    <MenuUI.Root>
      <MenuUI.Trigger>Share</MenuUI.Trigger>
      <MenuUI.Content aria-label="Share menu">
        <MenuUI.Item>Copy link</MenuUI.Item>
        <MenuUI.Item disabled>Unavailable</MenuUI.Item>
        <MenuUI.Submenu.Root>
          <MenuUI.Submenu.Trigger>Send to</MenuUI.Submenu.Trigger>
          <MenuUI.Submenu.Content aria-label="Send to submenu">
            <MenuUI.Item>Email</MenuUI.Item>
            <MenuUI.Item>Messages</MenuUI.Item>
          </MenuUI.Submenu.Content>
        </MenuUI.Submenu.Root>
      </MenuUI.Content>
    </MenuUI.Root>
  </StoryFrame>
);

const LifecycleFixture = () => {
  const [open, setOpen] = useState(false);

  return (
    <StoryFrame>
      <p>버튼으로 열림과 닫힘을 전환하며 opening·exiting lifecycle 스타일을 확인하세요.</p>
      <ButtonUI onClick={() => setOpen((value) => !value)}>
        {open ? "닫힘 시작" : "열림 시작"}
      </ButtonUI>
      <output aria-label="Menu lifecycle 결과">현재 lifecycle: {open ? "열림" : "닫힘"}</output>
      <MenuUI.Root onOpenChange={setOpen} open={open}>
        <MenuUI.Trigger>Lifecycle menu</MenuUI.Trigger>
        <MenuUI.Content aria-label="Lifecycle menu" keepMounted>
          <MenuUI.Item>Visible action</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>
    </StoryFrame>
  );
};

const meta = {
  title: "UI/Primitives/MenuUI",
  component: MenuUI.Root,
  subcomponents: {
    Trigger: MenuUI.Trigger,
    Content: MenuUI.Content,
    Item: MenuUI.Item,
    CheckboxItem: MenuUI.CheckboxItem,
    RadioGroup: MenuUI.RadioGroup,
    RadioItem: MenuUI.RadioItem,
    Separator: MenuUI.Separator,
    "Submenu.Root": MenuUI.Submenu.Root,
    "Submenu.Trigger": MenuUI.Submenu.Trigger,
    "Submenu.Content": MenuUI.Submenu.Content,
  },
  tags: ["autodocs"],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "MenuUI는 사용자가 미리 발견할 수 있는 Trigger에서 action 목록을 호출할 때 사용합니다. 특정 대상의 보조 action을 오른쪽 클릭·keyboard·long press로 호출하면 ContextMenuUI를 선택합니다. public Root에 Trigger와 Content를 두고 Content 안에 Item, CheckboxItem, RadioGroup·RadioItem과 Separator를 조합하며 계층 action은 Submenu.Root·Trigger·Content로 구성합니다. open/dismiss, roving focus, disabled/selected 상태와 keyboard 이동·focus 복원은 family가 제공합니다. consumer는 action 이름, 선택 상태와 callbacks을 제공해야 하고, MenuUI는 권한 확인, 명령 실행, 라우팅이나 제품별 목록 구성을 소유하지 않습니다.",
      },
    },
  },
} satisfies Meta<typeof MenuUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "사용 가능한 action이 없는 상태입니다. Trigger를 열면 선택할 수 없는 안내 Item만 보이며 실행 결과는 발생하지 않습니다.",
      },
    },
  },
  render: () => <EmptyFixture />,
};
export const Single: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "하나의 action을 가진 기본 Menu입니다. 항상 보이는 Trigger를 누르면 Open Item이 나타나고, 목록 밖으로 이동하거나 action을 선택하면 닫힙니다.",
      },
    },
  },
  render: () => <SingleFixture />,
};
export const MultipleSelectedDisabledDanger: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "일반·비활성·선택·위험 action을 한 목록에서 비교합니다. Checkbox와 Radio 선택을 바꾸면 현재 선택 상태가 Canvas 상단 status와 각 Item에 함께 반영됩니다.",
      },
    },
  },
  render: () => <MultipleStatesFixture />,
};
export const PointerAndKeyboard: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "같은 visible Trigger를 pointer 클릭과 keyboard ArrowDown으로 호출합니다. browser play가 Content 192px, Item 32px density를 computed style로 확인하고, 클릭으로 연 목록은 Escape로 닫은 뒤 keyboard로 다시 열어 첫 Item focus를 Canvas에 남깁니다.",
      },
    },
  },
  render: () => <SingleFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Single action" });

    await userEvent.click(trigger);
    const item = await page.findByRole("menuitem", { name: "Open" });
    const menu = page.getByRole("menu", { name: "Single action menu" });
    await waitFor(() => expect(item).toBeVisible());
    await expect(getComputedStyle(item).minHeight).toBe("32px");
    await expect(getComputedStyle(menu).minWidth).toBe("192px");
    await userEvent.keyboard("{Escape}");

    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(page.getByRole("menuitem", { name: "Open" })).toHaveFocus());
  },
};
export const Submenu: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "부모 목록의 Submenu.Trigger에서 ArrowRight로 중첩 Content를 엽니다. 비활성 Item도 탐색 순서와 aria-disabled 상태를 유지하며, Escape는 중첩 목록과 부모 목록을 차례로 닫고 focus를 각 Trigger로 복원합니다.",
      },
    },
  },
  render: () => <SubmenuFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Share" });

    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(page.getByRole("menuitem", { name: "Copy link" })).toHaveFocus();

    await userEvent.keyboard("{ArrowDown}");
    const disabled = page.getByRole("menuitem", { name: "Unavailable" });
    await expect(disabled).toHaveFocus();
    await expect(disabled).toHaveAttribute("aria-disabled", "true");

    await userEvent.keyboard("{ArrowDown}");
    const submenuTrigger = page.getByRole("menuitem", { name: "Send to" });
    await expect(submenuTrigger).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");

    const nested = await page.findByRole("menuitem", { name: "Email" });
    await expect(nested).toHaveFocus();
    await waitFor(() => expect(page.getByRole("menu", { name: "Send to submenu" })).toBeVisible());

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Send to submenu" })).not.toBeInTheDocument(),
    );
    await expect(submenuTrigger).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(page.queryByRole("menu", { name: "Share menu" })).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
  },
};
export const OpeningAndExiting: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "controlled open 상태와 keepMounted Content로 opening·exiting lifecycle을 관찰합니다. Canvas 버튼의 문구가 다음 조작을 안내하고, 전환 중에도 동일한 Menu action 구조를 유지합니다.",
      },
    },
  },
  render: () => <LifecycleFixture />,
};
export const NarrowViewport: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "좁은 mobile viewport에서 여러 상태의 Menu를 엽니다. 선택·비활성·위험 Item의 의미와 popup 배치가 작은 화면에서도 유지되는지 확인합니다.",
      },
    },
    viewport: { defaultViewport: "mobile1" },
  },
  render: () => <MultipleStatesFixture />,
};

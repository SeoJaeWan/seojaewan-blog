import { useState } from "react";

import { ArrowSort16Regular, Grid16Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

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

const onViewChange = fn();
const onSortChange = fn();

const ViewAndSortCompositionFixture = () => {
  const [view, setView] = useState("medium");
  const [sort, setSort] = useState("name");
  const [lastAction, setLastAction] = useState("선택 전");

  const changeView = (value: string) => {
    setView(value);
    setLastAction(`보기: ${value}`);
    onViewChange(value);
  };

  const changeSort = (value: string) => {
    setSort(value);
    setLastAction(`정렬: ${value}`);
    onSortChange(value);
  };

  return (
    <StoryFrame>
      <article className="wd-story-reference">
        <p className="wd-story-reference__badge">Menu 조합 예시</p>
        <div className="wd-story-reference__layout">
          <section
            aria-labelledby="view-sort-menu-composition"
            className="wd-story-reference__frame"
          >
            <h2 className="wd-story-reference__heading" id="view-sort-menu-composition">
              보기 및 정렬 Menu
            </h2>
            <dl className="wd-story-reference__probe">
              <dt>보기</dt>
              <dd>{view}</dd>
              <dt>정렬</dt>
              <dd>{sort}</dd>
              <dt>마지막 실행</dt>
              <dd>
                <output aria-label="보기 및 정렬 실행 결과">{lastAction}</output>
              </dd>
            </dl>
            <MenuUI.Root>
              <MenuUI.Trigger>보기 및 정렬</MenuUI.Trigger>
              <MenuUI.Content aria-label="Desktop 보기 및 정렬 작업">
                <MenuUI.Submenu.Root>
                  <MenuUI.Submenu.Trigger icon={<Grid16Regular />} trailing={view}>
                    보기
                  </MenuUI.Submenu.Trigger>
                  <MenuUI.Submenu.Content aria-label="Desktop 보기 작업">
                    <MenuUI.RadioGroup onValueChange={changeView} value={view}>
                      <MenuUI.RadioItem value="large">큰 아이콘</MenuUI.RadioItem>
                      <MenuUI.RadioItem value="medium">보통 아이콘</MenuUI.RadioItem>
                      <MenuUI.RadioItem value="small">작은 아이콘</MenuUI.RadioItem>
                    </MenuUI.RadioGroup>
                  </MenuUI.Submenu.Content>
                </MenuUI.Submenu.Root>
                <MenuUI.Submenu.Root>
                  <MenuUI.Submenu.Trigger icon={<ArrowSort16Regular />} trailing={sort}>
                    정렬 기준
                  </MenuUI.Submenu.Trigger>
                  <MenuUI.Submenu.Content aria-label="Desktop 정렬 작업">
                    <MenuUI.RadioGroup onValueChange={changeSort} value={sort}>
                      <MenuUI.RadioItem value="name">이름</MenuUI.RadioItem>
                      <MenuUI.RadioItem value="updated">수정한 날짜</MenuUI.RadioItem>
                    </MenuUI.RadioGroup>
                  </MenuUI.Submenu.Content>
                </MenuUI.Submenu.Root>
              </MenuUI.Content>
            </MenuUI.Root>
          </section>
          <p className="wd-story-reference__note">
            이 fixture는 visible trigger, submenu와 선택 결과의 generic Menu 계약만 보여 줍니다.
            현재 repository에 근거가 없는 Desktop consumer의 existing 상태는 주장하지 않습니다.
          </p>
        </div>
      </article>
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
          "### 무엇이며 어디에 쓰나요?\nMenuUI는 사용자가 화면에서 먼저 발견할 수 있는 trigger에 연결된 작업 목록입니다. 자주 찾는 작업을 visible control에서 열 때 사용하며, 특정 대상에서만 필요한 보조 작업에는 ContextMenuUI를 사용합니다.\n\n### 제품에서는 어떻게 보이나요?\n현재 repository에서는 visible Desktop Menu consumer의 구체적인 legacy source를 확인할 수 없습니다. 따라서 existing 제품 상태를 주장하지 않고, `조합 예시 — 보기 및 정렬 Menu` Story에서 visible trigger, submenu와 선택 결과라는 generic 계약만 확인합니다. icon과 현재 값 trailing은 사용하는 쪽이 slot에 넣습니다.\n\n### 어떤 상태와 구성을 확인하나요?\nRoot에 Trigger와 Content를 두고 Item, CheckboxItem, RadioGroup·RadioItem, Separator와 Submenu를 조합합니다. 32px row density, 열림과 닫힘, roving focus, 비활성·선택 상태, keyboard 이동, submenu와 focus 복원을 확인합니다. 사용하는 쪽은 작업 이름, icon, shortcut·현재 값 trailing, 선택 상태와 callback을 제공합니다.\n\n### 누가 무엇을 맡나요?\nMenuUI는 작업 목록의 semantic parts, open·dismiss, focus와 keyboard mechanics를 맡습니다. Shell은 현재 MenuContext를 해석하고 제품별 section과 순서를 정하며 여러 surface의 single-active 상태를 조정합니다. 권한 확인, 실제 작업 실행과 routing은 Action Gateway를 통해 더 높은 owner가 맡습니다.",
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
export const ViewAndSortComposition: Story = {
  name: "조합 예시 — 보기 및 정렬 Menu",
  parameters: {
    docs: {
      description: {
        story:
          "구체적인 기존 제품 consumer를 주장하지 않는 generic 조합 예시입니다. MenuUI는 visible trigger와 작업 목록의 open·focus·selection mechanics를 맡고, fixture는 선택한 보기와 정렬 값을 local 결과로 남깁니다.",
      },
    },
  },
  render: () => <ViewAndSortCompositionFixture />,
  play: async ({ canvasElement }) => {
    onViewChange.mockClear();
    onSortChange.mockClear();
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const result = canvas.getByRole("status", { name: "보기 및 정렬 실행 결과" });

    await expect(result).toHaveTextContent("선택 전");
    await userEvent.click(canvas.getByRole("button", { name: "보기 및 정렬" }));
    const viewItem = await page.findByRole("menuitem", { name: "보기" });
    viewItem.focus();
    await userEvent.keyboard("{ArrowRight}");
    await userEvent.click(await page.findByRole("menuitemradio", { name: "큰 아이콘" }));

    await expect(onViewChange).toHaveBeenCalledOnce();
    await expect(onViewChange).toHaveBeenCalledWith("large");
    await expect(result).toHaveTextContent("보기: large");
    await expect(onSortChange).not.toHaveBeenCalled();
  },
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

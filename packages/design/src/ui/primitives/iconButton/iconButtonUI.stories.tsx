import { useState } from "react";

import { Add20Regular, Dismiss16Regular, Folder20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { IconButtonUI } from "./index";

const meta = {
  title: "UI/Primitives/IconButtonUI",
  component: IconButtonUI,
  tags: ["autodocs"],
  args: {
    icon: <Add20Regular />,
    label: "Add item",
  },
  parameters: {
    docs: {
      description: {
        component:
          "### What is it?\nIconButtonUI는 제한된 공간에서 제품 아이콘만 보이는 action Primitive이며 필수 `label`을 native button의 accessible name으로 제공합니다.\n\n### Where is the product reference?\n제품 기준은 **Existing Window의 닫기 control**과 **Existing Taskbar의 app control**입니다. `Product Reference — Existing Window and Taskbar` Story가 두 surface의 Existing state를 consumer icon과 작은 local-state probe로 보여 줍니다.\n\n### When should I use it?\n창 닫기나 taskbar app 실행처럼 compact chrome에서 아이콘만으로 표현하는 단일 action에 사용합니다.\n\n### When should I choose something else?\n텍스트나 콘텐츠로 목적을 직접 보여 줄 수 있으면 ButtonUI를 사용합니다. app indicator, window chrome layout, drag 방지와 panel 연결처럼 surface 고유 조합은 더 높은 Window·Taskbar layer가 맡습니다.\n\n### What states and interaction contract matter?\nsm·md·lg size와 default, hover, active, focus-visible, disabled, selected 상태를 제공하며 selected는 `aria-pressed`와 시각 상태를 함께 표현합니다. consumer가 주입한 icon은 장식으로 숨기고 label, native pointer/keyboard activation, ref와 callback 전달을 보존합니다.\n\n### Who owns what?\nPrimitive는 icon-only semantic button, size와 visual/disabled/selected 계약을 소유합니다. Consumer는 제품 icon, 읽을 수 있는 label과 callback을 제공합니다. 창 session 종료, taskbar 실행·선택 상태, 권한 확인과 panel workflow는 higher layer가 소유합니다.",
      },
    },
  },
} satisfies Meta<typeof IconButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "consumer가 public API에 Fluent product icon을 주입한 deterministic size/state 표입니다. sm·md·lg와 default·hover-ready·pressed-testable·disabled·selected를 각각 읽을 수 있고, selected button은 aria-pressed=true로 노출됩니다.",
      },
    },
  },
  render: (args) => (
    <div className="wd-story-stack wd-story-stack--loose">
      <section className="wd-story-stack">
        <h3>Sizes</h3>
        <div className="wd-story-cluster">
          <span>sm</span>
          <IconButtonUI {...args} label="Add item small" size="sm" />
          <span>md</span>
          <IconButtonUI {...args} label="Add item medium" size="md" />
          <span>lg</span>
          <IconButtonUI {...args} label="Add item large" size="lg" />
        </div>
      </section>
      <section className="wd-story-stack">
        <h3>States</h3>
        <div className="wd-story-cluster">
          <span>default</span>
          <IconButtonUI {...args} label="Add item default" />
          <span>hover-ready</span>
          <IconButtonUI {...args} data-testid="icon-button-hover-ready" label="Add item hover" />
          <span>pressed-testable</span>
          <IconButtonUI
            {...args}
            data-testid="icon-button-pressed-testable"
            label="Add item press target"
          />
          <span>disabled</span>
          <IconButtonUI {...args} disabled label="Add item disabled" />
          <span>selected</span>
          <IconButtonUI {...args} label="Add item selected" selected />
        </div>
      </section>
    </div>
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
          "비활성 icon-only action 상태입니다. Canvas에서 accessible name을 유지한 native disabled button과 실행할 수 없음을 확인합니다.",
      },
    },
  },
};

const ExistingWindowTaskbarProductReference = () => {
  const [lastAction, setLastAction] = useState("실행 전");
  const [taskbarSelected, setTaskbarSelected] = useState(false);

  return (
    <div className="wd-story-stage wd-story-stack">
      <section
        className="wd-story-cluster"
        data-product-state="existing"
        data-product-surface="existing-window-control"
      >
        <span>Existing Window · Existing state</span>
        <IconButtonUI
          icon={<Dismiss16Regular />}
          label="창 닫기"
          onClick={() => setLastAction("창 닫기 요청")}
          size="sm"
        />
      </section>
      <section
        className="wd-story-cluster"
        data-product-state="existing"
        data-product-surface="existing-taskbar-control"
      >
        <span>Existing Taskbar · Existing state</span>
        <IconButtonUI
          icon={<Folder20Regular />}
          label="블로그 창 열기"
          onClick={() => {
            setTaskbarSelected((selected) => !selected);
            setLastAction("taskbar app 요청");
          }}
          selected={taskbarSelected}
          size="lg"
        />
      </section>
      <output aria-label="Existing Window와 Taskbar icon-only action 상태">
        마지막 action: {lastAction}
      </output>
    </div>
  );
};

export const ProductReference: Story = {
  name: "Product Reference — Existing Window and Taskbar",
  parameters: {
    docs: {
      description: {
        story:
          "Surfaces: Existing Window close control과 Existing Taskbar app control. Reference state: Existing. Primitive 범위는 consumer가 주입한 icon, accessible label과 native activation까지이며 실제 창 종료, app session 실행, taskbar indicator와 surface layout은 higher layer가 소유합니다.",
      },
    },
  },
  render: () => <ExistingWindowTaskbarProductReference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByRole("button", { name: "창 닫기" });
    const taskbarButton = canvas.getByRole("button", { name: "블로그 창 열기" });
    const status = canvas.getByRole("status", {
      name: "Existing Window와 Taskbar icon-only action 상태",
    });

    await expect(status).toHaveTextContent("마지막 action: 실행 전");
    await userEvent.click(closeButton);
    await expect(status).toHaveTextContent("마지막 action: 창 닫기 요청");
    await userEvent.click(taskbarButton);
    await expect(taskbarButton).toHaveAttribute("aria-pressed", "true");
    await expect(status).toHaveTextContent("마지막 action: taskbar app 요청");
  },
};

const onIconButtonClick = fn();

const IconButtonInteractionFixture = (args: React.ComponentProps<typeof IconButtonUI>) => {
  const [activationCount, setActivationCount] = useState(0);

  return (
    <div>
      <IconButtonUI
        {...args}
        onClick={(event) => {
          args.onClick?.(event);
          setActivationCount((count) => count + 1);
        }}
      />
      <output aria-label="IconButton 실행 횟수">활성화 횟수: {activationCount}</output>
    </div>
  );
};

export const Interaction: Story = {
  args: {
    onClick: onIconButtonClick,
  },
  parameters: {
    docs: {
      description: {
        story:
          "키보드로 icon-only action을 실행하는 상태입니다. Space를 한 번 누르면 callback이 한 번 호출되고 Canvas의 활성화 횟수가 1로 바뀝니다.",
      },
    },
  },
  render: (args) => <IconButtonInteractionFixture {...args} />,
  play: async ({ canvasElement }) => {
    onIconButtonClick.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Add item" });
    const status = canvas.getByRole("status", { name: "IconButton 실행 횟수" });

    button.focus();
    await userEvent.keyboard(" ");
    await expect(onIconButtonClick).toHaveBeenCalledOnce();
    await expect(status).toHaveTextContent("활성화 횟수: 1");
  },
};

const IconButtonFocusFixture = (args: React.ComponentProps<typeof IconButtonUI>) => {
  const [focusedTarget, setFocusedTarget] = useState("없음");

  return (
    <div>
      <a href="#icon-button-focus-target" onFocus={() => setFocusedTarget("키보드 탐색 시작점")}>
        IconButton 포커스 확인 시작
      </a>
      <IconButtonUI
        {...args}
        id="icon-button-focus-target"
        onFocus={(event) => {
          args.onFocus?.(event);
          setFocusedTarget("Add item");
        }}
      />
      <output aria-label="IconButton 현재 포커스">현재 포커스: {focusedTarget}</output>
    </div>
  );
};

export const FocusVisible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "fixture가 소유한 키보드 탐색 시작점에서 실제 Tab 이동을 수행합니다. Canvas에서 IconButton focus, focus-visible outline과 현재 포커스 표시를 함께 확인합니다.",
      },
    },
  },
  render: (args) => <IconButtonFocusFixture {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByRole("link", { name: "IconButton 포커스 확인 시작" });
    const button = canvas.getByRole("button", { name: "Add item" });
    const status = canvas.getByRole("status", { name: "IconButton 현재 포커스" });

    start.focus();
    await expect(start).toHaveFocus();
    await expect(status).toHaveTextContent("현재 포커스: 키보드 탐색 시작점");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(status).toHaveTextContent("현재 포커스: Add item");
  },
};

import { useState } from "react";

import { Add20Regular } from "@fluentui/react-icons";
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
          "IconButtonUI는 제한된 공간에서 product icon만 보이는 action에 사용하며 필수 label로 accessible name을 제공합니다. 텍스트나 콘텐츠로 목적을 직접 보여 줄 수 있으면 ButtonUI를 선택합니다. 단일 public component에 consumer가 icon을 주입하고 sm·md·lg size, disabled와 selected 상태를 조합하며 selected는 aria-pressed와 시각 상태를 함께 표현합니다. focus-visible, hover와 active feedback은 ButtonUI 기반 native button 계약을 유지합니다. consumer는 제품 icon, label과 callback을 제공해야 하고, IconButtonUI는 icon 선택, 권한 확인이나 실행할 business action을 소유하지 않습니다.",
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

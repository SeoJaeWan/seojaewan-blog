import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { IconButtonUI } from "./iconButtonUI";

const PlusIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <path d="M7 3h2v4h4v2H9v4H7V9H3V7h4z" fill="currentColor" />
  </svg>
);

const meta = {
  title: "UI/Primitives/IconButtonUI",
  component: IconButtonUI,
  tags: ["autodocs"],
  args: {
    icon: <PlusIcon />,
    label: "Add item",
  },
  parameters: {
    docs: {
      description: {
        component:
          "IconButtonUI는 ButtonUI를 직접 재사용해 icon-only action을 표현하고, 필수 label로 accessible name을 추가합니다. IconButtonUI는 label을 추론하거나 Application Provider와 실행할 business action을 결정하지 않습니다.",
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
          "기본 icon-only action 상태입니다. Canvas에서 아이콘만 보여도 필수 label로 이름을 가진 활성 native button을 확인합니다.",
      },
    },
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

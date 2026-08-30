import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ButtonUI } from "./index";

const meta = {
  title: "UI/Primitives/ButtonUI",
  component: ButtonUI,
  tags: ["autodocs"],
  args: {
    children: "Open window",
  },
  parameters: {
    docs: {
      description: {
        component:
          "ButtonUI는 텍스트나 콘텐츠로 목적을 드러내는 일반 content action에 사용합니다. 공간 때문에 아이콘만 보여야 하면 필수 accessible label을 제공하는 IconButtonUI를 선택합니다. 단일 public component가 native button 의미와 disabled·focus-visible·pointer/keyboard activation 상태를 보존하며 별도 namespace part는 조합하지 않습니다. consumer는 읽을 수 있는 action 이름과 callback을 제공해야 하고, ButtonUI는 권한 확인, 비동기 처리, 탐색이나 다른 business action을 소유하지 않습니다.",
      },
    },
  },
} satisfies Meta<typeof ButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "기본 content action 상태입니다. Canvas에서 텍스트가 작업의 목적을 드러내는 활성 native button을 확인합니다.",
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
          "비활성 content action 상태입니다. Canvas에서 native disabled 속성과 실행할 수 없음을 확인합니다.",
      },
    },
  },
};

const onButtonClick = fn();

const ButtonInteractionFixture = (args: React.ComponentProps<typeof ButtonUI>) => {
  const [activationCount, setActivationCount] = useState(0);

  return (
    <div>
      <ButtonUI
        {...args}
        onClick={(event) => {
          args.onClick?.(event);
          setActivationCount((count) => count + 1);
        }}
      />
      <output aria-label="Button 실행 횟수">활성화 횟수: {activationCount}</output>
    </div>
  );
};

export const Interaction: Story = {
  args: {
    onClick: onButtonClick,
  },
  parameters: {
    docs: {
      description: {
        story:
          "키보드로 content action을 실행하는 상태입니다. Enter를 한 번 누르면 callback이 한 번 호출되고 Canvas의 활성화 횟수가 1로 바뀝니다.",
      },
    },
  },
  render: (args) => <ButtonInteractionFixture {...args} />,
  play: async ({ canvasElement }) => {
    onButtonClick.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Open window" });
    const status = canvas.getByRole("status", { name: "Button 실행 횟수" });

    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(onButtonClick).toHaveBeenCalledOnce();
    await expect(status).toHaveTextContent("활성화 횟수: 1");
  },
};

const ButtonFocusFixture = (args: React.ComponentProps<typeof ButtonUI>) => {
  const [focusedTarget, setFocusedTarget] = useState("없음");

  return (
    <div>
      <a href="#button-focus-target" onFocus={() => setFocusedTarget("키보드 탐색 시작점")}>
        Button 포커스 확인 시작
      </a>
      <ButtonUI
        {...args}
        id="button-focus-target"
        onFocus={(event) => {
          args.onFocus?.(event);
          setFocusedTarget("Open window");
        }}
      />
      <output aria-label="Button 현재 포커스">현재 포커스: {focusedTarget}</output>
    </div>
  );
};

export const FocusVisible: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "fixture가 소유한 키보드 탐색 시작점에서 실제 Tab 이동을 수행합니다. Canvas에서 Button focus, focus-visible outline과 현재 포커스 표시를 함께 확인합니다.",
      },
    },
  },
  render: (args) => <ButtonFocusFixture {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = canvas.getByRole("link", { name: "Button 포커스 확인 시작" });
    const button = canvas.getByRole("button", { name: "Open window" });
    const status = canvas.getByRole("status", { name: "Button 현재 포커스" });

    start.focus();
    await expect(start).toHaveFocus();
    await expect(status).toHaveTextContent("현재 포커스: 키보드 탐색 시작점");
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
    await expect(status).toHaveTextContent("현재 포커스: Open window");
  },
};

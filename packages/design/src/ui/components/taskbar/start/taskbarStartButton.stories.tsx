import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { TaskbarStartButton } from "./taskbarStartButton.js";

/** 실제 product callback 호출 횟수를 Canvas에서 관찰할 수 있게 렌더링한다. */
const ActionFixture = ({ disabled = false, selected = false }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <TaskbarStartButton
        disabled={disabled}
        onAction={() => setCount((current) => current + 1)}
        selected={selected}
      />
      <output aria-label="Windows Action 횟수">{count}</output>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start Button",
  component: TaskbarStartButton,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div>
        <p>
          {
            (context.parameters.docs as { description?: { story?: string } } | undefined)
              ?.description?.story
          }
        </p>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          "desktop Taskbar에서 Windows 요청을 보내는 시작 버튼이다. " +
          "Base UI Button을 직접 조합하며 panel 관계와 open 상태는 소유하지 않는다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarStartButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 눌러 보기",
  parameters: {
    docs: {
      description: {
        story:
          "시작 버튼을 클릭하거나 Tab으로 이동해 Enter·Space를 눌러 보세요. 아래 숫자는 실행 요청 횟수입니다. 이 예제에는 시작 패널이 없습니다.",
      },
    },
  },
  render: () => <ActionFixture />,
};

export const Selected: Story = {
  name: "선택 상태",
  parameters: {
    docs: {
      description: {
        story:
          "selected로 유지되는 선택 표현입니다. 배경이 강조됩니다. 누르는 순간인 Pressed와 다르며 Controls에서 selected를 끄면 해제됩니다.",
      },
    },
  },
  args: { selected: true },
};

export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    docs: {
      description: {
        story: "마우스를 올리면 배경이 밝아집니다. 밖으로 옮기면 원래 배경으로 돌아갑니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("button", { name: "시작" }));
  },
};

export const Pressed: Story = {
  name: "누르고 있는 상태",
  parameters: {
    docs: {
      description: {
        story:
          "누르는 동안 Windows 로고가 80%로 작아지고 손을 떼면 돌아옵니다. 자동 시연은 누른 지점까지 실행합니다. 직접 눌렀다 떼어 비교해 보세요.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: within(canvasElement).getByRole("button", { name: "시작" }),
    });
  },
};

export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "Tab으로 이동한 키보드 입력 대상입니다. 바깥 테두리가 나타나고 Enter·Space로 실행할 수 있습니다. 다음 Tab으로 포커스를 옮깁니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "시작" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
  },
};

export const Disabled: Story = {
  name: "사용 불가",
  parameters: {
    docs: {
      description: {
        story:
          "흐리게 표시되며 실행 요청을 보내지 않습니다. Controls에서 disabled를 끄면 사용할 수 있습니다.",
      },
    },
  },
  args: { disabled: true },
};

export const Interaction: Story = {
  name: "입력 흐름 자동 확인",
  parameters: {
    docs: {
      description: {
        story:
          "Tab → Enter → Space → 클릭을 자동 실행하며 요청 횟수가 1·2·3으로 증가합니다. 직접 조작은 직접 눌러 보기에서 시작하세요.",
      },
    },
  },
  render: () => <ActionFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "시작" });
    const actionCount = canvas.getByRole("status", { name: "Windows Action 횟수" });

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(actionCount).toHaveTextContent("1");
    await userEvent.keyboard(" ");
    await expect(actionCount).toHaveTextContent("2");
    await userEvent.click(button);
    await expect(actionCount).toHaveTextContent("3");
  },
};

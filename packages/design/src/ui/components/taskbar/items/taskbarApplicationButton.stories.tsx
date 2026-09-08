import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { TaskbarApplicationButton } from "./taskbarApplicationButton.js";

/**
 * 모드 정책과 독립적인 버튼 입력·앱 identity를 관찰한다.
 *
 * Window나 desktop Group 결과를 모사하지 않고 전달한 요청만 표시한다.
 */
const ApplicationExample = () => {
  const [count, setCount] = useState(0);
  const [last, setLast] = useState("없음");
  return (
    <div>
      <TaskbarApplicationButton
        application={{ applicationId: "file-explorer", label: "파일 탐색기", active: false }}
        onAction={(applicationId) => {
          setCount((value) => value + 1);
          setLast(applicationId);
        }}
      />
      <p>
        요청 횟수: <output aria-label="앱 요청 횟수">{count}</output>
      </p>
      <p>
        마지막 앱: <output aria-label="마지막 앱">{last}</output>
      </p>
    </div>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Application Button",
  component: TaskbarApplicationButton,
  tags: ["autodocs"],
  args: { application: { applicationId: "file-explorer", label: "파일 탐색기", active: false } },
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
          "파일 탐색기·Chrome 아이콘과 활성 표현을 제공하는 공통 앱 버튼이다. mobile Root와 desktop Group이 각각 실행 callback을 연결한다. 버튼은 mode·창 생성·최소화·Preview 정책을 결정하지 않는다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarApplicationButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 눌러 보기",
  parameters: {
    docs: {
      description: {
        story:
          "클릭하거나 Tab → Enter·Space로 실행해 보세요. 아래에서 요청 횟수와 앱 identity를 확인할 수 있습니다. 실제 창은 열지 않습니다.",
      },
    },
  },
  render: () => <ApplicationExample />,
};
export const Chrome: Story = {
  name: "Chrome",
  args: { application: { applicationId: "chrome", label: "Chrome", active: false } },
  parameters: {
    docs: {
      description: {
        story:
          "같은 버튼이 Chrome 앱의 아이콘과 접근성 이름을 표시합니다. 화면 모드를 prop으로 요구하지 않습니다.",
      },
    },
  },
};
export const Active: Story = {
  name: "활성 앱",
  args: { application: { applicationId: "chrome", label: "Chrome", active: true } },
  parameters: {
    docs: {
      description: {
        story:
          "외부에서 활성으로 지정한 앱은 배경이 강조됩니다. 순간적인 누름 상태와 다르며, active여도 입력을 차단하지 않습니다. 실행 결과는 사용하는 쪽의 정책이 결정합니다.",
      },
    },
  },
};
export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    docs: {
      description: { story: "마우스를 올리면 배경이 밝아지고, 벗어나면 원래 배경으로 돌아갑니다." },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByRole("button", { name: "파일 탐색기" }));
  },
};
export const Pressed: Story = {
  name: "누르고 있는 상태",
  parameters: {
    docs: {
      description: {
        story:
          "누르는 동안 앱 아이콘이 80%로 작아집니다. 손을 떼면 돌아옵니다. 자동 시연은 누른 지점까지이며 직접 눌렀다 떼어 비교할 수 있습니다.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.pointer({
      keys: "[MouseLeft>]",
      target: within(canvasElement).getByRole("button", { name: "파일 탐색기" }),
    });
  },
};
export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    docs: {
      description: {
        story:
          "Tab으로 이동한 버튼에 포커스 테두리가 나타납니다. Enter·Space로 실행하거나 Tab으로 다음 대상으로 이동하세요.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("button", { name: "파일 탐색기" })).toHaveFocus();
  },
};
export const Disabled: Story = {
  name: "사용 불가",
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "흐리게 표시되며 입력 요청을 보내지 않습니다. Controls에서 disabled를 끄면 사용할 수 있습니다.",
      },
    },
  },
};
export const Interaction: Story = {
  name: "입력 전달 자동 확인",
  parameters: {
    docs: {
      description: {
        story:
          "Tab → Enter → Space → 클릭으로 요청 3회와 파일 탐색기 identity를 자동 확인합니다. 직접 조작은 직접 눌러 보기에서 시작하세요.",
      },
    },
  },
  render: () => <ApplicationExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "파일 탐색기" });
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.click(button);
    await expect(canvas.getByRole("status", { name: "앱 요청 횟수" })).toHaveTextContent("3");
    await expect(canvas.getByRole("status", { name: "마지막 앱" })).toHaveTextContent(
      "file-explorer",
    );
  },
};

import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskbarPreview, withTaskbarDescription } from "../../taskbarStoryPreview.js";
import { TaskbarStartButton } from "./index.js";

/** 실제 product callback 호출 횟수를 Canvas에서 관찰할 수 있게 렌더링한다. */
const ActionFixture = ({ disabled = false, selected = false }) => {
  const [count, setCount] = useState(0);

  return (
    <TaskbarPreview
      results={
        <>
          <p>
            시작 요청: <output aria-label="Windows Action 횟수">{count}</output>
          </p>
        </>
      }
    >
      <TaskbarStartButton
        disabled={disabled}
        onAction={() => setCount((current) => current + 1)}
        selected={selected}
      />
    </TaskbarPreview>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Start Button",
  component: TaskbarStartButton,
  tags: ["autodocs"],
  render: (args) => (
    <TaskbarPreview>
      <TaskbarStartButton {...args} />
    </TaskbarPreview>
  ),
  decorators: [withTaskbarDescription],
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
    taskbarDescription:
      "시작 버튼을 클릭하거나 Tab으로 이동해 Enter·Space를 눌러 보세요. 아래 숫자는 실행 요청 횟수입니다. 이 예제에는 시작 패널이 없습니다.",
  },
  render: () => <ActionFixture />,
};

export const Selected: Story = {
  name: "선택 상태",
  parameters: {
    taskbarDescription:
      "selected로 유지되는 선택 표현입니다. 배경이 강조됩니다. 누르는 순간인 Pressed와 다르며 Controls에서 selected를 끄면 해제됩니다.",
  },
  args: { selected: true },
};

export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    pseudo: { hover: ".taskbar-start-button" },
    taskbarDescription: "마우스를 올렸을 때의 밝은 배경을 고정해 보여 줍니다.",
  },
};

export const SelectedHover: Story = {
  name: "선택 상태 + 호버",
  args: { selected: true },
  parameters: {
    pseudo: { hover: ".taskbar-start-button" },
    taskbarDescription:
      "활성 여부와 관계없이 같은 밝은 글라스 호버 배경을 보여 줍니다. 마우스가 벗어나면 원래 상태의 배경으로 돌아갑니다.",
  },
};

export const Pressed: Story = {
  name: "누르고 있는 상태",
  parameters: {
    pseudo: { hover: ".taskbar-start-button", active: ".taskbar-start-button" },
    taskbarDescription:
      "Windows 로고가 80%로 작아진 누름 표현을 고정해 보여 줍니다. 실제 버튼에서는 누르는 동안만 유지됩니다.",
  },
};

export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    pseudo: { focus: ".taskbar-start-button", focusVisible: ".taskbar-start-button" },
    taskbarDescription:
      "Tab으로 이동했을 때의 포커스 테두리를 고정해 보여 줍니다. 실제 키보드 조작은 직접 눌러 보기에서 확인할 수 있습니다.",
  },
};

export const Disabled: Story = {
  name: "사용 불가",
  parameters: {
    taskbarDescription:
      "흐리게 표시되며 실행 요청을 보내지 않습니다. Controls에서 disabled를 끄면 사용할 수 있습니다.",
  },
  args: { disabled: true },
};

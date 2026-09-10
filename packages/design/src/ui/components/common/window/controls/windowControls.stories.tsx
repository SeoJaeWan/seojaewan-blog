import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  WindowPartPreview,
  withWindowPartDescription,
} from "../../../../../../.storybook/windowPartPreview.js";
import { WindowControls } from "./index.js";

/** 세 창 조작 버튼이 전달한 마지막 요청과 횟수를 Canvas에 표시한다. */
const ControlsExample = () => {
  const [count, setCount] = useState(0);
  const [lastAction, setLastAction] = useState("없음");
  const [maximized, setMaximized] = useState(false);

  /** 창 조작 요청을 기록하고 필요한 경우 아이콘 상태를 전환한다. */
  const recordAction = (action: string, nextMaximized = maximized) => {
    setCount((current) => current + 1);
    setLastAction(action);
    setMaximized(nextMaximized);
  };

  return (
    <WindowPartPreview
      results={
        <>
          <p>
            요청 횟수: <output aria-label="창 조작 요청 횟수">{count}</output>
          </p>
          <p>
            마지막 요청: <output aria-label="마지막 창 조작 요청">{lastAction}</output>
          </p>
        </>
      }
    >
      <WindowControls
        maximized={maximized}
        mode="desktop"
        onClose={() => recordAction("닫기")}
        onMinimize={() => recordAction("최소화")}
        onToggleMaximized={() =>
          recordAction(maximized ? "이전 크기로 복원" : "최대화", !maximized)
        }
      />
    </WindowPartPreview>
  );
};

const meta = {
  title: "Design/Components/Common Window/Controls",
  component: WindowControls,
  tags: ["autodocs"],
  args: { maximized: false, mode: "desktop" },
  decorators: [withWindowPartDescription],
  parameters: {
    docs: {
      description: {
        component:
          "창 오른쪽에서 최소화·최대화 또는 복원·닫기 요청을 보내는 버튼 모음입니다. Desktop에서는 세 버튼을, mobile에서는 닫기 버튼만 표시합니다.",
      },
    },
  },
  render: (args) => (
    <WindowPartPreview>
      <WindowControls {...args} />
    </WindowPartPreview>
  ),
} satisfies Meta<typeof WindowControls>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 눌러 보기",
  parameters: {
    windowPartDescription:
      "버튼을 클릭하거나 Tab으로 이동해 Enter·Space를 눌러 보세요. 아래에서 요청 횟수와 마지막 요청을 확인할 수 있습니다.",
  },
  render: () => <ControlsExample />,
};

export const Restorable: Story = {
  name: "최대화된 창",
  args: { maximized: true },
  parameters: {
    windowPartDescription:
      "창이 최대화된 상태에서는 가운데 버튼이 ‘이전 크기로 복원’ 아이콘과 이름을 사용합니다.",
  },
};

export const Mobile: Story = {
  name: "모바일",
  args: { mode: "mobile" },
  parameters: {
    windowPartDescription: "모바일에서는 최소화와 최대화 버튼을 숨기고 닫기 버튼만 표시합니다.",
  },
};

export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    pseudo: { hover: '.window-controls__button[aria-label="최대화"]' },
    windowPartDescription: "최대화 버튼에 마우스를 올렸을 때의 밝은 배경을 보여 줍니다.",
  },
};

export const CloseHover: Story = {
  name: "닫기에 마우스를 올린 상태",
  parameters: {
    pseudo: { hover: ".window-controls__button--close" },
    windowPartDescription:
      "닫기 버튼에 마우스를 올리면 위험 동작을 구분하는 붉은 배경을 표시합니다.",
  },
};

export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    pseudo: {
      focus: '.window-controls__button[aria-label="최대화"]',
      focusVisible: '.window-controls__button[aria-label="최대화"]',
    },
    windowPartDescription: "Tab으로 최대화 버튼에 이동했을 때의 포커스 테두리를 보여 줍니다.",
  },
};

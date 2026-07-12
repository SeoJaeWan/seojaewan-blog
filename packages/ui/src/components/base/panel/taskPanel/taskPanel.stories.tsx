import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskPanel } from "./index";

const meta = {
  title: "Base/Panel/TaskPanel",
  component: TaskPanel,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "taskbar 위로 떠오르는 패널(시작/검색 등)의 공통 surface — " +
          "data-state(open/closed)로 등장/퇴장 애니메이션을 표현한다. " +
          "열기/닫기 상태 전이와 배치는 useTaskbarPanelController가 제어하고, " +
          "WindowsPanelUI/SearchPanel이 이 surface 위에 내용을 얹는다.",
      },
    },
  },
  args: {
    style: {
      padding: 20,
      width: 420,
    },
  },
} satisfies Meta<typeof TaskPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "패널 콘텐츠",
    state: "open",
  },
};

/** 열린 visual state를 고정해서 보여준다. */
export const Open: Story = {
  args: {
    children: "열린 패널",
    state: "open",
  },
};

/** 닫힘 animation이 적용된 visual state를 고정해서 보여준다. */
export const Closed: Story = {
  args: {
    children: "닫히는 패널",
    state: "closed",
  },
};

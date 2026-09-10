import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  WindowPartPreview,
  withWindowPartDescription,
} from "../../../../../../.storybook/windowPartPreview.js";
import { WindowControls } from "../controls/index.js";
import { WindowTitleBar } from "./index.js";

/** 빈 제목 표시줄 입력으로 발생한 이동 시작과 크기 전환 요청을 보여 준다. */
const TitleBarExample = () => {
  const [moveCount, setMoveCount] = useState(0);
  const [toggleCount, setToggleCount] = useState(0);

  return (
    <WindowPartPreview
      results={
        <>
          <p>
            드래그 입력: <output aria-label="제목 표시줄 누름 횟수">{moveCount}</output>
          </p>
          <p>
            크기 전환: <output aria-label="창 크기 전환 횟수">{toggleCount}</output>
          </p>
        </>
      }
    >
      <WindowTitleBar
        controls={<WindowControls maximized={toggleCount % 2 === 1} mode="desktop" />}
        onMoveStart={() => setMoveCount((current) => current + 1)}
        onToggleMaximized={() => setToggleCount((current) => current + 1)}
      >
        <span className="window-part-story-title">문서 제목</span>
      </WindowTitleBar>
    </WindowPartPreview>
  );
};

const meta = {
  title: "Design/Components/Common Window/Title Bar",
  component: WindowTitleBar,
  tags: ["autodocs"],
  args: {
    children: <span className="window-part-story-title">문서 제목</span>,
    controls: <WindowControls maximized={false} mode="desktop" />,
  },
  decorators: [withWindowPartDescription],
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          "창 제목과 조작 버튼을 한 줄에 배치합니다. 빈 영역을 끌면 창 이동을 시작하고 두 번 클릭하면 최대화 또는 이전 크기 복원을 요청합니다.",
      },
    },
  },
  render: (args) => (
    <WindowPartPreview>
      <WindowTitleBar {...args} />
    </WindowPartPreview>
  ),
} satisfies Meta<typeof WindowTitleBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: "직접 조작해 보기",
  parameters: {
    windowPartDescription:
      "빈 영역을 누르거나 같은 곳을 연속해서 두 번씩 클릭해 보세요. 아래에서 누른 횟수와 최대화·복원 요청 횟수를 확인할 수 있습니다.",
  },
  render: () => <TitleBarExample />,
};

export const FileExplorer: Story = {
  name: "파일 탐색기",
  parameters: {
    windowPartDescription:
      "파일 탐색기 창에서 사용하는 제목 표시줄 배경과 세 조작 버튼을 보여 줍니다.",
  },
  render: (args) => (
    <WindowPartPreview variant="file-explorer">
      <WindowTitleBar {...args} />
    </WindowPartPreview>
  ),
};

export const LongTitle: Story = {
  name: "긴 제목과 좁은 폭",
  args: {
    children: (
      <span className="window-part-story-title">
        아주 긴 문서 제목이 창 조작 버튼을 침범하지 않고 한 줄에서 줄어드는 모습
      </span>
    ),
  },
  parameters: {
    windowPartDescription:
      "창 폭이 좁고 제목이 길어도 조작 버튼 영역은 유지되며 제목은 한 줄에서 잘립니다.",
  },
  render: (args) => (
    <WindowPartPreview narrow>
      <WindowTitleBar {...args} />
    </WindowPartPreview>
  ),
};

export const InteractiveContent: Story = {
  name: "입력 요소가 있는 제목 표시줄",
  args: {
    children: (
      <input
        aria-label="창 제목"
        className="window-part-story-title"
        defaultValue="편집 가능한 제목"
      />
    ),
  },
  parameters: {
    windowPartDescription:
      "제목 입력창과 조작 버튼은 각자의 입력을 유지합니다. 이 영역을 누르거나 두 번 클릭해도 창 이동·크기 전환 요청을 보내지 않습니다.",
  },
};

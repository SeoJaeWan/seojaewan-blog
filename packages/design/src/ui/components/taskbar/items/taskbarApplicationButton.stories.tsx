import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  TaskbarPreview,
  withTaskbarDescription,
} from "../../../../../.storybook/taskbarPreview.js";
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
    <TaskbarPreview
      results={
        <>
          <p>
            요청 횟수: <output aria-label="앱 요청 횟수">{count}</output>
          </p>
          <p>
            마지막 앱: <output aria-label="마지막 앱">{last}</output>
          </p>
        </>
      }
    >
      <TaskbarApplicationButton
        application={{ applicationId: "file-explorer", label: "파일 탐색기", active: false }}
        onAction={(applicationId) => {
          setCount((value) => value + 1);
          setLast(applicationId);
        }}
      />
    </TaskbarPreview>
  );
};

const meta = {
  title: "Design/Components/Taskbar/Application Button",
  component: TaskbarApplicationButton,
  tags: ["autodocs"],
  render: (args) => (
    <TaskbarPreview>
      <TaskbarApplicationButton {...args} />
    </TaskbarPreview>
  ),
  args: { application: { applicationId: "file-explorer", label: "파일 탐색기", active: false } },
  decorators: [withTaskbarDescription],
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
    taskbarDescription:
      "클릭하거나 Tab → Enter·Space로 실행해 보세요. 아래에서 요청 횟수와 앱 identity를 확인할 수 있습니다. 실제 창은 열지 않습니다.",
  },
  render: () => <ApplicationExample />,
};
export const Chrome: Story = {
  name: "Chrome",
  args: { application: { applicationId: "chrome", label: "Chrome", active: false } },
  parameters: {
    taskbarDescription:
      "같은 버튼이 Chrome 앱의 아이콘과 접근성 이름을 표시합니다. 화면 모드를 prop으로 요구하지 않습니다.",
  },
};
export const Active: Story = {
  name: "활성 앱",
  args: { application: { applicationId: "chrome", label: "Chrome", active: true } },
  parameters: {
    taskbarDescription:
      "현재 활성 앱입니다. 강조 배경과 긴 푸른 표시선을 유지합니다. 누르고 있는 순간의 피드백과는 다른 상태입니다.",
  },
};
export const Inactive: Story = {
  name: "실행 중 · 비활성",
  args: {
    application: {
      applicationId: "file-explorer",
      label: "파일 탐색기",
      active: false,
      running: true,
    },
  },
  parameters: {
    taskbarDescription:
      "실행 중이지만 현재 활성 앱이 아닙니다. 배경 강조 없이 짧은 회색 표시선을 유지합니다.",
  },
};
export const Minimized: Story = {
  name: "최소화",
  args: {
    application: {
      applicationId: "file-explorer",
      label: "파일 탐색기",
      active: false,
      running: true,
    },
  },
  parameters: {
    taskbarDescription:
      "최소화된 창도 실행 중입니다. 비활성 앱과 같은 짧은 회색 표시선을 사용하며 배경은 강조하지 않습니다. 창 복원 동작은 연결하지 않은 표현 예제입니다.",
  },
};
export const Hover: Story = {
  name: "마우스를 올린 상태",
  parameters: {
    pseudo: { hover: ".taskbar-application-button" },
    taskbarDescription: "마우스를 올렸을 때의 밝은 배경을 고정해 보여 줍니다.",
  },
};
export const ActiveHover: Story = {
  name: "활성 앱 + 호버",
  args: { application: { applicationId: "chrome", label: "Chrome", active: true } },
  parameters: {
    pseudo: { hover: ".taskbar-application-button" },
    taskbarDescription:
      "활성 여부와 관계없이 같은 밝은 글라스 호버 배경을 보여 줍니다. 마우스가 벗어나면 원래 상태의 배경으로 돌아갑니다.",
  },
};

export const StateComparison: Story = {
  name: "배경 위 상태 비교",
  parameters: {
    pseudo: { hover: ["#taskbar-compare-hover", "#taskbar-compare-active-hover"] },
    taskbarDescription:
      "같은 Taskbar 배경 위에서 기본·활성·호버·활성+호버를 비교합니다. 활성은 은은한 유리 표면과 표시선, 호버는 더 밝은 표면과 선명한 경계를 보여 줍니다.",
  },
  render: () => (
    <div className="taskbar-story-comparison">
      {[
        { id: "default", label: "기본", active: false },
        { id: "active", label: "활성", active: true },
        { id: "hover", label: "호버", active: false },
        { id: "active-hover", label: "활성 + 호버", active: true },
      ].map(({ id, label, active }) => (
        <div key={id}>
          <TaskbarPreview results={<span>{label}</span>}>
            <TaskbarApplicationButton
              id={`taskbar-compare-${id}`}
              application={{ applicationId: "chrome", label: "Chrome", active }}
            />
          </TaskbarPreview>
        </div>
      ))}
    </div>
  ),
};

export const Pressed: Story = {
  name: "누르고 있는 상태",
  parameters: {
    pseudo: { hover: ".taskbar-application-button", active: ".taskbar-application-button" },
    taskbarDescription:
      "앱 아이콘이 80%로 작아진 누름 표현을 고정해 보여 줍니다. 실제 버튼에서는 누르는 동안만 유지됩니다.",
  },
};
export const Focus: Story = {
  name: "키보드 포커스",
  parameters: {
    pseudo: { focus: ".taskbar-application-button", focusVisible: ".taskbar-application-button" },
    taskbarDescription:
      "Tab으로 이동했을 때의 포커스 테두리를 고정해 보여 줍니다. 실제 키보드 조작은 직접 눌러 보기에서 확인할 수 있습니다.",
  },
};
export const Disabled: Story = {
  name: "사용 불가",
  args: { disabled: true },
  parameters: {
    taskbarDescription:
      "흐리게 표시되며 입력 요청을 보내지 않습니다. Controls에서 disabled를 끄면 사용할 수 있습니다.",
  },
};
export const Interaction: Story = {
  name: "입력 전달 자동 확인",
  parameters: {
    taskbarDescription:
      "Tab → Enter → Space → 클릭으로 요청 3회와 파일 탐색기 identity를 자동 확인합니다. 직접 조작은 직접 눌러 보기에서 시작하세요.",
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

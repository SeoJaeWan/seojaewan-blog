import type { CSSProperties } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskPanel } from "../../../base/panel/taskPanel";
import type { TaskbarPanelContainerState } from "./index";
import { TaskbarPanelContainerUI } from "./index";

const containerStyle = { bottom: 24, left: 24, visibility: "visible" } as const;

// REMOVE: Container animation을 단독으로 보여주기 위한 임시 override; Work Unit 2에서 TaskPanel animation을 제거하면 함께 삭제한다.
const panelStyle: CSSProperties = { animation: "none", padding: 24, width: 280 };

const meta = {
  title: "Taskbar/Panel/TaskbarPanelContainerUI",
  component: TaskbarPanelContainerUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar panel visual을 viewport 좌표에 고정하고 opening/closing transition을 표시하는 UI container다. " +
          "위치 계산과 transition 완료 처리는 외부 shell 기능 계층이 담당한다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarPanelContainerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

const renderContainer = (state: TaskbarPanelContainerState) => (
  <TaskbarPanelContainerUI state={state} style={containerStyle}>
    <TaskPanel style={panelStyle}>{state} panel visual</TaskPanel>
  </TaskbarPanelContainerUI>
);

export const Opening: Story = {
  render: () => renderContainer("opening"),
};

export const Open: Story = {
  render: () => renderContainer("open"),
};

export const Closing: Story = {
  render: () => renderContainer("closing"),
};

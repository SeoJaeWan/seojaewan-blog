import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskPanel } from "../../../base/panel/taskPanel";
import { TaskbarPanelPositionerUI } from "./index";

const meta = {
  title: "Taskbar/Panel/TaskbarPanelPositionerUI",
  component: TaskbarPanelPositionerUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar panel을 전달받은 viewport 좌표에 고정하는 visual wrapper다. " +
          "Story에서는 측정 없이 고정된 bottom/left 위치만 보여 준다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarPanelPositionerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BottomLeft: Story = {
  render: () => (
    <TaskbarPanelPositionerUI style={{ bottom: 24, left: 24, visibility: "visible" }}>
      <TaskPanel style={{ padding: 24, width: 280 }}>Bottom-left panel visual</TaskPanel>
    </TaskbarPanelPositionerUI>
  ),
};

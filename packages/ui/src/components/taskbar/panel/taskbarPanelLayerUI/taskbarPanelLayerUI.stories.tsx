import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskPanel } from "../../../base/panel/taskPanel";
import { TaskbarPanelContainerUI } from "../taskbarPanelContainerUI";
import { TaskbarPanelLayerUI } from "./index";

const meta = {
  title: "Taskbar/Panel/TaskbarPanelLayerUI",
  component: TaskbarPanelLayerUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar floating panel이 올라오는 viewport visual layer다. " +
          "Story에서는 고정된 Container와 TaskPanel을 조립해 stacking 구성을 보여 준다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarPanelLayerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithPanel: Story = {
  render: () => (
    <TaskbarPanelLayerUI>
      <TaskbarPanelContainerUI style={{ bottom: 24, left: 24, visibility: "visible" }}>
        <TaskPanel style={{ padding: 24, width: 280 }}>Taskbar panel visual</TaskPanel>
      </TaskbarPanelContainerUI>
    </TaskbarPanelLayerUI>
  ),
};

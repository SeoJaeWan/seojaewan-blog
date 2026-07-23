"use client";

import { TaskbarStartButtonUI } from "@window/ui";

import { TaskbarPanel } from "../panel";
import { TaskbarWindowPanel } from "../windowPanel";

/**
 * Taskbar 시작 버튼과 Windows 시작 패널을 하나의 TaskbarPanel.Root로 조립한다.
 */
export const TaskbarStartButton = () => (
  <TaskbarPanel.Root placement="rootCenter">
    <TaskbarPanel.Trigger>
      <TaskbarStartButtonUI />
    </TaskbarPanel.Trigger>
    <TaskbarPanel.Content>
      <TaskbarWindowPanel />
    </TaskbarPanel.Content>
  </TaskbarPanel.Root>
);

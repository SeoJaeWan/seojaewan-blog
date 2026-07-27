"use client";

import { useContext } from "react";

import { TaskbarPanelContext } from "../../context";

/**
 * TaskbarPanel이 제공하는 전역 panel context를 안전하게 반환한다.
 *
 * @returns 전역 panel 상태와 action
 */
export const useTaskbarPanelContext = () => {
  const context = useContext(TaskbarPanelContext);

  if (context === null) {
    throw new Error("TaskbarPanel.Root는 TaskbarPanel 안에서 사용해야 합니다.");
  }

  return context;
};

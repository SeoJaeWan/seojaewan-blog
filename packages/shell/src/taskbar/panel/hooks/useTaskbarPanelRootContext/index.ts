"use client";

import { useContext } from "react";

import { TaskbarPanelRootContext } from "../../context";

/**
 * TaskbarPanel.Root가 제공하는 panel scope context를 안전하게 반환한다.
 *
 * @returns Trigger와 Content가 공유하는 panel scope 값
 */
export const useTaskbarPanelRootContext = () => {
  const context = useContext(TaskbarPanelRootContext);

  if (context === null) {
    throw new Error(
      "TaskbarPanel.Trigger와 TaskbarPanel.Content는 TaskbarPanel.Root 안에서 사용해야 합니다.",
    );
  }

  return context;
};

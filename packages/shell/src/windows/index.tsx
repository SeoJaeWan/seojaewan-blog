"use client";

import type { ReactNode } from "react";

import type { WindowItem } from "@window/ui";

import { TaskbarPinsProvider } from "./providers/taskbarPinsProvider";
import { WindowsEventsProvider } from "./providers/windowsEventsProvider";
import { WindowsItemsProvider } from "./providers/windowsItemsProvider";
import { WindowsPinsProvider } from "./providers/windowsPinsProvider";

export interface WindowsProps {
  children: ReactNode;
  /** 앱이 소유하는 전체 WindowItem. 배열 참조가 변경될 때 갱신된다. */
  windowsItems: readonly WindowItem[];
}

/**
 * 앱 root에서 Windows domain Provider를 조합한다.
 * windowsItems는 props만 source of truth로 사용하고 surface별 Provider가 pin 상태를 소유한다.
 *
 * @param props.children Windows domain을 사용할 shell과 앱 컴포넌트
 * @param props.windowsItems 앱이 소유하는 전체 WindowItem
 */
export const Windows = ({ children, windowsItems }: WindowsProps) => {
  return (
    <WindowsEventsProvider>
      <WindowsItemsProvider windowsItems={windowsItems}>
        <TaskbarPinsProvider>
          <WindowsPinsProvider>{children}</WindowsPinsProvider>
        </TaskbarPinsProvider>
      </WindowsItemsProvider>
    </WindowsEventsProvider>
  );
};

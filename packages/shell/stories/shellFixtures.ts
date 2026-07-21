import type { WindowItem } from "@window/ui";

import { TASKBAR_PIN_STORAGE_KEY } from "../src/windows/providers/taskbarPinsProvider/constants";
import { WINDOWS_PIN_STORAGE_KEY } from "../src/windows/providers/windowsPinsProvider/constants";

export const START_PANEL_ITEMS = [
  {
    description: "UI 상태와 interaction을 구성하는 라이브러리",
    id: "react",
    title: "React",
  },
  {
    description: "예측 가능한 상태 관리 도구",
    id: "redux",
    title: "Redux Toolkit",
  },
  {
    description: "컴포넌트 개발과 검토 환경",
    id: "storybook",
    title: "Storybook",
  },
  {
    description: "이미지와 동영상 모음",
    id: "media",
    title: "미디어",
  },
] satisfies readonly WindowItem[];

export const UPDATED_START_PANEL_ITEMS = START_PANEL_ITEMS.map((item) =>
  item.id === "react"
    ? { ...item, description: "같은 ID로 갱신된 최신 항목", title: "React 업데이트" }
    : item,
);

export const START_PANEL_ITEMS_WITHOUT_REACT = START_PANEL_ITEMS.filter(
  (item) => item.id !== "react",
);

export interface ShellStorageSeed {
  taskbarPinnedIds?: readonly string[];
  windowsPinnedIds?: readonly string[];
}

export const resetShellStoryStorage = () => {
  window.localStorage.removeItem(TASKBAR_PIN_STORAGE_KEY);
  window.localStorage.removeItem(WINDOWS_PIN_STORAGE_KEY);
};

export const seedShellStoryStorage = ({
  taskbarPinnedIds = [],
  windowsPinnedIds = [],
}: ShellStorageSeed) => {
  window.localStorage.setItem(TASKBAR_PIN_STORAGE_KEY, JSON.stringify(taskbarPinnedIds));
  window.localStorage.setItem(WINDOWS_PIN_STORAGE_KEY, JSON.stringify(windowsPinnedIds));
};

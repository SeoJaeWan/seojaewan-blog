import { createContext } from "react";

/** Window panel에서 검색 전 표시할 browse 화면. */
export type WindowPanelBrowseViewName = "all" | "pinned";

export interface WindowPanelViewContextValue {
  /** 모두 화면으로 이동한다. */
  showAll: () => void;
  /** 고정됨 화면으로 이동한다. */
  showPinned: () => void;
  /** 현재 선택된 browse 화면. */
  view: WindowPanelBrowseViewName;
}

export const WindowPanelViewContext = createContext<WindowPanelViewContextValue | null>(null);

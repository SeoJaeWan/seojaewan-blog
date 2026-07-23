import type { CSSProperties, RefObject } from "react";
import { createContext } from "react";

import type { TaskbarPanelContainerState } from "@window/ui";

import type { TaskbarPanelTransitionState } from "./utils/taskbarPanelReducer";

/** 모든 taskbar panel이 공유하는 활성 상태와 visual layer 계약. */
export interface TaskbarPanelContextValue {
  /** 논리적으로 열린 taskbar panel ID. 닫힘을 요청하면 즉시 null이 된다. */
  activePanelId: string | null;
  /** 지정한 panel이 활성 상태일 때 닫는다. ID를 생략하면 현재 panel을 닫는다. */
  closePanel: (panelId?: string) => void;
  /** 지정한 panel의 현재 phase와 일치하는 transition을 완료한다. */
  completePanelTransition: (panelId: string, state: TaskbarPanelTransitionState) => void;
  /** TaskbarPanelContainerUI를 portal로 연결할 layer DOM. */
  layerElement: HTMLDivElement | null;
  /** 지정한 panel을 활성화하고 기존 panel의 closing과 동시에 opening을 시작한다. */
  openPanel: (panelId: string) => void;
  /** 실제로 mounted 상태를 유지할 panel ID별 visual phase. */
  panelStates: Readonly<Record<string, TaskbarPanelContainerState>>;
}

/** TaskbarPanel과 각 Root를 연결하는 전역 context. */
export const TaskbarPanelContext = createContext<TaskbarPanelContextValue | null>(null);

/** 한 TaskbarPanel.Root가 Trigger와 Content에 제공하는 결합된 계약. */
export interface TaskbarPanelRootContextValue {
  /** 현재 Root에 속한 panel을 닫는다. */
  close: () => void;
  /** Trigger의 aria-controls와 Content DOM을 연결하는 ID. */
  contentId: string;
  /** 현재 Root에 속한 panel이 논리적으로 열려 있는지 나타낸다. */
  isOpen: boolean;
  /** Content를 portal로 연결할 전역 layer DOM. */
  layerElement: HTMLDivElement | null;
  /** 현재 Root에 속한 panel container DOM 참조. */
  panelRef: RefObject<HTMLDivElement | null>;
  /** 현재 Root에 속한 panel의 visual phase. */
  panelState: TaskbarPanelContainerState | null;
  /** 측정한 panel 좌표. */
  positionStyle: CSSProperties;
  /** 현재 Root에 속한 panel의 열린 상태를 전환한다. */
  toggle: () => void;
  /** panel을 여는 button DOM 참조. */
  triggerRef: RefObject<HTMLButtonElement | null>;
}

/** TaskbarPanel.Root와 그 아래 Trigger, Content를 연결하는 scope context. */
export const TaskbarPanelRootContext = createContext<TaskbarPanelRootContextValue | null>(null);

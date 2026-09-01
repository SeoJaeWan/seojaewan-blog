import type { ComponentPropsWithRef, ReactNode } from "react";

/** WindowFrameUI가 foreground와 background 표현을 구분하는 유한 상태다. */
export type WindowFrameUIActivity = "active" | "background";

/** WindowFrameUI가 표현만 하는 창 전환 단계다. */
export type WindowFrameUIMotion = "idle" | "entering" | "exiting" | "minimizing" | "restoring";

/** WindowFrameUI의 CSS custom property로 변환되는 제한된 pixel geometry다. */
export interface WindowFrameUIBounds {
  blockSize?: number;
  inlineSize?: number;
  insetBlockStart?: number;
  insetInlineStart?: number;
}

/** 창 surface의 display state, slot과 native section props를 정의한다. */
export interface WindowFrameUIProps extends ComponentPropsWithRef<"section"> {
  /** foreground/background 표현이며 기본값은 active다. */
  activity?: WindowFrameUIActivity;
  /** 계산이 끝난 pixel geometry만 CSS custom property로 전달한다. */
  bounds?: WindowFrameUIBounds;
  /** 창 본문 위에 배치할 titlebar slot이다. */
  titleBar?: ReactNode;
  /** drag 중 transition을 제거하는 표현 상태다. */
  dragging?: boolean;
  /** 창이 할당된 containing block을 채우는 표현 상태다. */
  fullscreen?: boolean;
  /** UI가 저장하거나 완료 처리하지 않는 motion 표현 단계다. */
  motion?: WindowFrameUIMotion;
}

/** 30px titlebar의 project-owned slots와 native header props를 정의한다. */
export interface WindowTitleBarUIProps extends ComponentPropsWithRef<"header"> {
  /** 오른쪽 window control slot이다. */
  controls?: ReactNode;
  /** title 앞의 장식 또는 application icon slot이다. */
  leading?: ReactNode;
  /** title 영역에 표시할 renderable slot이다. */
  titleContent?: ReactNode;
}

/** WindowControlsUI가 보고하는 ID-free presentation control이다. */
export type WindowControlUIAction = "close" | "maximize" | "minimize" | "restore";

/** WindowControlsUI의 단일 presentation event payload다. */
export interface WindowControlUIEvent {
  control: WindowControlUIAction;
}

/** WindowControlsUI가 각 icon-only button에 제공하는 접근 가능한 이름이다. */
export interface WindowControlUILabels {
  close: string;
  maximize: string;
  minimize: string;
  restore: string;
}

/** 창 controls의 display props, 단일 event와 native div props를 정의한다. */
export interface WindowControlsUIProps extends ComponentPropsWithRef<"div"> {
  /** 모든 control을 native disabled 상태로 만든다. */
  disabled?: boolean;
  /** 지정한 presentation control만 native disabled 상태로 만든다. */
  disabledControls?: readonly WindowControlUIAction[];
  /** maximize control을 restore 표현과 payload로 바꾼다. */
  fullscreen?: boolean;
  /** 기본 접근 가능한 이름을 필요한 경우 대체한다. */
  labels?: Partial<WindowControlUILabels>;
  /** ID와 native event를 포함하지 않는 하나의 presentation event를 보고한다. */
  onControl?: (event: WindowControlUIEvent) => void;
  /** close control을 표시한다. */
  showClose?: boolean;
  /** maximize 또는 restore control을 표시한다. */
  showMaximize?: boolean;
  /** minimize control을 표시한다. */
  showMinimize?: boolean;
}

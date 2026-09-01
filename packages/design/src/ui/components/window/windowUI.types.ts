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
  /** titlebar와 본문 사이에 배치할 routebar slot이다. */
  routeBar?: ReactNode;
  /** drag 중 transition을 제거하는 표현 상태다. */
  dragging?: boolean;
  /** 창이 할당된 containing block을 채우는 표현 상태다. */
  fullscreen?: boolean;
  /** UI가 저장하거나 완료 처리하지 않는 motion 표현 단계다. */
  motion?: WindowFrameUIMotion;
  /** pointer resize 방향을 보고하는 family-local handle을 표시한다. */
  resizable?: boolean;
  /** resize handle의 pointer event를 막되 geometry는 유지한다. */
  resizeDisabled?: boolean;
  /** ID나 좌표 없이 시작한 resize 방향만 보고한다. */
  onResizeStart?: (event: WindowResizeUIEvent) => void;
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

/** 18px icon과 한 줄 title을 가진 titlebar tab의 native div props를 정의한다. */
export interface WindowTabUIProps extends ComponentPropsWithRef<"div"> {
  /** 제품이 선택한 장식용 application 또는 resource icon이다. */
  icon?: ReactNode;
  /** 한 줄로 줄어드는 창 title이다. */
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

/** WindowRouteBarUI가 보고하는 ID-free history 방향이다. */
export type WindowRouteUIAction = "back" | "forward";

/** WindowRouteBarUI의 단일 presentation event payload다. */
export interface WindowRouteUIEvent {
  direction: WindowRouteUIAction;
}

/** route history icon action의 접근 가능한 이름이다. */
export interface WindowRouteUILabels {
  back: string;
  forward: string;
}

/** 36px route row의 history action, field slots와 native nav props를 정의한다. */
export interface WindowRouteBarUIProps extends ComponentPropsWithRef<"nav"> {
  /** back action을 native disabled 상태로 표현한다. */
  backDisabled?: boolean;
  /** forward action을 native disabled 상태로 표현한다. */
  forwardDisabled?: boolean;
  /** history icon action의 기본 접근 가능한 이름을 대체한다. */
  labels?: Partial<WindowRouteUILabels>;
  /** ID와 native event 없이 누른 history 방향을 보고한다. */
  onNavigate?: (event: WindowRouteUIEvent) => void;
  /** route field 뒤에 배치하는 선택적 tag field slot이다. */
  tagInput?: ReactNode;
}

/** RouteInputUI에 전달하는 미리 정의된 경로 후보다. */
export interface RouteInputUIOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** RouteInputUI 변경 원인을 vendor type 없이 나타내는 문자열 집합이다. */
export type RouteInputUIChangeReason =
  | "trigger-press"
  | "input-press"
  | "outside-press"
  | "item-press"
  | "close-press"
  | "escape-key"
  | "list-navigation"
  | "focus-out"
  | "input-change"
  | "input-clear"
  | "clear-press"
  | "cancel-open"
  | "none";

/** RouteInputUI가 선택값 변경을 보고하는 ID-free payload다. */
export interface RouteInputUIValueEvent {
  value: string | null;
  reason: RouteInputUIChangeReason;
}

/** RouteInputUI가 검색 문자열 변경을 보고하는 payload다. */
export interface RouteInputUIInputEvent {
  inputValue: string;
  reason: RouteInputUIChangeReason;
}

/** RouteInputUI가 suggestion surface 표시 변경을 보고하는 payload다. */
export interface RouteInputUIOpenEvent {
  open: boolean;
  reason: RouteInputUIChangeReason;
}

/** predefined route suggestion을 검색하는 field의 display props와 native div props다. */
export interface RouteInputUIProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "defaultValue"
> {
  /** field의 접근 가능한 이름이다. */
  label: string;
  /** local filtering에 사용할 미리 정의된 route 후보다. */
  options: readonly RouteInputUIOption[];
  /** 선택값을 제어한다. */
  value?: string | null;
  /** 비제어 초기 선택값이다. */
  defaultValue?: string | null;
  /** 검색 문자열을 제어한다. */
  inputValue?: string;
  /** 비제어 초기 검색 문자열이다. */
  defaultInputValue?: string;
  /** suggestion surface 표시를 제어한다. */
  open?: boolean;
  /** 비제어 초기 suggestion surface 표시다. */
  defaultOpen?: boolean;
  /** field 전체를 비활성화한다. */
  disabled?: boolean;
  /** 값을 표시하지만 변경하지 못하게 한다. */
  readOnly?: boolean;
  /** 입력에 표시할 짧은 안내다. */
  placeholder?: string;
  /** 후보가 없을 때 표시할 내용이다. */
  emptyMessage?: ReactNode;
  /** clear action의 접근 가능한 이름이다. */
  clearLabel?: string;
  /** suggestion trigger의 접근 가능한 이름이다. */
  showSuggestionsLabel?: string;
  /** route 종류에 따라 field outline을 바꾸는 표현 variant다. */
  shape?: "pill" | "rounded";
  /** 선택값과 변경 이유를 ID 없이 보고한다. */
  onValueChange?: (event: RouteInputUIValueEvent) => void;
  /** 검색 문자열과 변경 이유를 보고한다. */
  onInputValueChange?: (event: RouteInputUIInputEvent) => void;
  /** suggestion surface 표시와 변경 이유를 보고한다. */
  onOpenChange?: (event: RouteInputUIOpenEvent) => void;
}

/** TagInputUI에 전달하는 미리 정의된 tag 후보다. */
export interface TagInputUIOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** TagInputUI 변경 원인을 vendor type 없이 나타내는 문자열 집합이다. */
export type TagInputUIChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "window-resize"
  | "item-press"
  | "focus-out"
  | "list-navigation"
  | "cancel-open"
  | "clear-press"
  | "none";

/** TagInputUI가 선택값 변경을 보고하는 ID-free payload다. */
export interface TagInputUIValueEvent {
  value: string | null;
  reason: TagInputUIChangeReason;
}

/** TagInputUI가 options surface 표시 변경을 보고하는 payload다. */
export interface TagInputUIOpenEvent {
  open: boolean;
  reason: TagInputUIChangeReason;
}

/** predefined tag 하나를 고르는 field의 display props와 native div props다. */
export interface TagInputUIProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "defaultValue"
> {
  /** field의 접근 가능한 이름이다. */
  label: string;
  /** local selection에 사용할 미리 정의된 tag 후보다. */
  options: readonly TagInputUIOption[];
  /** 선택값을 제어한다. */
  value?: string | null;
  /** 비제어 초기 선택값이다. */
  defaultValue?: string | null;
  /** options surface 표시를 제어한다. */
  open?: boolean;
  /** 비제어 초기 options surface 표시다. */
  defaultOpen?: boolean;
  /** field 전체를 비활성화한다. */
  disabled?: boolean;
  /** 값을 표시하지만 변경하지 못하게 한다. */
  readOnly?: boolean;
  /** 선택값이 없을 때 표시할 내용이다. */
  placeholder?: ReactNode;
  /** clear action의 접근 가능한 이름이다. */
  clearLabel?: string;
  /** 선택값과 변경 이유를 ID 없이 보고한다. */
  onValueChange?: (event: TagInputUIValueEvent) => void;
  /** options surface 표시와 변경 이유를 보고한다. */
  onOpenChange?: (event: TagInputUIOpenEvent) => void;
}

/** family-local resize handle이 구분하는 여덟 방향이다. */
export type WindowResizeUIDirection = "e" | "n" | "ne" | "nw" | "s" | "se" | "sw" | "w";

/** WindowResizeHandlesUI가 resize 시작 방향만 보고하는 ID-free payload다. */
export interface WindowResizeUIEvent {
  direction: WindowResizeUIDirection;
}

/** family-local resize hit area의 상태와 native div props를 정의한다. */
export interface WindowResizeHandlesUIProps extends ComponentPropsWithRef<"div"> {
  /** 모든 hit area의 pointer event를 차단한다. */
  disabled?: boolean;
  /** pointer로 시작한 resize 방향을 ID나 좌표 없이 보고한다. */
  onResizeStart?: (event: WindowResizeUIEvent) => void;
}

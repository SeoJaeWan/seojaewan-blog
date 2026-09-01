import type { ComponentPropsWithRef, ReactNode } from "react";

/** Taskbar item이 표현하는 실행 상태다. 제품 task나 session 식별자는 포함하지 않는다. */
export type TaskbarItemUIState = "active" | "idle" | "running";

/** Taskbar item이 요청할 수 있는 ID 없는 단일 표현 동작이다. */
export interface TaskbarItemUIAction {
  type: "activate";
}

/** transition 진행 여부를 caller가 고정해서 보여 주는 상태다. */
export type TaskbarSurfaceUIState = "entering" | "exiting" | "hidden" | "visible";

/** OS reduced-motion 설정을 항상 존중하면서 Story나 consumer가 reduced 결과를 강제할 표시 값이다. */
export type TaskbarSurfaceUIMotion = "full" | "reduced";

/** 50px taskbar surface에 전달할 native nav props다. */
export type TaskbarRootUIProps = ComponentPropsWithRef<"nav">;

/** icon-only taskbar item의 표시 계약과 native button props다. */
export interface TaskbarItemUIProps extends Omit<
  ComponentPropsWithRef<"button">,
  "aria-label" | "aria-labelledby" | "aria-pressed" | "children"
> {
  /** label 대신 화면에 보이는 장식 icon slot이다. */
  icon: ReactNode;
  /** icon-only native button에 필요한 접근 가능한 이름이다. */
  label: string;
  /** ID 없이 activation 의도만 전달하는 표현 event다. */
  onAction?: (action: TaskbarItemUIAction) => void;
  /** indicator 길이와 active surface를 결정한다. */
  state?: TaskbarItemUIState;
}

/** taskbar 위 preview surface와 generic preview slot 계약이다. */
export interface TaskbarPreviewUIProps extends Omit<ComponentPropsWithRef<"section">, "children"> {
  /** caller가 조합하는 generic preview content다. Window component를 요구하지 않는다. */
  preview: ReactNode;
  /** 결정적인 transition 표시 상태다. */
  state?: TaskbarSurfaceUIState;
  /** reduced-motion 결과를 결정적으로 재현할 수 있는 표시 값이다. */
  motion?: TaskbarSurfaceUIMotion;
}

/** 600px window panel surface에 전달할 slot, 표시 상태와 native section props다. */
export interface WindowPanelUIProps extends ComponentPropsWithRef<"section"> {
  /** 결정적인 transition 표시 상태다. */
  state?: TaskbarSurfaceUIState;
  /** reduced-motion 결과를 결정적으로 재현할 수 있는 표시 값이다. */
  motion?: TaskbarSurfaceUIMotion;
}

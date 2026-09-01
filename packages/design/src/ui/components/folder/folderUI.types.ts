import type { ComponentPropsWithRef, ReactNode } from "react";

import type {
  ButtonUIProps,
  CollapsibleUIPanelProps,
  CollapsibleUITriggerProps,
} from "../../primitives";
import type { WindowFrameUIProps, WindowTitleBarUIProps } from "../window";

/** Window chrome 위에 folder title slots와 renderable body를 조합하는 props다. */
export interface FolderFrameUIProps extends Omit<WindowFrameUIProps, "children" | "titleBar"> {
  /** titlebar 오른쪽에 배치할 접근 가능한 control slot이다. */
  controls?: ReactNode;
  /** title 앞에 배치할 장식 또는 application icon slot이다. */
  leading?: ReactNode;
  /** folder viewer 등 이미 render 가능한 본문 slot이다. */
  children?: ReactNode;
  /** titlebar의 native header props다. 구성 slot은 최상위 props가 소유한다. */
  titleBarProps?: Omit<WindowTitleBarUIProps, "children" | "controls" | "leading" | "titleContent">;
  /** titlebar에 표시할 renderable display value다. */
  titleContent?: ReactNode;
}

/** FolderViewerUI의 sidebar/content slots와 native section props를 정의한다. */
export interface FolderViewerUIProps extends ComponentPropsWithRef<"section"> {
  /** children 대신 본문 grid에 배치할 renderable content slot이다. */
  contentSlot?: ReactNode;
  /** 넓은 local container에서만 표시할 navigation slot이다. */
  sidebar?: ReactNode;
  /** sidebar complementary landmark의 선택적 접근 가능한 이름이다. */
  sidebarLabel?: string;
}

/** FolderFileGridUI가 card 폭을 표현하는 세 가지 visual size다. */
export type FolderFileCardUISize = "large" | "medium" | "small";

/** FolderSidebarUI의 navigation landmark와 native nav props를 정의한다. */
export type FolderSidebarUIProps = ComponentPropsWithRef<"nav">;

/** Collapsible disclosure 한 행과 중첩 category slot을 조합하는 props다. */
export interface FolderCategoryItemUIProps extends Omit<ComponentPropsWithRef<"li">, "children"> {
  /** 펼쳤을 때 중첩 list에 표시할 renderable category slot이다. */
  children?: ReactNode;
  /** 비제어 disclosure의 초기 표시 상태다. */
  defaultOpen?: boolean;
  /** disclosure interaction을 비활성화한다. */
  disabled?: boolean;
  /** category label 앞에 배치할 장식 icon slot이다. */
  icon?: ReactNode;
  /** category disclosure trigger에 표시할 접근 가능한 label이다. */
  label: ReactNode;
  /** disclosure 표시 상태 변경만 보고한다. */
  onOpenChange?: (open: boolean) => void;
  /** 제어된 disclosure 표시 상태다. */
  open?: boolean;
  /** 중첩 panel에 전달할 native div props다. */
  panelProps?: Omit<CollapsibleUIPanelProps, "children">;
  /** 현재 category의 선택 표현이며 선택 저장은 소유하지 않는다. */
  selected?: boolean;
  /** disclosure trigger에 전달할 native button props다. */
  triggerProps?: Omit<CollapsibleUITriggerProps, "children">;
}

/** FolderFileGridUI의 card size와 native group props를 정의한다. */
export interface FolderFileGridUIProps extends ComponentPropsWithRef<"div"> {
  /** 넓은 container에서 적용할 card 폭이며 기본값은 medium이다. */
  cardSize?: FolderFileCardUISize;
}

/** ButtonUI 기반 file card의 renderable cover/title과 표시 상태를 정의한다. */
export interface FolderFileCardUIProps extends Omit<ButtonUIProps, "children" | "title"> {
  /** 3:2 cover 영역에 배치할 장식 content slot이다. */
  cover?: ReactNode;
  /** 선택된 card의 시각 표현이며 선택 저장은 소유하지 않는다. */
  selected?: boolean;
  /** card action의 accessible name이 되는 한 줄 title이다. */
  title: ReactNode;
}

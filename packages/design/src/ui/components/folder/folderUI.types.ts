import type { ComponentPropsWithRef, ReactNode } from "react";

import type {
  ButtonUIProps,
  CollapsibleUIPanelProps,
  CollapsibleUITriggerProps,
} from "../../primitives";
import type {
  RouteInputUIProps,
  TagInputUIProps,
  WindowControlsUIProps,
  WindowFrameUIProps,
  WindowRouteBarUIProps,
  WindowTitleBarUIProps,
} from "../window";

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
  /** category 선택 action에 표시할 접근 가능한 label이다. */
  label: ReactNode;
  /** chevron disclosure action의 접근 가능한 이름이다. */
  disclosureLabel?: string;
  /** disclosure 표시 상태 변경만 보고한다. */
  onOpenChange?: (open: boolean) => void;
  /** category label 선택만 보고한다. */
  onSelect?: () => void;
  /** 제어된 disclosure 표시 상태다. */
  open?: boolean;
  /** 중첩 panel에 전달할 native div props다. */
  panelProps?: Omit<CollapsibleUIPanelProps, "children">;
  /** 현재 category의 선택 표현이며 선택 저장은 소유하지 않는다. */
  selected?: boolean;
  /** category label ButtonUI에 전달할 native button props다. */
  selectionProps?: Omit<ButtonUIProps, "children">;
  /** chevron disclosure trigger에 전달할 native button props다. */
  triggerProps?: Omit<CollapsibleUITriggerProps, "children">;
}

/** FolderSidebarFileItemUI의 child file row와 native list item props를 정의한다. */
export interface FolderSidebarFileItemUIProps extends Omit<
  ComponentPropsWithRef<"li">,
  "children" | "title"
> {
  /** child file action ButtonUI에 전달할 native button props다. */
  buttonProps?: Omit<ButtonUIProps, "children">;
  /** file title 앞에 배치할 장식 icon slot이다. */
  icon?: ReactNode;
  /** child file 선택만 보고한다. */
  onSelect?: () => void;
  /** 현재 child file의 선택 표현이며 선택 저장은 소유하지 않는다. */
  selected?: boolean;
  /** child file action의 accessible name이 되는 한 줄 title이다. */
  title: ReactNode;
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

/** 완성형 FolderWindowUI sidebar에 전달하는 child file presentation DTO다. */
export interface FolderWindowSidebarFileUIItem {
  disabled?: boolean;
  icon?: ReactNode;
  selected?: boolean;
  title: ReactNode;
  value: string;
}

/** 완성형 FolderWindowUI sidebar에 전달하는 category presentation DTO다. */
export interface FolderWindowCategoryUIItem {
  defaultOpen?: boolean;
  disabled?: boolean;
  disclosureLabel?: string;
  files?: readonly FolderWindowSidebarFileUIItem[];
  icon?: ReactNode;
  label: ReactNode;
  open?: boolean;
  selected?: boolean;
  value: string;
}

/** 완성형 FolderWindowUI grid에 전달하는 file card presentation DTO다. */
export interface FolderWindowFileUIItem {
  cover?: ReactNode;
  disabled?: boolean;
  selected?: boolean;
  title: ReactNode;
  value: string;
}

export interface FolderWindowCategorySelectUIEvent {
  value: string;
}

export interface FolderWindowCategoryOpenUIEvent extends FolderWindowCategorySelectUIEvent {
  open: boolean;
}

export interface FolderWindowSidebarFileSelectUIEvent {
  categoryValue: string;
  value: string;
}

export interface FolderWindowFileUIEvent {
  value: string;
}

/** 완성된 Folder Window chrome, sidebar tree와 file grid의 presentation contract다. */
export interface FolderWindowUIProps extends Omit<
  WindowFrameUIProps,
  "children" | "routeBar" | "title" | "titleBar" | "variant"
> {
  /** Folder sidebar에 표시할 category presentation DTO다. */
  categories: readonly FolderWindowCategoryUIItem[];
  /** 넓은 container에서 적용할 file card 폭이다. */
  cardSize?: FolderFileCardUISize;
  /** WindowControlsUI에 전달할 presentation props다. */
  controlsProps?: WindowControlsUIProps;
  /** Folder grid에 표시할 file card presentation DTO다. */
  files: readonly FolderWindowFileUIItem[];
  /** title 왼쪽에 표시할 장식 icon이다. */
  icon?: ReactNode;
  /** category disclosure 변경을 category value와 함께 보고한다. */
  onCategoryOpenChange?: (event: FolderWindowCategoryOpenUIEvent) => void;
  /** category label 선택을 category value와 함께 보고한다. */
  onCategorySelect?: (event: FolderWindowCategorySelectUIEvent) => void;
  /** file card double click 열기를 file value와 함께 보고한다. */
  onFileOpen?: (event: FolderWindowFileUIEvent) => void;
  /** file card click 또는 keyboard activation을 file value와 함께 보고한다. */
  onFileSelect?: (event: FolderWindowFileUIEvent) => void;
  /** child file row 선택을 category/file value와 함께 보고한다. */
  onSidebarFileSelect?: (event: FolderWindowSidebarFileSelectUIEvent) => void;
  /** WindowRouteBarUI에 전달할 history presentation props다. */
  routeBarProps?: Omit<WindowRouteBarUIProps, "children" | "tagInput">;
  /** Folder rounded route field에 전달할 presentation props다. */
  routeInputProps: Omit<RouteInputUIProps, "shape">;
  /** sidebar navigation landmark의 접근 가능한 이름이다. */
  sidebarLabel: string;
  /** optional Folder tag field에 전달할 presentation props다. */
  tagInputProps?: TagInputUIProps;
  /** Folder titlebar에 표시할 renderable title이다. */
  title: ReactNode;
  /** Folder viewer region의 접근 가능한 이름이다. */
  viewerLabel: string;
}

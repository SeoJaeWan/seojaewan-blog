import type {
  AnimationEvent,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  TransitionEvent,
} from "react";

import type {
  IconButtonUIProps,
  InputUIProps,
  PopoverUIContentProps,
  PopoverUIOpenChangeReason,
} from "../../primitives";

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

/** Taskbar family가 항목을 구분할 때만 사용하는 불투명 presentation value다. */
export type TaskbarUIValue = string;

/** Start/Search/Menu/Preview가 공유하는 renderable 표시 정보다. */
export interface TaskbarEntryUIData {
  /** 선택 callback에 그대로 되돌려 주는 불투명 presentation value다. */
  value: TaskbarUIValue;
  /** 비활성 native control 결과다. */
  disabled?: boolean;
  /** 항목 앞에 표시할 장식 icon slot이다. */
  icon?: ReactNode;
  /** 항목의 accessible name과 visible label이다. */
  label: string;
  /** 검색 상세 pane에 표시할 선택적 보조 설명이다. */
  description?: ReactNode;
}

/** 검색 추천 우측의 고정 presentation section이다. */
export interface TaskbarRecommendationSectionUIData {
  entries: readonly TaskbarEntryUIData[];
  title: string;
}

/** All view의 category header와 항목을 묶는 presentation section이다. */
export interface TaskbarAllSectionUIData {
  category: string;
  entries: readonly TaskbarEntryUIData[];
}

/** detail/menu action의 표시 강도와 enabled 결과다. */
export interface TaskbarActionUIData extends TaskbarEntryUIData {
  trailing?: ReactNode;
  variant?: "default" | "danger";
}

/** pinned tile reorder의 결정적 visual phase다. */
export interface TaskbarPinnedItemAnimationUIData {
  phase: "in" | "out";
  value: TaskbarUIValue;
}

/** 한 session thumbnail의 표시 정보다. 실제 session model은 포함하지 않는다. */
export interface TaskbarPreviewItemUIData extends TaskbarEntryUIData {
  /** 실제 Window UI를 주입할 수 있는 교체 가능한 preview content boundary다. */
  preview: ReactNode;
}

/** complete Taskbar aggregate가 표시하는 group 한 개의 presentation 정보다. */
export interface TaskbarGroupUIData extends TaskbarEntryUIData {
  actions?: readonly TaskbarActionUIData[];
  previews?: readonly TaskbarPreviewItemUIData[];
  state?: TaskbarItemUIState;
  tasks?: readonly TaskbarEntryUIData[];
}

/** 50px taskbar surface와 private panel portal scope를 구성한다. */
export interface TaskbarRootUIProps extends ComponentPropsWithRef<"nav"> {
  /** floating layer를 연결할 DOM이다. undefined면 mount 뒤 document.body, null이면 layer 없음이다. */
  portalContainer?: HTMLElement | ShadowRoot | null;
}

/** Taskbar panel scope가 추가로 보고하는 UI-local close 원인이다. */
export type TaskbarPanelUIOpenChangeReason = PopoverUIOpenChangeReason | "single-active";

/** product state를 노출하지 않는 Taskbar panel open 변경 정보다. */
export interface TaskbarPanelUIOpenChangeDetails {
  reason: TaskbarPanelUIOpenChangeReason;
}

/** control과 portalled panel을 연결하는 Taskbar family lifecycle 계약이다. */
export interface TaskbarPanelUIProps extends Omit<
  PopoverUIContentProps,
  "aria-label" | "aria-labelledby" | "children" | "container"
> {
  children: ReactNode;
  /** uncontrolled 사용의 초기 열림 상태다. */
  defaultOpen?: boolean;
  /** dialog에 필요한 고정 presentation label이다. */
  label: string;
  /** reduced-motion 결과를 결정적으로 재현할 수 있는 표시 값이다. */
  motion?: TaskbarSurfaceUIMotion;
  /** controlled 사용의 현재 열림 상태다. */
  open?: boolean;
  /** Taskbar family가 정규화한 open 변경 원인을 보고한다. */
  onOpenChange?: (open: boolean, details: TaskbarPanelUIOpenChangeDetails) => void;
  /** presence 전환이 끝난 뒤 현재 open 결과를 보고한다. */
  onOpenChangeComplete?: (open: boolean) => void;
  /** Popover trigger 동작과 ARIA를 받을 visible button Component다. */
  trigger: ReactElement;
}

/** root가 portal에 생성하는 pointer-transparent panel layer다. */
export type TaskbarPanelLayerUIProps = Omit<ComponentPropsWithRef<"div">, "children">;

/** placement 안에서 presence와 pointer interaction을 소유하는 panel container다. */
export interface TaskbarPanelContainerUIProps extends ComponentPropsWithRef<"div"> {
  motion?: TaskbarSurfaceUIMotion;
  state?: TaskbarSurfaceUIState;
}

/** Windows logo를 표시하는 Start action의 project-owned 표시 계약이다. */
export interface TaskbarStartButtonUIProps extends Omit<
  IconButtonUIProps,
  "icon" | "label" | "size"
> {
  /** 기본 Windows logo 대신 표시할 장식 icon slot이다. */
  icon?: ReactNode;
}

/** Taskbar free-text search에 전달할 native input props다. */
export type TaskbarSearchUIProps = Omit<InputUIProps, "children" | "type">;

/** app item children을 한 줄로 배치하는 layout props다. */
export type TaskbarAppListUIProps = ComponentPropsWithRef<"div">;

/** icon-only taskbar item의 표시 계약과 native button props다. */
export interface TaskbarItemUIProps extends Omit<
  IconButtonUIProps,
  | "aria-label"
  | "aria-labelledby"
  | "aria-pressed"
  | "children"
  | "icon"
  | "label"
  | "selected"
  | "size"
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

/** caller가 주입한 시각을 시간과 날짜로 표현하는 표시 계약이다. */
export interface TaskbarClockUIProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** Intl formatter가 사용할 time zone이다. */
  timeZone?: string;
  /** 표시할 시각이다. null이면 hydration 전 skeleton을 보여 준다. */
  value?: Date | null;
}

/** taskbar 위 session preview card의 title, close, select와 scaled content 계약이다. */
export interface TaskbarPreviewUIProps extends Omit<ComponentPropsWithRef<"section">, "children"> {
  /** caller가 조합하는 실제 Window preview content boundary다. */
  preview: ReactNode;
  icon?: ReactNode;
  onClose?: () => void;
  onSelect?: () => void;
  title: string;
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

/** Start/Search panel 안의 icon tile props다. */
export interface PanelIconButtonUIProps extends Omit<ComponentPropsWithRef<"button">, "children"> {
  icon?: ReactNode;
  lines?: 1 | 2;
  selected?: boolean;
  title: string;
}

/** Start pinned view의 fixed UI structure와 presentation callbacks다. */
export interface WindowsPanelPinnedViewUIProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children"
> {
  active?: boolean;
  itemAnimation?: TaskbarPinnedItemAnimationUIData | null;
  items?: readonly TaskbarEntryUIData[];
  onItemAnimationEnd?: (event: AnimationEvent<HTMLButtonElement>, value: TaskbarUIValue) => void;
  onItemSelect?: (value: TaskbarUIValue) => void;
  onItemTransitionEnd?: (event: TransitionEvent<HTMLButtonElement>, value: TaskbarUIValue) => void;
  onShowAll?: () => void;
}

/** Start all view의 category overlay와 list callbacks다. */
export interface WindowsPanelAllViewUIProps extends Omit<
  ComponentPropsWithRef<"section">,
  "children"
> {
  active?: boolean;
  categoryOverlayOpen?: boolean;
  defaultCategoryOverlayOpen?: boolean;
  onCategoryOverlayOpenChange?: (open: boolean) => void;
  onItemSelect?: (value: TaskbarUIValue) => void;
  onShowPinned?: () => void;
  sections?: readonly TaskbarAllSectionUIData[];
}

/** 검색 전 추천과 best section view다. */
export interface TaskSearchRecommendationViewUIProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children"
> {
  bestSections?: readonly TaskbarRecommendationSectionUIData[];
  onItemSelect?: (value: TaskbarUIValue) => void;
  recommendedItems?: readonly TaskbarEntryUIData[];
}

/** 검색 결과 list/detail view다. */
export interface TaskSearchResultViewUIProps extends Omit<
  ComponentPropsWithRef<"div">,
  "children" | "results"
> {
  detailActions?: readonly TaskbarActionUIData[];
  detailValue?: TaskbarUIValue | null;
  onDetailAction?: (actionValue: TaskbarUIValue, itemValue: TaskbarUIValue) => void;
  onDetailValueChange?: (value: TaskbarUIValue) => void;
  onItemSelect?: (value: TaskbarUIValue) => void;
  results?: readonly TaskbarEntryUIData[];
}

/** 검색 추천/결과/detail을 product markup 없이 전환하는 panel body다. */
export interface SearchPanelUIProps extends Omit<WindowPanelUIProps, "children" | "results"> {
  bestSections?: readonly TaskbarRecommendationSectionUIData[];
  detailActions?: readonly TaskbarActionUIData[];
  detailValue?: TaskbarUIValue | null;
  onDetailAction?: (actionValue: TaskbarUIValue, itemValue: TaskbarUIValue) => void;
  onDetailValueChange?: (value: TaskbarUIValue) => void;
  onItemSelect?: (value: TaskbarUIValue) => void;
  onSearchValueChange?: (value: string) => void;
  recommendedItems?: readonly TaskbarEntryUIData[];
  results?: readonly TaskbarEntryUIData[];
  searchPlaceholder?: string;
  searchValue?: string;
}

/** Start search/pinned/all/results를 한 production Component로 조합한다. */
export interface WindowsPanelUIProps extends Omit<WindowPanelUIProps, "children" | "results"> {
  allSections?: readonly TaskbarAllSectionUIData[];
  defaultView?: "all" | "pinned";
  detailActions?: readonly TaskbarActionUIData[];
  detailValue?: TaskbarUIValue | null;
  onDetailAction?: (actionValue: TaskbarUIValue, itemValue: TaskbarUIValue) => void;
  onDetailValueChange?: (value: TaskbarUIValue) => void;
  onItemSelect?: (value: TaskbarUIValue) => void;
  onSearchValueChange?: (value: string) => void;
  onViewChange?: (view: "all" | "pinned") => void;
  pinnedItems?: readonly TaskbarEntryUIData[];
  results?: readonly TaskbarEntryUIData[];
  searchValue?: string;
  view?: "all" | "pinned";
}

/** hover panel의 complete multi-preview 결과다. */
export interface TaskHoverPanelUIProps extends Omit<WindowPanelUIProps, "children"> {
  items?: readonly TaskbarPreviewItemUIData[];
  onCloseItem?: (value: TaskbarUIValue) => void;
  onSelectItem?: (value: TaskbarUIValue) => void;
}

/** production ContextMenuUI를 Taskbar target과 entry presentation에 연결한다. */
export interface TaskbarContextMenuUIProps {
  actions?: readonly TaskbarActionUIData[];
  label: string;
  onAction?: (value: TaskbarUIValue) => void;
  onTaskSelect?: (value: TaskbarUIValue) => void;
  tasks?: readonly TaskbarEntryUIData[];
  tasksLabel?: string;
  trigger: ReactElement;
}

/** complete Taskbar가 Start/Search/groups/preview/menu/clock을 생산하는 public 계약이다. */
export interface TaskbarUIProps extends Omit<TaskbarRootUIProps, "children" | "results"> {
  allSections?: readonly TaskbarAllSectionUIData[];
  bestSections?: readonly TaskbarRecommendationSectionUIData[];
  clockTimeZone?: string;
  clockValue?: Date | null;
  detailActions?: readonly TaskbarActionUIData[];
  groups?: readonly TaskbarGroupUIData[];
  onContextAction?: (groupValue: TaskbarUIValue, actionValue: TaskbarUIValue) => void;
  onContextTaskSelect?: (groupValue: TaskbarUIValue, taskValue: TaskbarUIValue) => void;
  onDetailAction?: (actionValue: TaskbarUIValue, itemValue: TaskbarUIValue) => void;
  onGroupAction?: (value: TaskbarUIValue) => void;
  onItemSelect?: (value: TaskbarUIValue) => void;
  onPreviewClose?: (groupValue: TaskbarUIValue, previewValue: TaskbarUIValue) => void;
  onPreviewSelect?: (groupValue: TaskbarUIValue, previewValue: TaskbarUIValue) => void;
  pinnedItems?: readonly TaskbarEntryUIData[];
  recommendedItems?: readonly TaskbarEntryUIData[];
  results?: readonly TaskbarEntryUIData[];
  searchPlaceholder?: string;
}

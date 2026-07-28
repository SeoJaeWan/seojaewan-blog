import type { MouseEvent, ReactNode } from "react";

/** Context Menu가 닫힌 원인을 consumer observer에 전달할 때 사용하는 값. */
export type ContextMenuCloseReason = "action" | "backdrop" | "escape" | "programmatic" | "replaced";

/** 선택하면 consumer의 onAction으로 전달되는 Context Menu action row. */
export interface ContextMenuActionEntry<ActionId extends string> {
  /** 선택 후 메뉴를 닫을지 여부. 기본값은 true다. */
  closeOnSelect?: boolean;
  /** true이면 표시하지만 실행하거나 focus할 수 없다. */
  disabled?: boolean;
  /** action row 왼쪽의 visual icon. */
  icon?: ReactNode;
  /** consumer가 action을 구분할 typed ID. */
  id: ActionId;
  /** 화면과 접근성 이름에 사용할 action label. */
  label: string;
  /** 메뉴를 닫을 때 원래 trigger로 focus를 복원할지 여부. 기본값은 true다. */
  restoreFocus?: boolean;
  /** 현재 선택된 보기·정렬 값처럼 선택 visual을 표시할지 여부. */
  selected?: boolean;
  type: "action";
}

/** 하위 Context Menu entry를 여는 submenu trigger row. */
export interface ContextMenuSubmenuEntry<ActionId extends string> {
  /** true이면 submenu trigger를 표시하지만 열 수 없다. */
  disabled?: boolean;
  /** submenu 안에 표시할 재귀 entry 목록. */
  entries: readonly ContextMenuEntry<ActionId>[];
  /** submenu trigger 왼쪽의 visual icon. */
  icon?: ReactNode;
  /** 같은 level의 entry를 구분하는 안정적인 key. */
  key: string;
  /** 화면과 접근성 이름에 사용할 submenu label. */
  label: string;
  type: "submenu";
}

/** 관련 action group 사이를 나누는 비대화형 separator. */
export interface ContextMenuSeparatorEntry {
  /** 같은 level의 entry를 구분하는 안정적인 key. */
  key: string;
  type: "separator";
}

/** 범용 Context Menu가 렌더할 수 있는 전체 entry 모델. */
export type ContextMenuEntry<ActionId extends string> =
  ContextMenuActionEntry<ActionId> | ContextMenuSeparatorEntry | ContextMenuSubmenuEntry<ActionId>;

/** 한 surface가 범용 Context Menu trigger에 전달하는 메뉴 구성과 callback. */
export interface UseContextMenuTriggerOptions<Target, ActionId extends string> {
  /** true이면 실제 top/bottom 배치 방향을 기준으로 opening Motion을 실행한다. */
  animated?: boolean;
  /** 현재 target과 consumer 상태에서 표시할 entry를 계산한다. */
  getEntries: (target: Target) => readonly ContextMenuEntry<ActionId>[];
  /** action row를 선택했을 때 target에 실제 도메인 동작을 실행한다. */
  onAction: (actionId: ActionId, target: Target) => void;
  /** 메뉴가 닫힐 때 target과 닫힌 원인을 관찰하는 선택 callback. */
  onClose?: (target: Target, reason: ContextMenuCloseReason) => void;
  /** 메뉴 요청이 전역 Host에 전달될 때 target을 관찰하는 선택 callback. */
  onOpen?: (target: Target) => void;
}

/** 한 surface가 item별 contextmenu event에 연결하는 범용 trigger handler. */
export type ContextMenuTriggerHandler<Target> = <Element extends HTMLElement>(
  event: MouseEvent<Element>,
  target: Target,
) => void;

export type AnyContextMenuEntry = ContextMenuEntry<string>;

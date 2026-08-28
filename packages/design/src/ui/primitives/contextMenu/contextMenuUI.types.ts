import type { HTMLAttributes, ReactElement, ReactNode, Ref, RefObject } from "react";

/**
 * context menu 열림 상태가 바뀐 직접 원인을 프로젝트 용어로 표현한다.
 *
 * Base UI의 원본 event 객체나 제품 action 의미는 노출하지 않는다.
 */
export type ContextMenuUIOpenChangeReason =
  | "trigger-press"
  | "trigger-hover"
  | "trigger-focus"
  | "outside-press"
  | "focus-out"
  | "list-navigation"
  | "escape-key"
  | "item-press"
  | "close-press"
  | "sibling-open"
  | "cancel-open"
  | "imperative-action"
  | "none";

/**
 * context menu 상태 변경 callback에 전달하는 안정적인 세부 정보다.
 *
 * vendor 전용 필드나 DOM event 수명은 공개 계약에 포함하지 않는다.
 */
export interface ContextMenuUIChangeDetails {
  reason: ContextMenuUIOpenChangeReason;
}

/**
 * 다음 열림 상태와 변경 원인을 함께 수신하는 callback 계약이다.
 *
 * 상태 저장 방식이나 제품 부작용의 실행 순서는 결정하지 않는다.
 */
export type ContextMenuUIOpenChangeHandler = (
  open: boolean,
  details: ContextMenuUIChangeDetails,
) => void;

/**
 * context menu Root의 열림·focus·방향 동작을 구성한다.
 *
 * 호출 surface·content DOM이나 제품 action 목록은 직접 만들지 않는다.
 */
export interface ContextMenuUIProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  orientation?: "horizontal" | "vertical";
  closeParentOnEscape?: boolean;
  onOpenChange?: ContextMenuUIOpenChangeHandler;
  onOpenChangeComplete?: (open: boolean) => void;
}

/**
 * 보조 포인터와 키보드 호출을 수신하는 surface를 구성한다.
 *
 * surface의 제품 선택 상태나 action 목록은 결정하지 않는다.
 */
export interface ContextMenuUITriggerProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  render?: ReactElement;
}

/**
 * context menu content가 호출 지점에 배치될 논리적 방향이다.
 *
 * 충돌 회피 결과나 제품 레이아웃 정책을 보장하지 않는다.
 */
export type ContextMenuUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/**
 * context menu content의 교차축 정렬 위치다.
 *
 * 텍스트 정렬이나 항목 내부 정렬은 지정하지 않는다.
 */
export type ContextMenuUIPlacementAlign = "start" | "center" | "end";

/**
 * context menu가 닫힌 뒤 focus를 복원할 때의 입력 상호작용 종류다.
 *
 * 입력 장치 탐지 정책이나 제품별 focus 대상을 결정하지 않는다.
 */
export type ContextMenuUICloseInteraction = "mouse" | "touch" | "pen" | "keyboard" | "unknown";

/**
 * context menu가 닫힌 뒤 focus 복원 여부 또는 대상을 지정한다.
 *
 * 제품 화면의 focus 순서나 영구 focus 정책은 소유하지 않는다.
 */
export type ContextMenuUIFinalFocus =
  | boolean
  | RefObject<HTMLElement | null>
  | ((interaction: ContextMenuUICloseInteraction) => boolean | HTMLElement | null | undefined);

/**
 * menu role을 가진 popup의 배치·portal·focus 복원을 구성한다.
 *
 * 항목의 제품 순서나 action 실행 의미는 결정하지 않는다.
 */
export interface ContextMenuUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: ContextMenuUIPlacementSide;
  align?: ContextMenuUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: ContextMenuUIFinalFocus;
}

/**
 * context menu 항목의 시각적 강조 수준을 선택한다.
 *
 * 실제 위험도 판정이나 확인 절차는 수행하지 않는다.
 */
export type ContextMenuUIItemVariant = "default" | "danger";

/**
 * 일반 menuitem의 DOM·disabled·선택 후 닫힘 계약을 구성한다.
 *
 * 선택 시 실행할 제품 부작용은 구현하지 않는다.
 */
export interface ContextMenuUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  disabled?: boolean;
  label?: string;
  closeOnSelect?: boolean;
  variant?: ContextMenuUIItemVariant;
}

/**
 * boolean menuitem의 제어·비제어 checked 상태와 변경 callback을 구성한다.
 *
 * 선택값의 제품 저장 위치나 영속화는 소유하지 않는다.
 */
export interface ContextMenuUICheckboxItemProps extends Omit<ContextMenuUIItemProps, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: ContextMenuUIChangeDetails) => void;
}

/**
 * 상호 배타적인 radio 항목의 값 범위와 변경 callback을 구성한다.
 *
 * 값의 제품 의미나 저장 방식은 해석하지 않는다.
 */
export interface ContextMenuUIRadioGroupProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string, details: ContextMenuUIChangeDetails) => void;
}

/**
 * radio group 안에서 선택 가능한 값 하나의 menuitem 계약이다.
 *
 * 값 사이의 우선순위나 제품 기본값은 결정하지 않는다.
 */
export interface ContextMenuUIRadioItemProps extends ContextMenuUIItemProps {
  value: string;
}

/**
 * context menu 항목 묶음 사이의 separator 의미와 방향을 구성한다.
 *
 * 제품 action의 그룹 기준이나 순서는 정의하지 않는다.
 */
export interface ContextMenuUISeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  orientation?: "horizontal" | "vertical";
}

/**
 * 부모 context menu 안에서 중첩 메뉴 Root가 사용할 상태 계약이다.
 *
 * 하위 action 모델이나 제품별 중첩 정책은 포함하지 않는다.
 */
export type ContextMenuUISubmenuProps = ContextMenuUIProps;

/**
 * 중첩 context menu를 여는 menuitem의 hover 지연과 항목 계약을 구성한다.
 *
 * 중첩 action의 권한이나 가용성은 판단하지 않는다.
 */
export interface ContextMenuUISubmenuTriggerProps extends Omit<
  ContextMenuUIItemProps,
  "closeOnSelect"
> {
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}

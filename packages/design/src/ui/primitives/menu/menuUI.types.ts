import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/**
 * 메뉴 열림 상태가 바뀐 직접 원인을 프로젝트 용어로 표현한다.
 *
 * Base UI의 원본 event 객체나 제품 action 의미는 노출하지 않는다.
 */
export type MenuUIOpenChangeReason =
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
 * 메뉴 상태 변경 callback에 전달하는 안정적인 세부 정보다.
 *
 * vendor 전용 필드나 DOM event 수명은 공개 계약에 포함하지 않는다.
 */
export interface MenuUIChangeDetails {
  reason: MenuUIOpenChangeReason;
}

/**
 * 다음 열림 상태와 변경 원인을 함께 수신하는 callback 계약이다.
 *
 * 상태 저장 방식이나 제품 부작용의 실행 순서는 결정하지 않는다.
 */
export type MenuUIOpenChangeHandler = (open: boolean, details: MenuUIChangeDetails) => void;

/**
 * 버튼 메뉴 Root의 열림·focus·방향 동작을 구성한다.
 *
 * trigger·content DOM이나 제품 action 목록은 직접 만들지 않는다.
 */
export interface MenuUIProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  loopFocus?: boolean;
  modal?: boolean;
  orientation?: "horizontal" | "vertical";
  closeParentOnEscape?: boolean;
  onOpenChange?: MenuUIOpenChangeHandler;
  onOpenChangeComplete?: (open: boolean) => void;
}

/**
 * 메뉴를 여는 button trigger의 native·hover 동작을 구성한다.
 *
 * 버튼 문구나 제품 권한 판단은 소유하지 않는다.
 */
export interface MenuUITriggerProps extends ComponentPropsWithoutRef<"button"> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
  nativeButton?: boolean;
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}

/**
 * 메뉴 content가 기준 요소에 배치될 논리적 방향이다.
 *
 * 충돌 회피 결과나 제품 레이아웃 정책을 보장하지 않는다.
 */
export type MenuUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/**
 * 메뉴 content가 배치 방향의 교차축에서 정렬되는 위치다.
 *
 * 텍스트 정렬이나 항목 내부 정렬은 지정하지 않는다.
 */
export type MenuUIPlacementAlign = "start" | "center" | "end";

/**
 * 메뉴가 닫힌 뒤 focus를 복원할 때의 입력 상호작용 종류다.
 *
 * 입력 장치 탐지 정책이나 제품별 focus 대상을 결정하지 않는다.
 */
export type MenuUICloseInteraction = "mouse" | "touch" | "pen" | "keyboard" | "unknown";

/**
 * 메뉴가 닫힌 뒤 focus 복원 여부 또는 대상을 지정한다.
 *
 * 제품 화면의 focus 순서나 영구 focus 정책은 소유하지 않는다.
 */
export type MenuUIFinalFocus =
  | boolean
  | RefObject<HTMLElement | null>
  | ((interaction: MenuUICloseInteraction) => boolean | HTMLElement | null | undefined);

/**
 * menu role을 가진 popup의 배치·portal·focus 복원을 구성한다.
 *
 * 항목의 제품 순서나 action 실행 의미는 결정하지 않는다.
 */
export interface MenuUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: MenuUIPlacementSide;
  align?: MenuUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: MenuUIFinalFocus;
}

/**
 * 메뉴 항목의 시각적 강조 수준을 선택한다.
 *
 * 실제 위험도 판정이나 확인 절차는 수행하지 않는다.
 */
export type MenuUIItemVariant = "default" | "danger";

/**
 * 일반 menuitem의 DOM·disabled·선택 후 닫힘 계약을 구성한다.
 *
 * 선택 시 실행할 제품 부작용은 구현하지 않는다.
 */
export interface MenuUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  disabled?: boolean;
  label?: string;
  closeOnSelect?: boolean;
  variant?: MenuUIItemVariant;
}

/**
 * boolean menuitem의 제어·비제어 checked 상태와 변경 callback을 구성한다.
 *
 * 선택값의 제품 저장 위치나 영속화는 소유하지 않는다.
 */
export interface MenuUICheckboxItemProps extends Omit<MenuUIItemProps, "onChange"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: MenuUIChangeDetails) => void;
}

/**
 * 상호 배타적인 radio 항목의 값 범위와 변경 callback을 구성한다.
 *
 * 값의 제품 의미나 저장 방식은 해석하지 않는다.
 */
export interface MenuUIRadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  onValueChange?: (value: string, details: MenuUIChangeDetails) => void;
}

/**
 * radio group 안에서 선택 가능한 값 하나의 menuitem 계약이다.
 *
 * 값 사이의 우선순위나 제품 기본값은 결정하지 않는다.
 */
export interface MenuUIRadioItemProps extends MenuUIItemProps {
  value: string;
}

/**
 * 메뉴 항목 묶음 사이의 separator 의미와 방향을 구성한다.
 *
 * 제품 action의 그룹 기준이나 순서는 정의하지 않는다.
 */
export interface MenuUISeparatorProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  orientation?: "horizontal" | "vertical";
}

/**
 * 부모 메뉴 안에서 중첩 메뉴 Root가 사용할 상태 계약이다.
 *
 * 독립 modal 정책이나 하위 action 모델은 포함하지 않는다.
 */
export type MenuUISubmenuProps = Omit<MenuUIProps, "modal">;

/**
 * 중첩 메뉴를 여는 menuitem의 hover 지연과 항목 계약을 구성한다.
 *
 * 중첩 action의 권한이나 가용성은 판단하지 않는다.
 */
export interface MenuUISubmenuTriggerProps extends Omit<MenuUIItemProps, "closeOnSelect"> {
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
}

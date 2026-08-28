import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/**
 * select 루트가 단일 선택에 사용하는 고유 값, 표시 label과 비활성 여부다.
 *
 * 태그 저장 형식, 조회 상태와 애플리케이션 업무 정보는 포함하지 않는다.
 */
export interface SelectUIOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * select의 값과 열림 상태 변경 원인을 나타내는 프로젝트 소유 문자열 집합이다.
 *
 * Base UI 이벤트 객체나 공급자 전용 상세 정보는 공개하지 않는다.
 */
export type SelectUIChangeReason =
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

/**
 * select callback이 변경 값과 함께 전달하는 안정적인 프로젝트 변경 정보다.
 *
 * native event와 Base UI의 내부 상태 또는 세부 타입은 전달하지 않는다.
 */
export interface SelectUIChangeDetails {
  reason: SelectUIChangeReason;
}

/**
 * 입력 없는 단일 선택의 값, 열림 상태와 callback을 구성하는 `Root` props다.
 *
 * 여러 태그 편집, 선택지 조회와 애플리케이션 저장 계약은 제공하지 않는다.
 */
export interface SelectUIProps {
  children?: ReactNode;
  items: readonly SelectUIOption[];
  value?: string | null;
  defaultValue?: string | null;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  id?: string;
  modal?: boolean;
  onValueChange?: (value: string | null, details: SelectUIChangeDetails) => void;
  onOpenChange?: (open: boolean, details: SelectUIChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

/**
 * 접근 가능한 trigger 이름과 label 영역의 div 속성 및 ref를 구성하는 props다.
 *
 * 유효성 검사, 오류 메시지와 선택 상태는 소유하지 않는다.
 */
export interface SelectUILabelProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * options surface를 여는 button의 native 속성, 사용자 render와 ref를 구성하는 props다.
 *
 * 선택 값을 직접 저장하거나 애플리케이션 동작을 실행하지 않는다.
 */
export interface SelectUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
}

/**
 * 현재 선택 label 또는 placeholder 영역의 span 속성과 ref를 구성하는 props다.
 *
 * 표시 문자열을 선택 값으로 변환하거나 선택 상태를 변경하지 않는다.
 */
export interface SelectUIValueProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
  placeholder?: ReactNode;
}

/**
 * 현재 선택을 지우는 button의 native 속성과 ref를 구성하는 props다.
 *
 * 선택지 배열과 애플리케이션 저장 값을 삭제하지 않는다.
 */
export interface SelectUIClearProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/**
 * options popup을 배치할 수 있는 논리·물리 방향의 프로젝트 소유 문자열 집합이다.
 *
 * Base UI의 placement 타입이나 충돌 계산 세부 정보는 공개하지 않는다.
 */
export type SelectUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/**
 * options popup을 기준 축에서 정렬하는 프로젝트 소유 문자열 집합이다.
 *
 * 위치 계산 방식과 Base UI 전용 타입은 공개하지 않는다.
 */
export type SelectUIPlacementAlign = "start" | "center" | "end";

/**
 * portalled options surface의 div 속성, 위치와 ref를 구성하는 props다.
 *
 * 선택지 조회, 변환과 선택 상태는 소유하지 않는다.
 */
export interface SelectUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: SelectUIPlacementSide;
  align?: SelectUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
}

/**
 * 단일 선택 listbox의 div 속성과 ref를 구성하는 props다.
 *
 * 선택지 내용과 현재 선택 상태를 소유하지 않는다.
 */
export interface SelectUIListProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * 하나의 option 값, label, 비활성 여부, 요소 속성과 ref를 구성하는 props다.
 *
 * 루트에 없는 값을 생성하거나 선택 결과를 영속화하지 않는다.
 */
export interface SelectUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLElement>;
  value: string;
  label?: string;
  disabled?: boolean;
}

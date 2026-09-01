import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";

/**
 * combobox 루트가 검색과 선택에 사용하는 고유 값, 표시 label과 비활성 여부다.
 *
 * 경로 정보, 조회 상태나 애플리케이션 저장 형식은 포함하지 않는다.
 */
export interface ComboboxUIOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * combobox의 값, 검색어와 열림 상태 변경 원인을 나타내는 프로젝트 소유 문자열 집합이다.
 *
 * Base UI 이벤트 객체나 공급자 전용 상세 정보는 공개하지 않는다.
 */
export type ComboboxUIChangeReason =
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

/**
 * combobox callback이 변경 값과 함께 전달하는 안정적인 프로젝트 변경 정보다.
 *
 * native event와 Base UI의 내부 상태 또는 세부 타입은 전달하지 않는다.
 */
export interface ComboboxUIChangeDetails {
  reason: ComboboxUIChangeReason;
}

/**
 * 미리 정의된 단일 선택의 값, 검색어, 열림 상태와 callback을 구성하는 `Root` props다.
 *
 * 임의 입력 확정, 선택지 조회와 애플리케이션 경로 이동 계약은 제공하지 않는다.
 */
export interface ComboboxUIProps {
  children?: ReactNode;
  items: readonly ComboboxUIOption[];
  value?: string | null;
  defaultValue?: string | null;
  inputValue?: string;
  defaultInputValue?: string;
  open?: boolean;
  defaultOpen?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  id?: string;
  autoHighlight?: boolean;
  loopFocus?: boolean;
  modal?: boolean;
  onValueChange?: (value: string | null, details: ComboboxUIChangeDetails) => void;
  onInputValueChange?: (value: string, details: ComboboxUIChangeDetails) => void;
  onOpenChange?: (open: boolean, details: ComboboxUIChangeDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

/**
 * 접근 가능한 입력 이름과 label 요소의 native 속성 및 ref를 구성하는 props다.
 *
 * 유효성 검사, 오류 메시지와 선택 상태는 소유하지 않는다.
 */
export interface ComboboxUILabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  ref?: Ref<HTMLLabelElement>;
}

/**
 * 입력 control 묶음의 div 속성, class와 ref를 구성하는 props다.
 *
 * 검색어, 선택 값과 열림 상태를 소유하지 않는다.
 */
export interface ComboboxUIInputGroupProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

/**
 * 선택지를 거르는 입력의 native 속성과 ref를 구성하는 props다.
 *
 * 자유 입력 선택이나 새 선택지 생성 계약은 제공하지 않는다.
 */
export interface ComboboxUIInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

/**
 * options surface를 여는 button의 native 속성, 사용자 render와 ref를 구성하는 props다.
 *
 * 애플리케이션 이동 또는 선택 값 저장 동작은 포함하지 않는다.
 */
export interface ComboboxUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
}

/**
 * 검색어와 선택 값을 지우는 button의 native 속성, 유지 정책과 ref를 구성하는 props다.
 *
 * 선택지 데이터와 애플리케이션 저장 값을 삭제하지 않는다.
 */
export interface ComboboxUIClearProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  render?: ReactElement;
  keepMounted?: boolean;
}

/**
 * options popup을 배치할 수 있는 논리·물리 방향의 프로젝트 소유 문자열 집합이다.
 *
 * Base UI의 placement 타입이나 충돌 계산 세부 정보는 공개하지 않는다.
 */
export type ComboboxUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/**
 * options popup을 기준 축에서 정렬하는 프로젝트 소유 문자열 집합이다.
 *
 * 위치 계산 방식과 Base UI 전용 타입은 공개하지 않는다.
 */
export type ComboboxUIPlacementAlign = "start" | "center" | "end";

/**
 * portalled options surface의 div 속성, 위치, 유지 정책과 ref를 구성하는 props다.
 *
 * 선택지 조회, 변환과 선택 상태는 소유하지 않는다.
 */
export interface ComboboxUIContentProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  side?: ComboboxUIPlacementSide;
  align?: ComboboxUIPlacementAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  keepMounted?: boolean;
  portalContainer?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
}

/**
 * listbox의 div 속성, ref와 선택지별 표시 함수를 구성하는 props다.
 *
 * 필터 알고리즘과 선택지의 고유 값은 변경하지 않는다.
 */
export interface ComboboxUIListProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  ref?: Ref<HTMLDivElement>;
  renderItem?: (option: ComboboxUIOption) => ReactNode;
}

/**
 * 하나의 option 값, 비활성 여부, div 속성과 ref를 구성하는 props다.
 *
 * 루트에 없는 값을 생성하거나 선택 결과를 영속화하지 않는다.
 */
export interface ComboboxUIItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
  value: string;
  disabled?: boolean;
}

/**
 * 검색 결과가 없을 때 표시할 영역의 div 속성과 ref를 구성하는 props다.
 *
 * 검색어와 선택지 목록을 변경하지 않는다.
 */
export interface ComboboxUIEmptyProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

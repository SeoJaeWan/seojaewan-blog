import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

/**
 * PopoverUI.Content를 anchor 기준으로 배치할 side를 정의한다.
 *
 * 실제 viewport 충돌 보정 결과나 좌표 계산은 이 타입이 보장하지 않는다.
 */
export type PopoverUIPlacementSide =
  "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";

/**
 * PopoverUI.Content를 선택한 side 안에서 정렬할 기준을 정의한다.
 *
 * text direction이나 viewport 충돌 정책은 이 타입이 소유하지 않는다.
 */
export type PopoverUIPlacementAlign = "start" | "center" | "end";

/**
 * PopoverUI의 열림 상태가 바뀐 프로젝트 수준 원인을 정의한다.
 *
 * Base UI event 객체나 내부 구현 세부 사항은 공개하지 않는다.
 */
export type PopoverUIOpenChangeReason =
  | "trigger-hover"
  | "trigger-focus"
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "none";

/**
 * PopoverUI 열림 상태 변경 callback에 전달할 안정적인 세부 정보를 정의한다.
 *
 * 이 타입은 원시 event나 Base UI 내부 상태를 노출하지 않는다.
 */
export interface PopoverUIOpenChangeDetails {
  /** 내부 primitive event를 노출하지 않는 안정적인 변경 원인이다. */
  reason: PopoverUIOpenChangeReason;
}

/**
 * anchor에 연결된 non-modal 보조 surface의 controlled 또는 uncontrolled 상태를 정의한다.
 *
 * PopoverUI는 focus를 격리하거나 애플리케이션 상태를 소유하지 않으며 페이지 상호작용을 막으려면 DialogUI를 사용한다.
 */
export interface PopoverUIProps {
  children?: ReactNode;
  /** uncontrolled 사용의 초기 열림 상태다. */
  defaultOpen?: boolean;
  /** controlled 사용의 현재 열림 상태다. */
  open?: boolean;
  /** 프로젝트 소유 열기와 닫기 원인을 보고한다. */
  onOpenChange?: (open: boolean, details: PopoverUIOpenChangeDetails) => void;
  /** 열기 또는 닫기 전환이 끝난 뒤 실행한다. */
  onOpenChangeComplete?: (open: boolean) => void;
}

/**
 * PopoverUI.Content의 anchor이자 toggle인 visible button prop을 정의한다.
 *
 * trigger가 나타내는 애플리케이션 동작의 의미는 소비자가 소유한다.
 */
export interface PopoverUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** trigger 동작을 유지하면서 native button을 교체한다. */
  render?: ReactElement;
}

/**
 * PopoverUI.Trigger 기준으로 배치되는 portalled surface prop을 정의한다.
 *
 * 이 타입은 modal focus 격리나 애플리케이션 stacking 정책을 제공하지 않는다.
 */
export interface PopoverUIContentProps extends HTMLAttributes<HTMLDivElement> {
  align?: PopoverUIPlacementAlign;
  alignOffset?: number;
  collisionPadding?: number;
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
  keepMounted?: boolean;
  side?: PopoverUIPlacementSide;
  sideOffset?: number;
}

/**
 * PopoverUI.Content의 접근 가능한 이름을 제공하는 heading prop을 정의한다.
 *
 * 제목 문구나 애플리케이션 정보 구조는 소비자가 소유한다.
 */
export type PopoverUITitleProps = HTMLAttributes<HTMLHeadingElement>;
/**
 * PopoverUI.Content를 설명하는 supporting text prop을 정의한다.
 *
 * 설명 문구나 도메인 도움말 정책은 소비자가 소유한다.
 */
export type PopoverUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * 자신이 속한 PopoverUI를 닫는 button prop을 정의한다.
 *
 * 닫기 뒤 실행할 비즈니스 결과나 탐색은 소비자가 결정한다.
 */
export interface PopoverUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** close 동작을 유지하면서 native button을 교체한다. */
  render?: ReactElement;
}

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";

/**
 * DialogUI의 열림 상태가 바뀐 프로젝트 수준 원인을 정의한다.
 *
 * Base UI event 객체나 내부 구현 세부 사항은 공개하지 않는다.
 */
export type DialogUIOpenChangeReason =
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-press"
  | "focus-out"
  | "imperative-action"
  | "none";

/**
 * DialogUI 열림 상태 변경 callback에 전달할 안정적인 세부 정보를 정의한다.
 *
 * 이 타입은 원시 event나 Base UI 내부 상태를 노출하지 않는다.
 */
export interface DialogUIOpenChangeDetails {
  /** 내부 primitive event를 노출하지 않는 안정적인 변경 원인이다. */
  reason: DialogUIOpenChangeReason;
}

/**
 * 페이지 뒤쪽과 focus를 격리하는 modal surface의 controlled 또는 uncontrolled 상태를 정의한다.
 *
 * DialogUI는 비즈니스 확인, 저장이나 탐색을 소유하지 않으며 anchored non-modal content에는 PopoverUI를 사용한다.
 */
export interface DialogUIProps {
  children?: ReactNode;
  /** uncontrolled 사용의 초기 열림 상태다. */
  defaultOpen?: boolean;
  /** dialog 바깥 pointer 상호작용으로 닫히는 것을 막는다. */
  disablePointerDismissal?: boolean;
  /** controlled 사용의 현재 열림 상태다. */
  open?: boolean;
  /** 프로젝트 소유 열기와 닫기 원인을 보고한다. */
  onOpenChange?: (open: boolean, details: DialogUIOpenChangeDetails) => void;
  /** 열기 또는 닫기 전환이 끝난 뒤 실행한다. */
  onOpenChangeComplete?: (open: boolean) => void;
}

/**
 * DialogUI.Content를 여는 visible button prop을 정의한다.
 *
 * trigger가 나타내는 애플리케이션 동작의 의미는 소비자가 소유한다.
 */
export interface DialogUITriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** trigger 동작을 유지하면서 native button을 교체한다. */
  render?: ReactElement;
}

/**
 * DialogUI layer를 애플리케이션 content 위에 렌더링하는 portal prop을 정의한다.
 *
 * product 수준 stacking이나 routing 정책은 이 타입이 소유하지 않는다.
 */
export interface DialogUIPortalProps extends HTMLAttributes<HTMLDivElement> {
  container?: HTMLElement | ShadowRoot | RefObject<HTMLElement | ShadowRoot | null> | null;
  keepMounted?: boolean;
}

/**
 * modal DialogUI.Content 뒤의 visual layer prop을 정의한다.
 *
 * outside dismissal 허용 여부는 DialogUI가 결정한다.
 */
export type DialogUIBackdropProps = HTMLAttributes<HTMLDivElement>;

/**
 * focus를 격리하는 modal surface의 native div prop을 정의한다.
 *
 * 비즈니스 작업을 완료하거나 취소할 수 있는지는 이 타입이 결정하지 않는다.
 */
export interface DialogUIContentProps extends HTMLAttributes<HTMLDivElement> {
  finalFocus?: boolean | RefObject<HTMLElement | null>;
  initialFocus?: boolean | RefObject<HTMLElement | null>;
}

/**
 * DialogUI.Content의 접근 가능한 이름을 제공하는 heading prop을 정의한다.
 *
 * 제목 문구나 애플리케이션 정보 구조는 소비자가 소유한다.
 */
export type DialogUITitleProps = HTMLAttributes<HTMLHeadingElement>;
/**
 * DialogUI.Content를 설명하는 supporting text prop을 정의한다.
 *
 * 설명 문구나 도메인 도움말 정책은 소비자가 소유한다.
 */
export type DialogUIDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/**
 * 자신이 속한 DialogUI를 닫는 button prop을 정의한다.
 *
 * 닫기 뒤 실행할 비즈니스 결과나 탐색은 소비자가 결정한다.
 */
export interface DialogUICloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** close 동작을 유지하면서 native button을 교체한다. */
  render?: ReactElement;
}

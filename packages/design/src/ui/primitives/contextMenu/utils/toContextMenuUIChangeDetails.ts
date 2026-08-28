import type {
  ContextMenuUIChangeDetails,
  ContextMenuUIOpenChangeReason,
} from "../contextMenuUI.types";

/**
 * Base UI가 전달한 변경 이유를 프로젝트가 공개하는 안정적인 변경 세부 정보로 변환한다.
 *
 * 값의 업무적 의미나 후속 동작은 해석하지 않고 vendor 계약과 UI 계약의 경계만 소유한다.
 */
export const toContextMenuUIChangeDetails = (reason: string): ContextMenuUIChangeDetails => ({
  reason: reason as ContextMenuUIOpenChangeReason,
});

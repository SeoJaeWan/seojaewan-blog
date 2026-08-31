import type { ContextMenuUIChangeDetails } from "../contextMenuUI.types";

type ContextMenuUIChangeDetailsInput = Pick<ContextMenuUIChangeDetails, "reason">;

/**
 * Base UI가 전달한 변경 세부 정보에서 프로젝트가 공개하는 변경 이유만 복사한다.
 *
 * vendor event와 제어 필드는 경계 안에 남기고 매 호출마다 새로운 프로젝트 소유 snapshot을 만든다.
 */
export const toContextMenuUIChangeDetails = (
  details: ContextMenuUIChangeDetailsInput,
): ContextMenuUIChangeDetails => ({ reason: details.reason });

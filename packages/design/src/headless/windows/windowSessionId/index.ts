/**
 * @file Resource와 분리된 WindowSession runtime UUID identity를 정의한다.
 *
 * ID 발급과 Session 존재 확인은 이 파일의 책임이 아니다.
 */
declare const windowSessionIdBrand: unique symbol;

/**
 * 하나의 실행 중인 WindowSession을 식별하는 runtime UUID다.
 *
 * Resource identity와 호환되지 않으며 browser reload 뒤 복원되는 identity가 아니다.
 */
export type WindowSessionId = string & {
  readonly [windowSessionIdBrand]: "WindowSessionId";
};

const WINDOW_SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 입력값을 `WindowSessionId`로 해석할 수 없을 때 발생한다.
 *
 * Session의 실제 존재 여부는 확인하지 않는다.
 */
export class InvalidWindowSessionIdError extends TypeError {
  /**
   * 잘못된 입력을 포함하는 UUID 형식 오류를 만든다.
   */
  constructor(value: unknown) {
    super(`WindowSessionId는 유효한 UUID 형식이어야 합니다: ${String(value)}`);
    this.name = "InvalidWindowSessionIdError";
  }
}

/**
 * 입력값이 지원하는 UUID 형식의 `WindowSessionId`인지 판정한다.
 *
 * Session 존재 여부나 다른 runtime ID와의 충돌은 판정하지 않는다.
 */
export const isWindowSessionId = (value: unknown): value is WindowSessionId =>
  typeof value === "string" && WINDOW_SESSION_ID_PATTERN.test(value);

/**
 * UUID 문자열을 검증하고 `WindowSessionId`로 좁힌다.
 *
 * 새 ID를 발급하거나 Session 존재 여부를 확인하지 않는다.
 */
export const parseWindowSessionId = (value: string): WindowSessionId => {
  if (!isWindowSessionId(value)) {
    throw new InvalidWindowSessionIdError(value);
  }

  return value;
};

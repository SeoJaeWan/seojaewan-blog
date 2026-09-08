/**
 * @file 모든 Resource가 공유하는 전역 UUID identity의 검증 계약을 정의한다.
 *
 * ID 발급과 Resource 존재 확인은 이 파일의 책임이 아니다.
 */
declare const resourceIdBrand: unique symbol;

/**
 * 모든 Resource 종류가 공유하는 전역 UUID identity를 나타낸다.
 *
 * ID 발급과 저장은 소유하지 않으며, 새 ID가 필요할 때는 Workspace 내부의 공통
 * `IdGenerator`를 사용한다.
 */
export type ResourceId = string & {
  readonly [resourceIdBrand]: "ResourceId";
};

const RESOURCE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 입력값을 유효한 `ResourceId`로 해석할 수 없을 때 발생한다.
 *
 * Resource의 존재 여부나 kind 일치는 판정하지 않으며, 해당 검증은 Catalog와
 * `ResourceLookup`이 소유한다.
 */
export class InvalidResourceIdError extends TypeError {
  /**
   * 검증에 실패한 입력을 포함하는 UUID 형식 오류를 만든다.
   *
   * 입력을 수정하거나 새 ID를 발급하지 않는다.
   */
  constructor(value: unknown) {
    super(`ResourceId는 유효한 UUID 형식이어야 합니다: ${String(value)}`);
    this.name = "InvalidResourceIdError";
  }
}

/**
 * 입력값이 지원하는 UUID 형식의 `ResourceId`인지 판정한다.
 *
 * 문자열을 변환하거나 새 ID를 생성하지 않으며, 오류가 필요한 경계에서는
 * `parseResourceId`를 사용한다.
 */
export const isResourceId = (value: unknown): value is ResourceId =>
  typeof value === "string" && RESOURCE_ID_PATTERN.test(value);

/**
 * UUID 문자열을 검증하고 변경하지 않은 `ResourceId`로 좁힌다.
 *
 * 새 ID 생성과 Resource 존재 확인은 소유하지 않으며, 잘못된 값에는
 * `InvalidResourceIdError`를 던진다.
 */
export const parseResourceId = (value: string): ResourceId => {
  if (!isResourceId(value)) {
    throw new InvalidResourceIdError(value);
  }

  return value;
};

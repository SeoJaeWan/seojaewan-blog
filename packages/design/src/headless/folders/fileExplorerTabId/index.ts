/**
 * @file File Explorer tab의 runtime UUID identity를 정의한다.
 *
 * ID 발급과 tab 존재 확인은 이 파일의 책임이 아니다.
 */
declare const fileExplorerTabIdBrand: unique symbol;

/**
 * 하나의 File Explorer tab을 식별하는 runtime UUID다.
 *
 * ResourceId, WindowSessionId와 호환되지 않으며 runtime 밖에 저장하지 않는다.
 */
export type FileExplorerTabId = string & {
  readonly [fileExplorerTabIdBrand]: "FileExplorerTabId";
};

const FILE_EXPLORER_TAB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 입력값을 `FileExplorerTabId`로 해석할 수 없을 때 발생한다.
 *
 * tab의 실제 존재 여부는 확인하지 않는다.
 */
export class InvalidFileExplorerTabIdError extends TypeError {
  /**
   * 잘못된 입력을 포함하는 UUID 형식 오류를 만든다.
   */
  constructor(value: unknown) {
    super(`FileExplorerTabId는 유효한 UUID 형식이어야 합니다: ${String(value)}`);
    this.name = "InvalidFileExplorerTabIdError";
  }
}

/**
 * 입력값이 지원하는 UUID 형식의 `FileExplorerTabId`인지 판정한다.
 *
 * tab 존재 여부나 다른 runtime ID와의 충돌은 판정하지 않는다.
 */
export const isFileExplorerTabId = (value: unknown): value is FileExplorerTabId =>
  typeof value === "string" && FILE_EXPLORER_TAB_ID_PATTERN.test(value);

/**
 * UUID 문자열을 검증하고 `FileExplorerTabId`로 좁힌다.
 *
 * 새 ID를 발급하거나 tab 존재 여부를 확인하지 않는다.
 */
export const parseFileExplorerTabId = (value: string): FileExplorerTabId => {
  if (!isFileExplorerTabId(value)) {
    throw new InvalidFileExplorerTabIdError(value);
  }

  return value;
};

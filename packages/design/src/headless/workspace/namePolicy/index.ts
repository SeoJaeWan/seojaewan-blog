/**
 * @file Folder 이름의 Windows 호환 검증, 정규화와 비교 규칙을 정의한다.
 *
 * Store mutation과 Workspace selector가 같은 key를 사용하도록 이 module에 규칙을 모은다.
 */

/** Folder 이름 검증이 거절된 수정 가능한 이유다. */
export type FolderNameFailureReason =
  | "folder-name-empty"
  | "folder-name-too-long"
  | "folder-name-invalid-character"
  | "folder-name-relative-segment"
  | "folder-name-reserved"
  | "folder-name-trailing-space-or-period";

/** 검증되고 NFC로 정규화된 Folder 이름과 비교 key다. */
export type ValidFolderName = Readonly<{
  ok: true;
  name: string;
  comparisonKey: string;
}>;

/** Folder 이름 검증 거절 결과다. */
export type InvalidFolderName = Readonly<{
  ok: false;
  reason: FolderNameFailureReason;
}>;

/** Folder 이름 검증 결과다. */
export type FolderNameValidation = ValidFolderName | InvalidFolderName;

const FORBIDDEN_CHARACTERS = new Set('<>:"/\\|?*');
const RESERVED_DEVICE_NAME =
  /^(?:CON|PRN|AUX|NUL|COM[1-9\u00b9\u00b2\u00b3]|LPT[1-9\u00b9\u00b2\u00b3])$/iu;

/** 이름을 Workspace가 저장하고 비교하는 NFC 표현으로 정규화한다. */
export const normalizeFolderName = (name: string): string => name.normalize("NFC");

/** 정규화와 Unicode 소문자 변환을 적용한 locale-independent 비교 key를 만든다. */
export const getFolderNameComparisonKey = (name: string): string =>
  normalizeFolderName(name).toLowerCase();

/** Folder 이름을 case-insensitive key 기준으로 정렬한다. */
export const compareFolderNames = (left: string, right: string): number => {
  const leftKey = getFolderNameComparisonKey(left);
  const rightKey = getFolderNameComparisonKey(right);
  if (leftKey < rightKey) return -1;
  if (leftKey > rightKey) return 1;
  return 0;
};

/**
 * Folder 이름을 NFC로 정규화한 뒤 Windows형 이름 제약을 검사한다.
 *
 * 성공 결과의 name만 Store에 저장하면 검증과 비교가 같은 canonical 표현을 사용한다.
 */
export const validateFolderName = (input: string): FolderNameValidation => {
  const name = normalizeFolderName(input);

  if (name.length === 0 || name.trim().length === 0) {
    return { ok: false, reason: "folder-name-empty" };
  }

  if ([...name].length > 255) {
    return { ok: false, reason: "folder-name-too-long" };
  }

  if (
    [...name].some(
      (character) =>
        (character.codePointAt(0) ?? Number.POSITIVE_INFINITY) <= 0x1f ||
        FORBIDDEN_CHARACTERS.has(character),
    )
  ) {
    return { ok: false, reason: "folder-name-invalid-character" };
  }

  if (name === "." || name === "..") {
    return { ok: false, reason: "folder-name-relative-segment" };
  }

  if (name.endsWith(" ") || name.endsWith(".")) {
    return { ok: false, reason: "folder-name-trailing-space-or-period" };
  }

  const [stem = ""] = name.split(".", 1);
  if (RESERVED_DEVICE_NAME.test(stem)) {
    return { ok: false, reason: "folder-name-reserved" };
  }

  return { ok: true, name, comparisonKey: getFolderNameComparisonKey(name) };
};

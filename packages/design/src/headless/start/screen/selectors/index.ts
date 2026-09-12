/**
 * @file Start 모두 보기의 Resource item과 canonical category group을 파생한다.
 *
 * Folder, Pin persistence, DOM heading, scroll과 index overlay state는 이 selector가 소유하지 않는다.
 */
import type {
  ContentResourceRef,
  ExternalShortcutResourceRef,
  ResourceReaders,
} from "../../../resources/index.js";

/** Start index와 모두 보기 section이 공유하는 canonical group 순서다. */
export const START_SCREEN_GROUP_ORDER = Object.freeze([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "ㄱ",
  "ㄴ",
  "ㄷ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅅ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "#",
] as const);

/** Start 모두 보기에서 사용할 Latin, 한글 초성, 숫자 또는 기호 group key다. */
export type StartScreenGroupKey = (typeof START_SCREEN_GROUP_ORDER)[number];

/** 모두 보기에서 표시할 Content 또는 ExternalShortcut의 immutable row model이다. */
export type StartScreenAllItem = Readonly<{
  resource: ContentResourceRef | ExternalShortcutResourceRef;
  label: string;
}>;

/** 동일한 canonical key에 속하며 label 오름차순인 모두 보기 section이다. */
export type StartScreenAllGroup = Readonly<{
  key: StartScreenGroupKey;
  items: readonly StartScreenAllItem[];
}>;

/** 한글 완성형 음절의 초성 순서와 호환 자모 key를 정의한다. */
const HANGUL_INITIALS = START_SCREEN_GROUP_ORDER.slice(26, 40) as readonly StartScreenGroupKey[];

/** label의 첫 Unicode 문자를 canonical Start group으로 분류한다. */
export const getStartScreenGroupKey = (label: string): StartScreenGroupKey => {
  const first = [...label][0] ?? "";
  const upper = first.toUpperCase();
  if (/^[A-Z]$/u.test(upper)) return upper as StartScreenGroupKey;
  if (/^[0-9]$/u.test(first)) return first as StartScreenGroupKey;

  const codePoint = first.codePointAt(0);
  if (codePoint !== undefined && codePoint >= 0xac00 && codePoint <= 0xd7a3) {
    return HANGUL_INITIALS[Math.floor((codePoint - 0xac00) / 588)] ?? "#";
  }
  if (HANGUL_INITIALS.includes(first as StartScreenGroupKey)) {
    return first as StartScreenGroupKey;
  }
  return "#";
};

/** current name/title을 안정적으로 정렬하고 동일 label은 kind와 ID로 순서를 고정한다. */
const compareAllItems = (left: StartScreenAllItem, right: StartScreenAllItem): number => {
  const labelOrder = left.label.localeCompare(right.label, "ko-KR");
  if (labelOrder !== 0) return labelOrder;
  const kindOrder = left.resource.kind.localeCompare(right.resource.kind);
  return kindOrder !== 0 ? kindOrder : left.resource.id.localeCompare(right.resource.id);
};

/** Resource 원본에서 top-level ref와 현재 표시 label만 복제해 immutable row를 만든다. */
const item = (
  resource: ContentResourceRef | ExternalShortcutResourceRef,
  label: string,
): StartScreenAllItem =>
  Object.freeze({
    resource: Object.freeze({ ...resource }),
    label,
  });

/**
 * 현재 Content와 ExternalShortcut Catalog를 canonical group 순서의 immutable section으로 만든다.
 *
 * Folder reader와 enabled/disabled 상태를 조회하지 않으며 비어 있는 group은 결과에서 생략한다.
 */
export const selectStartScreenAllGroups = (
  readers: ResourceReaders,
): readonly StartScreenAllGroup[] => {
  const grouped = new Map<StartScreenGroupKey, StartScreenAllItem[]>();
  const items = [
    ...readers.content.list().map((content) => item(content.ref, content.title)),
    ...readers.externalShortcut.list().map((shortcut) => item(shortcut.ref, shortcut.name)),
  ];

  for (const current of items) {
    const key = getStartScreenGroupKey(current.label);
    const group = grouped.get(key);
    if (group === undefined) grouped.set(key, [current]);
    else group.push(current);
  }

  return Object.freeze(
    START_SCREEN_GROUP_ORDER.flatMap((key) => {
      const entries = grouped.get(key);
      return entries === undefined
        ? []
        : [Object.freeze({ key, items: Object.freeze(entries.sort(compareAllItems)) })];
    }),
  );
};

/**
 * @file 현재 typed Resource 원본으로 검색 정규화, 혼합 matching과 결정적인 순위를 계산한다.
 *
 * clock, 저장, DOM과 제품별 query 수명·후보 범위·화면 투영은 소유하지 않는다.
 */
import type { ResourceKind } from "../../model/index.js";
import type {
  ResourceSearchInput,
  ResourceSearchMatch,
  ResourceSearchTier,
} from "../model/index.js";

const INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const TIER_ORDER: Record<ResourceSearchTier, number> = {
  exact: 0,
  prefix: 1,
  contains: 2,
  words: 3,
  metadata: 4,
};
const KIND_ORDER: Record<ResourceKind, number> = { content: 0, folder: 1, "external-shortcut": 2 };
const NAME_COLLATOR = new Intl.Collator("ko-KR");

/**
 * 원문을 NFC, 대소문자 무시와 whitespace 축약 기준의 검색용 문자열로 변환한다.
 *
 * 원문을 변경하지 않으며 빈 결과의 기본 화면과 IME 확정은 소비 제품이 결정한다.
 */
export const normalizeResourceSearchQuery = (raw: string): string =>
  raw.normalize("NFC").toLowerCase().trim().replace(/\s+/gu, " ");

/**
 * 일반 문자는 그대로, 초성 문자는 대응 한글 음절의 초성 또는 같은 문자와 비교한다.
 *
 * 완성 음절의 모음·종성, typo와 edit distance는 확장해서 비교하지 않는다.
 */
const matchesCharacter = (query: string, target: string): boolean => {
  if (query === target) return true;
  const initialIndex = INITIALS.indexOf(query);
  const syllable = target.codePointAt(0) ?? 0;
  return initialIndex >= 0 && syllable >= 0xac00 && syllable <= 0xd7a3
    ? Math.floor((syllable - 0xac00) / 588) === initialIndex
    : false;
};

/**
 * 정규화한 문구가 target에 연속으로 일치하는 최초 code point 위치를 반환한다.
 *
 * 정규식 특수 문자도 일반 문자로 비교하고 불일치는 -1로 나타낸다.
 */
const findPhrase = (query: readonly string[], target: readonly string[]): number => {
  for (let start = 0; start <= target.length - query.length; start += 1) {
    if (
      query.every((character, index) => matchesCharacter(character, target[start + index] ?? ""))
    ) {
      return start;
    }
  }
  return -1;
};

/**
 * 전체 문구 우선 단계를 판별하고, 불일치하면 name/title 단어 AND와 metadata를 평가한다.
 *
 * metadata 필드 사이 문자열을 이어 붙이지 않으며 각 단어는 하나의 허용 필드에서 일치해야 한다.
 */
const selectTier = (
  phrase: readonly string[],
  words: readonly (readonly string[])[],
  name: readonly string[],
  metadata: readonly (readonly string[])[],
): ResourceSearchTier | null => {
  const position = findPhrase(phrase, name);
  if (position === 0) return phrase.length === name.length ? "exact" : "prefix";
  if (position > 0) return "contains";
  if (words.every((word) => findPhrase(word, name) >= 0)) return "words";
  if (words.every((word) => [name, ...metadata].some((field) => findPhrase(word, field) >= 0))) {
    return "metadata";
  }
  return null;
};

/**
 * 마지막 동률을 입력 순서와 locale에 의존하지 않는 고정 id 문자열 순서로 비교한다.
 */
const compareId = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

/**
 * Content date를 시각 값으로 읽으며 해석 불가능한 값은 모든 유효 날짜 뒤에 둔다.
 *
 * 현재 시각을 읽지 않고 입력 문자열만 해석한다.
 */
const dateValue = (date: string): number => {
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

/**
 * 허용 후보를 typed reader로 읽고 일치 단계·종류·날짜/이름·id 순으로 ref를 반환한다.
 *
 * 빈 query는 reader 조회 없이 빈 결과를 반환한다. 없는 후보는 제외하고 중복 ref는 한 번만
 * 반환한다. reader 오류는 전파하며 입력 원본·순서·배치와 일반 목록 정렬을 변경하지 않는다.
 */
export const searchResources = ({
  query,
  candidates,
  readers,
}: ResourceSearchInput): readonly ResourceSearchMatch[] => {
  const normalized = normalizeResourceSearchQuery(query);
  if (normalized === "") return [];
  const phrase = Array.from(normalized);
  const words = normalized.split(" ").map((word) => Array.from(word));
  const seen = new Set<string>();
  const matches: { match: ResourceSearchMatch; name: string; date: number }[] = [];

  for (const ref of candidates) {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let name: string;
    let metadata: readonly string[] = [];
    let date = Number.NEGATIVE_INFINITY;
    switch (ref.kind) {
      case "content": {
        const content = readers.content.get(ref.id);
        if (content === undefined) continue;
        name = content.title;
        metadata = [...content.tags, content.slug];
        date = dateValue(content.date);
        break;
      }
      case "folder": {
        const folder = readers.folder.get(ref.id);
        if (folder === undefined) continue;
        name = folder.name;
        break;
      }
      case "external-shortcut": {
        const shortcut = readers.externalShortcut.get(ref.id);
        if (shortcut === undefined) continue;
        name = shortcut.name;
        break;
      }
    }
    const normalizedName = normalizeResourceSearchQuery(name);
    const tier = selectTier(
      phrase,
      words,
      Array.from(normalizedName),
      metadata.map((field) => Array.from(normalizeResourceSearchQuery(field))),
    );
    if (tier !== null) matches.push({ match: { ref, tier }, name: normalizedName, date });
  }

  matches.sort((left, right) => {
    const tier = TIER_ORDER[left.match.tier] - TIER_ORDER[right.match.tier];
    if (tier !== 0) return tier;
    const kind = KIND_ORDER[left.match.ref.kind] - KIND_ORDER[right.match.ref.kind];
    if (kind !== 0) return kind;
    if (left.match.ref.kind === "content") {
      if (left.date !== right.date) return left.date > right.date ? -1 : 1;
    } else {
      const name = NAME_COLLATOR.compare(left.name, right.name);
      if (name !== 0) return name;
    }
    return compareId(left.match.ref.id, right.match.ref.id);
  });
  return matches.map(({ match }) => match);
};

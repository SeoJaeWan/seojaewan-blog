const HANGUL_INITIAL_CONSONANTS = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
] as const;

const HANGUL_INITIAL_CONSONANT_SET = new Set<string>(HANGUL_INITIAL_CONSONANTS);
const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_SYLLABLES_PER_INITIAL = 21 * 28;
const HANGUL_COMPATIBILITY_CONSONANT_START = 0x3131;
const HANGUL_COMPATIBILITY_CONSONANT_END = 0x314e;

/** 완성형 한글 음절이나 호환 자모를 panel/search에서 사용할 초성 key로 변환한다. */
export const getHangulInitialConsonant = (character: string): string | null => {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return null;
  }

  if (codePoint >= HANGUL_SYLLABLE_START && codePoint <= HANGUL_SYLLABLE_END) {
    return (
      HANGUL_INITIAL_CONSONANTS[
        Math.floor(
          (codePoint - HANGUL_SYLLABLE_START) / HANGUL_SYLLABLES_PER_INITIAL,
        )
      ] ?? null
    );
  }

  if (
    codePoint >= HANGUL_COMPATIBILITY_CONSONANT_START &&
    codePoint <= HANGUL_COMPATIBILITY_CONSONANT_END
  ) {
    return character[0] ?? null;
  }

  return null;
};

/** 문자열의 완성형 한글 음절을 초성으로 변환하고 나머지 문자는 그대로 보존한다. */
export const createHangulInitials = (value: string): string =>
  Array.from(value, (character) => getHangulInitialConsonant(character) ?? character).join("");

/** 공백을 제외한 query 전체가 검색 가능한 한글 초성인지 판별한다. */
export const isHangulInitialsQuery = (value: string): boolean => {
  let hasInitialConsonant = false;

  for (const character of value) {
    if (/\s/u.test(character)) {
      continue;
    }

    if (!HANGUL_INITIAL_CONSONANT_SET.has(character)) {
      return false;
    }

    hasInitialConsonant = true;
  }

  return hasInitialConsonant;
};

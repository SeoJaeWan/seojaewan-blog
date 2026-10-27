// 이름이 검색어와 맞는지와 그 단계를 정하는 규칙이다. 탐색기 폴더 안 검색이 쓰고, Start 검색이 쓰게 되면 shared로 옮긴다.

/** 일치 단계. 작을수록 앞이다. 0 이름 전체가 같음, 1 검색어로 시작, 2 중간에 포함 */
export type MatchRank = 0 | 1 | 2;

// 한글 음절의 첫소리(초성) 19개다. 음절 코드에서 첫소리 차례로 찾는다.
const CHOSEONG = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

// 한글 음절의 처음 코드와 첫소리 하나가 차지하는 음절 수(가운데소리 21 × 끝소리 28)다.
const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;
const SYLLABLES_PER_CHOSEONG = 588;

/**
 * 이름이 검색어와 맞는지와 그 단계를 정한다. 대소문자와 앞뒤 공백은 무시하고, 검색어가 한글 초성으로만 이루어져 있으면
 * 이름의 초성과 비교한다(`ㄹㅇㅌ` → "리액트").
 * @codocs [[검색:일치 규칙]]
 * @param name 이름
 * @param query 검색어
 * @returns 일치 단계. 맞지 않거나 검색어가 비었으면 null
 */
export function getMatchRank(name: string, query: string): MatchRank | null {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return null;
  }
  const haystack = isChoseongOnly(needle) ? getChoseong(name) : name.trim().toLowerCase();
  if (haystack === needle) {
    return 0;
  }
  if (haystack.startsWith(needle)) {
    return 1;
  }
  return haystack.includes(needle) ? 2 : null;
}

/**
 * 글자의 한글 음절을 초성으로 바꾼다. 한글 음절이 아닌 글자는 소문자로 그대로 둔다.
 * @codocs [[검색:일치 규칙]]
 * @param text 글자
 * @returns 초성으로 바꾼 글자
 */
export function getChoseong(text: string): string {
  return Array.from(text.trim().toLowerCase(), toChoseong).join('');
}

/**
 * 글자 하나가 한글 음절이면 그 초성으로 바꾼다.
 * @param character 글자 하나
 * @returns 초성. 한글 음절이 아니면 그대로
 */
function toChoseong(character: string): string {
  const code = character.charCodeAt(0);
  if (code < SYLLABLE_START || code > SYLLABLE_END) {
    return character;
  }
  return CHOSEONG[Math.floor((code - SYLLABLE_START) / SYLLABLES_PER_CHOSEONG)] ?? character;
}

/**
 * 검색어가 한글 초성으로만 이루어져 있는지 본다.
 * @param query 검색어(앞뒤 공백을 뺀 것)
 * @returns 초성으로만 이루어져 있으면 true
 */
function isChoseongOnly(query: string): boolean {
  return Array.from(query).every((character) =>
    CHOSEONG.some((choseong) => choseong === character),
  );
}

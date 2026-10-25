/**
 * 글자 격자의 글자 순서다. 기호로 시작(`&`), 숫자로 시작(`#`), `A`~`Z`, `ㄱ`~`ㅎ` 순서의 4열 격자다.
 * @codocs [[Start 메뉴:모두]]
 */
export const JUMP_LIST_LETTERS = [
  '&',
  '#',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

/** 글자 격자의 글자 하나 */
export type JumpListLetter = (typeof JUMP_LIST_LETTERS)[number];

/** 첫 글자로 묶을 항목. 이름만 본다 */
type LetterItem = {
  /** 항목 이름 */
  title: string;
};

/** 첫 글자로 묶은 묶음 하나 */
export type LetterGroup<T extends LetterItem> = {
  /** 묶음 글자 */
  label: JumpListLetter;
  /** 묶음 안의 항목. 이름순이다 */
  items: readonly T[];
};

// 한글 음절의 초성 19개(유니코드 순서). 된소리는 격자에 없어 예사소리 칸으로 모은다.
const syllableInitials = [
  'ㄱ',
  'ㄱ',
  'ㄴ',
  'ㄷ',
  'ㄷ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅂ',
  'ㅅ',
  'ㅅ',
  'ㅇ',
  'ㅈ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const satisfies readonly JumpListLetter[];

// 한글 음절 영역(가~힣)과 초성 하나에 딸린 음절 수(중성 21 × 종성 28)다.
const SYLLABLE_FIRST = 0xac00;
const SYLLABLE_LAST = 0xd7a3;
const SYLLABLES_PER_INITIAL = 588;

// 이름이 자음 낱자로 시작할 때(예: `ㅋㅋ`) 된소리를 예사소리 칸으로 옮기는 표다.
const doubleConsonants: Readonly<Record<string, JumpListLetter>> = {
  ㄲ: 'ㄱ',
  ㄸ: 'ㄷ',
  ㅃ: 'ㅂ',
  ㅆ: 'ㅅ',
  ㅉ: 'ㅈ',
};

// 묶음 안 이름순 비교. 한글과 라틴이 섞여도 사람이 읽는 순서로 놓는다.
const titleCollator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

/**
 * 글자 격자의 글자인지 본다.
 * @param value 볼 글자
 * @returns 격자에 있는 글자면 true
 */
function isJumpListLetter(value: string): value is JumpListLetter {
  return JUMP_LIST_LETTERS.some((letter) => letter === value);
}

/**
 * 항목 이름이 어느 글자 묶음에 들어가는지 구한다. 숫자는 `#`, 라틴 글자는 대문자(악센트는 뗀다), 한글은 초성(된소리는 예사소리)이다.
 * 기호와 그 밖의 글자(격자에 칸이 없는 문자)는 `&`로 모은다. Windows의 지구본(기타 문자) 칸을 두지 않기 때문이다.
 * @codocs [[Start 메뉴:모두]]
 * @param title 항목 이름
 * @returns 묶음 글자
 */
export function getStartLetter(title: string): JumpListLetter {
  const first = title.trim().normalize('NFC').charAt(0);
  if (/\d/u.test(first)) {
    return '#';
  }
  const code = first.codePointAt(0) ?? 0;
  if (code >= SYLLABLE_FIRST && code <= SYLLABLE_LAST) {
    return syllableInitials[Math.floor((code - SYLLABLE_FIRST) / SYLLABLES_PER_INITIAL)] ?? '&';
  }
  const doubled = doubleConsonants[first];
  if (doubled !== undefined) {
    return doubled;
  }
  // 악센트를 떼어(É → E) 라틴 대문자로 맞춘다.
  const latin = first.normalize('NFD').charAt(0).toUpperCase();
  return isJumpListLetter(latin) ? latin : '&';
}

/**
 * 항목을 첫 글자로 묶는다. 묶음은 글자 격자 순서, 묶음 안은 이름순이다. 항목이 없는 글자의 묶음은 만들지 않는다.
 * @codocs [[Start 메뉴:모두]]
 * @param items 묶을 항목
 * @returns 글자 묶음
 */
export function groupByStartLetter<T extends LetterItem>(items: readonly T[]): LetterGroup<T>[] {
  const buckets = new Map<JumpListLetter, T[]>();
  for (const item of items) {
    const letter = getStartLetter(item.title);
    const bucket = buckets.get(letter);
    if (bucket === undefined) {
      buckets.set(letter, [item]);
    } else {
      bucket.push(item);
    }
  }
  return JUMP_LIST_LETTERS.flatMap(
    /**
     * 글자 하나의 묶음을 만든다.
     * @param letter 격자 글자
     * @returns 항목이 있으면 묶음 하나, 없으면 빈 배열
     */
    (letter) => {
      const bucket = buckets.get(letter);
      if (bucket === undefined) {
        return [];
      }
      const sorted = bucket.toSorted((a, b) => titleCollator.compare(a.title, b.title));
      return [{ label: letter, items: sorted }];
    },
  );
}

/**
 * 글자 격자에서 누를 수 있는(항목이 있는) 글자를 구한다. 나머지 글자는 흐리게 보이고 누를 수 없다.
 * @codocs [[Start 메뉴:모두]]
 * @param groups 모두 목록의 묶음
 * @returns 항목이 있는 묶음의 글자
 */
export function getAvailableLetters(
  groups: readonly { label: string; items: readonly unknown[] }[],
): string[] {
  return groups.filter((group) => group.items.length > 0).map((group) => group.label);
}

/**
 * 피그마 선택지 → 같은 뜻의 CSS 계산값 대응표와, 상태 전환에서 쓰는 CSS 속성 표. 1:1인 항목만 넣는다.
 * 판정하는 항목 전체와 판정하지 않는 항목은 [[피그마 일치 검사:판정 항목]]에 있다.
 */

/**
 * 선택지 대응표. 값은 같은 뜻의 CSS 계산값 목록이다(하나만 맞으면 된다).
 * @codocs [[피그마 일치 검사:판정 항목]]
 */
const choiceTables = {
  /** 자동 배치는 flex 컨테이너다. inline-flex인지는 크기 방식(HUG)의 선택이라 둘 다 인정한다 */
  display: { AUTO_LAYOUT: ['flex', 'inline-flex'] },
  flexDirection: { HORIZONTAL: ['row'], VERTICAL: ['column'] },
  primaryAlign: {
    MIN: ['normal', 'flex-start', 'start'],
    CENTER: ['center'],
    MAX: ['flex-end', 'end'],
    SPACE_BETWEEN: ['space-between'],
  },
  counterAlign: {
    MIN: ['flex-start', 'start'],
    CENTER: ['center'],
    MAX: ['flex-end', 'end'],
    BASELINE: ['baseline'],
  },
  wrap: { WRAP: ['wrap'], NO_WRAP: ['nowrap'] },
  clip: { ON: ['hidden', 'clip'], OFF: ['visible'] },
  textAlign: {
    LEFT: ['start', 'left'],
    CENTER: ['center'],
    RIGHT: ['right'],
    JUSTIFIED: ['justify'],
  },
  textDecoration: { NONE: ['none'], UNDERLINE: ['underline'], STRIKETHROUGH: ['line-through'] },
} as const satisfies Record<string, Record<string, readonly string[]>>;

/**
 * 선택지의 CSS 값을 찾는다.
 * @param table 대응표 이름
 * @param value 피그마 선택지
 * @returns 같은 뜻의 CSS 값, 대응이 없으면 undefined
 */
export function choiceValues(
  table: keyof typeof choiceTables,
  value: string,
): readonly string[] | undefined {
  const entries: Readonly<Record<string, readonly string[]>> = choiceTables[table];
  return entries[value];
}

/**
 * 상태 전환에서 바뀌면 CSS 전환으로 부드럽게 바뀌어야 하는 역할(접두어). 판정 항목에서 이름 + 값인 칠, 글자 색,
 * 자산 색, 불투명도, 반경, 여백, 간격, 고정 크기, 바깥 선이다. 그 밖의 역할은 바뀌어도 전환을 보지 않는다.
 * @codocs [[피그마 일치 검사:상태 전환]]
 */
export const TRANSITION_ROLES = [
  '채우기',
  '글자 색',
  '자산 색',
  '불투명도',
  '모서리 반경',
  '여백',
  '간격',
  '줄 간격',
  '너비',
  '높이',
  '바깥 선 색',
  '바깥 선 두께',
] as const;

/**
 * CSS 롱핸드 → `transition-property`에서 그 롱핸드를 덮는 이름들(자신, 단축 속성).
 * @codocs [[피그마 일치 검사:상태 전환]]
 * @param property 롱핸드
 * @returns 덮는 이름
 */
export function transitionNames(property: string): string[] {
  const names = [property];
  if (/^padding-(top|right|bottom|left)$/u.test(property)) {
    names.push('padding');
  }
  if (/^border-.+-radius$/u.test(property)) {
    names.push('border-radius');
  }
  if (property === 'column-gap' || property === 'row-gap') {
    names.push('gap');
  }
  if (property.startsWith('outline-')) {
    names.push('outline');
  }
  if (property === 'background-color') {
    names.push('background');
  }
  return names;
}

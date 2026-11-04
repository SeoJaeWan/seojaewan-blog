/**
 * 토큰 경로에서 클래스 이름을 정하는 규칙을 한 곳에 둔다. 파일을 읽지 않는 순수 함수이고 피그마 플러그인도 가져다 쓴다.
 *
 * 클래스는 유틸리티 + 변수 경로 전체다(`p-spacing-sm`). `--<이름공간>-<경로 전체>: var(--<경로 전체>)` 별칭 변수를 테마에 두어
 * 만든다. Tailwind 기본 유틸리티와 tokens.css의 `@utility`가 그대로 읽으므로 음수, `laptop:` 같은 변형, lint가 추가 작업 없이 된다.
 */

/** 경로 규칙의 묶음 하나 */
export type PathGroup = {
  /** 피그마 경로 앞부분 */
  prefix: string;
  /** 클래스가 읽는 테마 이름공간. 여럿이면 쓰는 유틸리티가 여럿이다 */
  namespaces: readonly string[];
  /** 숫자 변수의 CSS 단위. 없으면 단위 없는 숫자다 */
  unit?: string;
  /** 노드에 연결하지 않는 코드 전용 묶음인지 */
  isCodeOnly?: boolean;
  /** Tailwind 기본 유틸리티가 테마를 읽지 않아 `@utility`로 만드는 경우 */
  utility?: { prefix: string; property: string };
};

/** 경로 규칙 표. 긴 앞부분이 먼저 맞도록 묶음끼리 겹치지 않게 둔다 */
export const pathGroups: readonly PathGroup[] = [
  { prefix: 'color', namespaces: ['--color'] },
  { prefix: 'spacing', namespaces: ['--spacing'] },
  { prefix: 'size', namespaces: ['--size'] },
  { prefix: 'radius', namespaces: ['--radius'] },
  { prefix: 'stroke-width', namespaces: ['--stroke-width'] },
  { prefix: 'opacity', namespaces: ['--opacity'] },
  { prefix: 'blur', namespaces: ['--blur'] },
  { prefix: 'font/weight', namespaces: ['--font-weight'] },
  { prefix: 'rotate', namespaces: ['--rotate'], unit: 'deg', isCodeOnly: true },
  { prefix: 'layer', namespaces: ['--z-index'], isCodeOnly: true },
  { prefix: 'line-clamp', namespaces: ['--line-clamp'], isCodeOnly: true },
  { prefix: 'ratio', namespaces: ['--aspect'], isCodeOnly: true },
  { prefix: 'position', namespaces: ['--inset', '--translate'], unit: '%', isCodeOnly: true },
  {
    prefix: 'grid',
    namespaces: ['--grid-column-start', '--grid-row-start'],
    isCodeOnly: true,
  },
  { prefix: 'border-spacing', namespaces: ['--border-spacing'], unit: 'px', isCodeOnly: true },
  {
    prefix: 'shrink',
    namespaces: ['--shrink'],
    isCodeOnly: true,
    utility: { prefix: 'shrink', property: 'flex-shrink' },
  },
  {
    prefix: 'flex',
    namespaces: ['--flex'],
    isCodeOnly: true,
    utility: { prefix: 'flex', property: 'flex' },
  },
];

/** 경계값 묶음. 클래스를 만들지 않고 `@custom-variant`, `@media`, TS 상수가 된다 */
export const BREAKPOINT_GROUP = 'breakpoint';

/**
 * 경로가 든 규칙 묶음을 찾는다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param path 피그마 경로(`spacing/sm`)
 * @returns 묶음, 규칙 밖이면 undefined
 */
export function pathGroupOf(path: string): PathGroup | undefined {
  return pathGroups.find((group) => path === group.prefix || path.startsWith(`${group.prefix}/`));
}

/**
 * 변수가 코드 전용 묶음인지 확인한다. 이 묶음은 숫자를 단위 없는 number로 내보내고 STRING 변수도 받는다.
 * @codocs [[피그마 연동:토큰 생성]]
 * @param path 피그마 경로
 * @returns 코드 전용 묶음이면 true
 */
export function isCodeOnlyPath(path: string): boolean {
  return pathGroupOf(path)?.isCodeOnly === true;
}

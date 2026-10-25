/**
 * PR에서 바뀐 파일로 모션 시간 검사를 할 견본(모션 클래스)을 고른다. git과 파일을 읽지 않는 순수 함수만 둔다.
 * 파일 내용은 부르는 쪽(run-motion-check.ts)이 읽어 넘긴다.
 */

/** 바뀐 파일의 기준 커밋 내용과 지금 내용. 없는 쪽은 undefined */
export type FileChange = { before: string | undefined; after: string | undefined };

/** 범위 계산에 필요한 저장소 상태 */
export type MotionScopeInputs = {
  /** 저장소 기준 경로 목록 */
  changedFiles: readonly string[];
  /** 지금 저장소에 json이 있는 견본 이름. json이 없는 클래스(상태 전환 등)는 검사 대상이 아니다 */
  motionNames: ReadonlySet<string>;
  /** 저장소 기준 경로의 기준 커밋 내용과 지금 내용을 읽는다 */
  readChange: (file: string) => FileChange;
};

/** 검사 범위 */
export type MotionScope = {
  /** 검사할 견본 이름(정렬) */
  motions: string[];
  /** 견본마다 고른 이유(로그용) */
  reasons: Map<string, string[]>;
};

const DESIGN_SYSTEM = 'packages/design-system/';
export const MOTION_CSS_FILE = `${DESIGN_SYSTEM}src/motion.css`;
export const TOKENS_CSS_FILE = `${DESIGN_SYSTEM}src/tokens.css`;
export const MOTION_CHECK_WORKFLOW_FILE = '.github/workflows/motion-check.yml';
const FIGMA_MOTION_PATTERN = /^packages\/design-system\/figma\/motions\/([^/]+)\.json$/u;
const STORY_FILE_PATTERN = /^packages\/design-system\/.*\.stories\.tsx?$/u;
const MOTION_STORY_TITLE_PATTERN = /\btitle:\s*['"`]Motion\/([^'"`]+)['"`]/gu;
const NON_RENDERING_FILE_PATTERN = /\.(test|fixture)\.tsx?$/u;
// 모션 검사 도구와 모든 모션 스토리가 쓰는 도우미다. 바뀌면 모든 견본을 검사한다.
const WHOLE_SCOPE_FILES = [
  MOTION_CHECK_WORKFLOW_FILE,
  'tools/figma-parity/playwright.motion.config.ts',
  'tools/figma-parity/src/run-motion-check.ts',
  'tools/figma-parity/src/static-server.ts',
  /^tools\/figma-parity\/src\/motion-[^/]+\.ts$/u,
  'packages/design-system/src/motion-story/motion-preview.tsx',
] as const;
const UTILITY_PATTERN = /@utility\s+([\w-]+)\s*\{/gu;
const KEYFRAMES_PATTERN = /@keyframes\s+([\w-]+)\s*\{/gu;
const MOTION_VARIABLE_PATTERN = /(--motion-[\w-]+)\s*:\s*([^;]+);/gu;
const VARIABLE_REFERENCE_PATTERN = /var\(\s*(--[\w-]+)/gu;

/**
 * 바뀐 파일로 검사할 견본을 고른다.
 * - `figma/motions/<이름>.json`이 바뀐 견본
 * - `motion.css`를 바뀌기 전·후로 읽어 내용(클래스 본문과 그 클래스가 쓰는 `@keyframes`)이 달라진 `motion-*` 클래스
 * - `tokens.css`에서 값이 바뀐 `--motion-*` 토큰(별칭 포함)을 쓰는 클래스
 * - 바뀐 모션 스토리(제목 `Motion/<이름>`)
 * - 모션 검사 도구·워크플로·모션 스토리 도우미가 바뀌면 모든 견본
 * json이 없는 클래스는 고르지 않는다.
 * @codocs [[피그마 연동:CI]]
 * @param inputs 바뀐 파일과 저장소 상태
 * @returns 검사할 견본과 이유
 */
export function selectMotions(inputs: MotionScopeInputs): MotionScope {
  const reasons = new Map<string, string[]>();
  /**
   * 견본에 이유를 더한다. json이 없는 이름은 버린다.
   * @param name 견본(클래스) 이름
   * @param reason 이유
   */
  function add(name: string, reason: string): void {
    if (!inputs.motionNames.has(name)) {
      return;
    }
    const list = reasons.get(name) ?? [];
    list.push(reason);
    reasons.set(name, list);
  }
  for (const file of inputs.changedFiles) {
    if (NON_RENDERING_FILE_PATTERN.test(file)) {
      continue;
    }
    if (
      WHOLE_SCOPE_FILES.some((rule) => (typeof rule === 'string' ? rule === file : rule.test(file)))
    ) {
      for (const name of inputs.motionNames) {
        add(name, `${file}(모션 검사 도구·도우미)`);
      }
      continue;
    }
    const motion = FIGMA_MOTION_PATTERN.exec(file)?.[1];
    if (motion !== undefined) {
      add(motion, file);
      continue;
    }
    if (file === MOTION_CSS_FILE) {
      const change = inputs.readChange(file);
      for (const name of changedClasses(change.before, change.after)) {
        add(name, `${file}의 ${name} 내용`);
      }
      continue;
    }
    if (file === TOKENS_CSS_FILE) {
      const change = inputs.readChange(file);
      const variables = changedMotionVariables(change.before, change.after);
      const css = inputs.readChange(MOTION_CSS_FILE).after ?? '';
      for (const [name, body] of classBodies(css)) {
        const used = [...variables].filter((variable) => usesVariable(body, variable));
        if (used.length > 0) {
          add(name, `${file}의 ${used.join(', ')}`);
        }
      }
      continue;
    }
    if (STORY_FILE_PATTERN.test(file)) {
      const change = inputs.readChange(file);
      for (const name of motionStoryTitles(`${change.before ?? ''}\n${change.after ?? ''}`)) {
        add(name, `${file}(모션 스토리)`);
      }
    }
  }
  return { motions: [...reasons.keys()].sort(), reasons };
}

/**
 * 두 motion.css 사이에 내용이 달라진 클래스를 구한다. 클래스 내용은 `@utility` 본문과 그 본문이 이름으로 쓰는
 * `@keyframes` 본문이다. 한쪽에만 있는 클래스도 달라진 것이다.
 * @param before 기준 커밋의 motion.css
 * @param after 지금 motion.css
 * @returns 달라진 클래스 이름
 */
export function changedClasses(before: string | undefined, after: string | undefined): string[] {
  const old = classBodies(before ?? '');
  const now = classBodies(after ?? '');
  return [...new Set([...old.keys(), ...now.keys()])]
    .filter((name) => old.get(name) !== now.get(name))
    .sort();
}

/**
 * 두 tokens.css 사이에 값이 달라진 `--motion-*` 변수를 구한다. 바뀐 변수를 `var()`로 가리키는 변수(별칭)도 바뀐 것이다.
 * @param before 기준 커밋의 tokens.css
 * @param after 지금 tokens.css
 * @returns 바뀐 변수 이름
 */
export function changedMotionVariables(
  before: string | undefined,
  after: string | undefined,
): Set<string> {
  const old = motionVariables(before ?? '');
  const now = motionVariables(after ?? '');
  const changed = new Set(
    [...new Set([...old.keys(), ...now.keys()])].filter((name) => old.get(name) !== now.get(name)),
  );
  let isGrowing = true;
  while (isGrowing) {
    isGrowing = false;
    for (const [name, value] of now) {
      if (!changed.has(name) && [...changed].some((variable) => usesVariable(value, variable))) {
        changed.add(name);
        isGrowing = true;
      }
    }
  }
  return changed;
}

/**
 * motion.css에서 클래스마다 내용(본문과 쓰는 `@keyframes` 본문)을 모은다.
 * @param css motion.css
 * @returns 클래스 이름 → 내용
 */
function classBodies(css: string): Map<string, string> {
  const keyframes = new Map(blocks(css, KEYFRAMES_PATTERN));
  const classes = new Map<string, string>();
  for (const [name, body] of blocks(css, UTILITY_PATTERN)) {
    const used = [...keyframes]
      .filter(([keyframe]) => new RegExp(`(^|[^\\w-])${keyframe}($|[^\\w-])`, 'u').test(body))
      .map(([keyframe, keyframeBody]) => `@keyframes ${keyframe}{${keyframeBody}}`);
    classes.set(name, [normalize(body), ...used.map(normalize)].join('\n'));
  }
  return classes;
}

/**
 * 패턴으로 시작하는 블록의 이름과 본문(중괄호 안)을 찾는다.
 * @param css CSS 글자
 * @param pattern `<at-rule> <이름> {`를 찾는 전역 정규식
 * @returns `[이름, 본문]` 목록
 */
function blocks(css: string, pattern: RegExp): [string, string][] {
  const found: [string, string][] = [];
  for (const match of css.matchAll(pattern)) {
    const name = match[1];
    if (name === undefined) {
      continue;
    }
    const start = match.index + match[0].length;
    let depth = 1;
    let end = start;
    while (end < css.length && depth > 0) {
      const char = css[end];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      }
      end += 1;
    }
    found.push([name, css.slice(start, end - 1)]);
  }
  return found;
}

/**
 * tokens.css의 `--motion-*` 변수 선언을 모은다.
 * @param css tokens.css
 * @returns 변수 이름 → 값
 */
function motionVariables(css: string): Map<string, string> {
  return new Map(
    [...css.matchAll(MOTION_VARIABLE_PATTERN)].map((match): [string, string] => [
      match[1] ?? '',
      (match[2] ?? '').trim(),
    ]),
  );
}

/**
 * CSS 글자가 변수를 `var()`로 쓰는지 본다.
 * @param text CSS 글자
 * @param variable 변수 이름(`--motion-duration-fast`)
 * @returns 쓰면 true
 */
function usesVariable(text: string, variable: string): boolean {
  return [...text.matchAll(VARIABLE_REFERENCE_PATTERN)].some((match) => match[1] === variable);
}

/**
 * 스토리 파일 글자에서 모션 스토리 제목의 견본 이름을 모은다.
 * @param text 스토리 파일 글자
 * @returns 견본 이름
 */
function motionStoryTitles(text: string): string[] {
  return [...text.matchAll(MOTION_STORY_TITLE_PATTERN)]
    .map((match) => match[1] ?? '')
    .filter(Boolean);
}

/**
 * 주석과 공백 차이를 없앤다. 주석만 바뀐 것은 내용이 바뀐 것이 아니다.
 * @param text CSS 글자
 * @returns 정리한 글자
 */
function normalize(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

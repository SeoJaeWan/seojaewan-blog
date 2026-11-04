// description과 주석에 적는 `@키 값` 줄을 읽는다. 피그마 API를 쓰지 않는 순수 함수다.
// 규칙 글의 자리와 키의 뜻은 [[피그마 연동:구조 검사]]에 있다.

/** 받는 키. API로 읽을 수 없는 것만 `@` 줄에 적는다 */
export const DIRECTIVE_KEYS = [
  'repeat',
  'direction',
  'trigger',
  'hold',
  'runtime',
  'reduced-motion',
  'sample-size',
] as const;

export type DirectiveKey = (typeof DIRECTIVE_KEYS)[number];

/** 키 → 값 목록. `@trigger`처럼 여러 줄을 쓸 수 있는 키가 있어 목록이다 */
export type Directives = Partial<Record<DirectiveKey, string[]>>;

/** `@` 줄을 읽은 결과 */
export type ParsedDirectives = {
  directives: Directives;
  /** 고쳐야 할 줄 */
  problems: string[];
};

/** `@sample-size`로 표시하는 견본 크기 축 */
export type SampleAxis = 'width' | 'height';

const sampleAxisNames: readonly SampleAxis[] = ['width', 'height'];

/** 포커스 전환을 적는 `@trigger` 값 */
export const FOCUS_TRIGGER = 'focus-visible';

// 한 번만 쓰는 키다. 값 하나가 CSS 값 하나로 옮겨진다.
const singleKeys: readonly DirectiveKey[] = ['repeat', 'direction'];
// `animation-iteration-count` 값이다.
const REPEAT_PATTERN = /^(?:[1-9]\d*|infinite)$/u;
// `animation-direction` 값이다.
const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse'];
const LINE_PATTERN = /^@([a-z][a-z-]*)(?:\s+(.+))?$/u;

/**
 * 글에서 `@키 값` 줄을 읽는다. `@`로 시작하지 않는 줄은 설명이라 보지 않는다.
 * 모르는 키, 값이 없는 줄, 잘못된 값은 고칠 줄로 돌려준다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param text description이나 주석 글
 * @returns 키와 값, 고칠 줄
 */
export function parseDirectives(text: string): ParsedDirectives {
  const directives: Directives = {};
  const problems: string[] = [];
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line.startsWith('@')) {
      continue;
    }
    const match = LINE_PATTERN.exec(line);
    const key = DIRECTIVE_KEYS.find((item) => item === match?.[1]);
    const value = match?.[2]?.trim();
    if (key === undefined) {
      problems.push(`\`${line}\`: 모르는 키다(${DIRECTIVE_KEYS.map((k) => `@${k}`).join(', ')})`);
    } else if (value === undefined || value === '') {
      problems.push(`\`${line}\`: 값이 없다`);
    } else {
      const problem = valueProblem(key, value, directives[key]);
      if (problem === null) {
        directives[key] = [...(directives[key] ?? []), value];
      } else {
        problems.push(`\`${line}\`: ${problem}`);
      }
    }
  }
  return { directives, problems };
}

/**
 * 값이 키에 맞는지 본다. CSS 값으로 그대로 옮겨지는 키만 값을 정해 둔다.
 * @param key 키
 * @param value 값
 * @param known 이미 읽은 값
 * @returns 문제, 없으면 null
 */
function valueProblem(
  key: DirectiveKey,
  value: string,
  known: readonly string[] | undefined,
): string | null {
  if (known !== undefined && singleKeys.includes(key)) {
    return '한 번만 쓰는 키다';
  }
  if (key === 'repeat' && !REPEAT_PATTERN.test(value)) {
    return '1 이상의 정수나 `infinite`여야 한다';
  }
  if (key === 'direction' && !directions.includes(value)) {
    return `${directions.join(', ')} 가운데 하나여야 한다`;
  }
  if (key === 'sample-size') {
    return sampleSizeProblem(value, known ?? []);
  }
  return null;
}

/**
 * `@sample-size` 값을 본다. 값은 `width`, `height`이고 두 축은 한 줄(`width height`)이나 두 줄로 적는다.
 * @param value 값
 * @param known 이미 읽은 값
 * @returns 문제, 없으면 null
 */
function sampleSizeProblem(value: string, known: readonly string[]): string | null {
  const words = value.split(/\s+/u);
  if (!words.every((word) => sampleAxisNames.some((axis) => axis === word))) {
    return `${sampleAxisNames.join(', ')}만 쓴다`;
  }
  const seen = known.flatMap((line) => line.split(/\s+/u));
  if (words.some((word, index) => seen.includes(word) || words.indexOf(word) !== index)) {
    return '같은 축을 두 번 적었다';
  }
  return null;
}

/**
 * `@sample-size` 줄로 표시한 견본 크기 축을 모은다. 견본 크기는 코드에서 부모를 채우는 컴포넌트를 피그마에서 혼자 보이려고
 * 원본 루트에 준 폭·높이라, 변수 없는 숫자로 둔다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param directives 읽은 `@` 줄
 * @returns 축
 */
export function sampleSizeAxes(directives: Directives): Set<SampleAxis> {
  const words = (directives['sample-size'] ?? []).flatMap((line) => line.split(/\s+/u));
  return new Set(sampleAxisNames.filter((axis) => words.includes(axis)));
}

/**
 * 여러 글을 이어 읽는다.
 * @param texts 글(없는 값은 건너뛴다)
 * @returns 키와 값, 고칠 줄
 */
export function parseDirectiveTexts(texts: readonly (string | undefined)[]): ParsedDirectives {
  return parseDirectives(texts.filter((text) => text !== undefined).join('\n'));
}

/**
 * 컴포넌트 세트나 단독 컴포넌트와 변형의 description에서 `@` 줄을 읽는다. 단독 컴포넌트는 변형이 자기 자신이라
 * 같은 description을 두 번 읽지 않도록 한 번만 읽는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 컴포넌트 세트나 단독 컴포넌트
 * @param node.id 노드 ID
 * @param node.description 노드 description
 * @param variant 변형(단독 컴포넌트면 node와 같은 노드)
 * @param variant.id 변형 ID
 * @param variant.description 변형 description
 * @returns 키와 값, 고칠 줄
 */
export function parseVariantDirectives(
  node: { readonly id: string; readonly description: string },
  variant: { readonly id: string; readonly description: string },
): ParsedDirectives {
  return parseDirectiveTexts(
    node.id === variant.id ? [node.description] : [node.description, variant.description],
  );
}

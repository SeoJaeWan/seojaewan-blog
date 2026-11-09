// description과 주석에 적는 `@키 값` 줄을 읽는다. 피그마 API를 쓰지 않는 순수 함수다.
// 규칙 글의 자리와 키의 뜻은 [[피그마 연동:구조 검사]]에 있다.

/** 받는 키. 피그마 기능(재생 설정, 주석, 변수 연결 등)으로 읽을 수 없는 것만 `@` 줄에 적는다 */
export const DIRECTIVE_KEYS = ['direction'] as const;

/**
 * 옛 모션 견본(01 · Foundations `Foundations / Motion`) 주석에만 받는 키. 견본을 움직임이 일어나는 자리로 옮기기 전까지
 * 그 견본을 그대로 내보내기 위해 받는다([[디자인 기반:모션 견본]]).
 */
export const LEGACY_SAMPLE_KEYS = ['repeat', 'trigger', 'runtime', 'reduced-motion'] as const;

/**
 * 더 쓰지 않는 키. 피그마 기능으로 대신 읽는다(재생 설정 Loop, 프로토타입, Development·Accessibility 주석, 변수 연결 여부).
 * 유지 조건(`@hold`)은 기능 문서와 코드가 맡는다. 피그마에서 줄을 지우기 전까지 내보내기를 막지 않고 지울 줄로 알린다.
 */
export const RETIRED_KEYS = [...LEGACY_SAMPLE_KEYS, 'sample-size', 'hold'] as const;

export type DirectiveKey = (typeof DIRECTIVE_KEYS)[number];

/** 옛 견본 주석에만 받는 키 */
export type LegacySampleKey = (typeof LEGACY_SAMPLE_KEYS)[number];

/** 키 → 값 목록. `@trigger`(옛 견본)처럼 여러 줄을 쓸 수 있는 키가 있어 목록이다 */
export type Directives = Partial<Record<DirectiveKey | LegacySampleKey, string[]>>;

/**
 * `@` 줄을 읽은 결과.
 * - problems: 고쳐야 할 줄(막는다)
 * - retired: 더 쓰지 않는 키의 줄(막지 않고 지울 줄로 알린다)
 */
export type ParsedDirectives = {
  directives: Directives;
  problems: string[];
  retired: string[];
};

/**
 * 읽는 방법.
 * - isLegacySample: 옛 모션 견본 주석이면 true. `@repeat`·`@trigger`·`@runtime`·`@reduced-motion`을 받는다
 */
export type DirectiveOptions = { isLegacySample?: boolean };

// 한 번만 쓰는 키다. 값 하나가 CSS 값 하나로 옮겨진다.
const singleKeys: readonly string[] = ['repeat', 'direction'];
// `animation-iteration-count` 값이다.
const REPEAT_PATTERN = /^(?:[1-9]\d*|infinite)$/u;
// `animation-direction` 값이다.
const directions = ['normal', 'reverse', 'alternate', 'alternate-reverse'];
const LINE_PATTERN = /^@([a-z][a-z-]*)(?:\s+(.+))?$/u;

/**
 * 글에서 `@키 값` 줄을 읽는다. `@`로 시작하지 않는 줄은 설명이라 보지 않는다.
 * 모르는 키, 값이 없는 줄, 잘못된 값은 고칠 줄로, 더 쓰지 않는 키의 줄은 지울 줄로 돌려준다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param text description이나 주석 글
 * @param options 읽는 방법(옛 견본 주석인지)
 * @returns 키와 값, 고칠 줄, 지울 줄
 */
export function parseDirectives(text: string, options: DirectiveOptions = {}): ParsedDirectives {
  const accepted: readonly string[] =
    options.isLegacySample === true ? [...DIRECTIVE_KEYS, ...LEGACY_SAMPLE_KEYS] : DIRECTIVE_KEYS;
  const directives: Directives = {};
  const problems: string[] = [];
  const retired: string[] = [];
  for (const raw of text.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line.startsWith('@')) {
      continue;
    }
    const match = LINE_PATTERN.exec(line);
    const name = match?.[1] ?? '';
    const key = [...DIRECTIVE_KEYS, ...LEGACY_SAMPLE_KEYS].find(
      (item) => item === name && accepted.includes(item),
    );
    const value = match?.[2]?.trim();
    if (key === undefined) {
      if (RETIRED_KEYS.some((item) => item === name)) {
        retired.push(line);
      } else {
        problems.push(`\`${line}\`: 모르는 키다(${accepted.map((k) => `@${k}`).join(', ')})`);
      }
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
  return { directives, problems, retired };
}

/**
 * 값이 키에 맞는지 본다. CSS 값으로 그대로 옮겨지는 키만 값을 정해 둔다.
 * @param key 키
 * @param value 값
 * @param known 이미 읽은 값
 * @returns 문제, 없으면 null
 */
function valueProblem(
  key: DirectiveKey | LegacySampleKey,
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
  return null;
}

/**
 * 여러 글을 이어 읽는다.
 * @param texts 글(없는 값은 건너뛴다)
 * @param options 읽는 방법(옛 견본 주석인지)
 * @returns 키와 값, 고칠 줄, 지울 줄
 */
export function parseDirectiveTexts(
  texts: readonly (string | undefined)[],
  options: DirectiveOptions = {},
): ParsedDirectives {
  return parseDirectives(texts.filter((text) => text !== undefined).join('\n'), options);
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
 * @returns 키와 값, 고칠 줄, 지울 줄
 */
export function parseVariantDirectives(
  node: { readonly id: string; readonly description: string },
  variant: { readonly id: string; readonly description: string },
): ParsedDirectives {
  return parseDirectiveTexts(
    node.id === variant.id ? [node.description] : [node.description, variant.description],
  );
}

/**
 * 지울 줄 알림 문장을 만든다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param where 위치(컴포넌트·변형, 토큰 이름 등)
 * @param lines 지울 줄
 * @returns 알림 문장
 */
export function retiredNotice(where: string, lines: readonly string[]): string {
  return `${where}: 더 쓰지 않는 \`@\` 줄 ${lines.map((line) => `\`${line}\``).join(', ')}을 지운다. 재생 설정 Loop, 프로토타입, Development·Accessibility 주석, 변수 연결 여부로 읽는다.`;
}

/**
 * tokens.css 변경에서 바뀐 토큰의 클래스를 구하고, 소스에서 그 클래스를 쓰는지 찾는다. 파일을 읽지 않는 순수 함수다.
 * tokens.css는 figma/tokens.json에서 만든 생성 파일이라, 두 파일 중 하나가 바뀌면 이 파일의 변경이 실제로 바뀐 토큰이다.
 */

/** 바뀐 토큰을 쓰는 클래스와 변수 */
export type TokenUsage = {
  /** 바뀐 클래스 이름(변형 접두어 없이, `bg-subtle-fill-secondary`, `type-body`) */
  classes: Set<string>;
  /** 이 접두어로 시작하는 클래스는 모두 바뀌었다(`border-gradient-elevation-`) */
  prefixes: string[];
  /** 바뀐 CSS 변수(`--motion-scale-up`). 인라인 스타일이나 손으로 쓴 CSS가 var()로 쓸 수 있다 */
  variables: Set<string>;
};

/** tokens.css를 나눈 결과 */
type CssBlocks = {
  /** `@theme`과 `:root`의 사용자 속성 이름 → 값 */
  variables: Map<string, string>;
  /** `@utility` 이름 → 본문 */
  utilities: Map<string, string>;
  /** 블록과 주석을 뺀 나머지(공백 정리) */
  rest: string;
};

// Tailwind 기본 유틸리티가 읽는 이름공간과 그 클래스 접두어다(tokens.css 머리 주석의 표).
const builtinPrefixes: Readonly<Record<string, readonly string[]>> = {
  spacing: [
    'p',
    'px',
    'py',
    'pt',
    'pr',
    'pb',
    'pl',
    'ps',
    'pe',
    'm',
    'mx',
    'my',
    'mt',
    'mr',
    'mb',
    'ml',
    'ms',
    'me',
    'gap',
    'gap-x',
    'gap-y',
    'space-x',
    'space-y',
    'inset',
    'inset-x',
    'inset-y',
    'top',
    'right',
    'bottom',
    'left',
    'start',
    'end',
    'translate-x',
    'translate-y',
    'scroll-m',
    'scroll-p',
  ],
  radius: [
    'rounded',
    'rounded-t',
    'rounded-r',
    'rounded-b',
    'rounded-l',
    'rounded-tl',
    'rounded-tr',
    'rounded-br',
    'rounded-bl',
    'rounded-s',
    'rounded-e',
    'rounded-ss',
    'rounded-se',
    'rounded-es',
    'rounded-ee',
  ],
  opacity: ['opacity'],
  blur: ['blur', 'backdrop-blur'],
  'font-weight': ['font'],
};
const CSS_VARIABLE_REFERENCE = /var\((--[a-z0-9-]+)/gu;
const VALUE_NAMESPACE = /--value\(--([a-z0-9-]+)-\*\)/gu;

/**
 * 두 tokens.css 사이에 바뀐 토큰의 클래스와 변수를 구한다. 다른 변수를 거쳐 값이 바뀐 변수도 따라간다.
 * @codocs [[피그마 연동:캡처 범위]]
 * @param before 기준 커밋의 tokens.css. 없으면 정할 수 없다
 * @param after 지금 tokens.css. 없으면 정할 수 없다
 * @returns 바뀐 클래스와 변수. 블록 밖이 바뀌었거나 파일이 없어 정할 수 없으면 undefined
 */
export function changedTokenUsage(
  before: string | undefined,
  after: string | undefined,
): TokenUsage | undefined {
  if (before === undefined || after === undefined) {
    return undefined;
  }
  const old = cssBlocks(before);
  const now = cssBlocks(after);
  if (old.rest !== now.rest) {
    return undefined;
  }
  const variables = new Set(
    [...new Set([...old.variables.keys(), ...now.variables.keys()])].filter(
      (name) => old.variables.get(name) !== now.variables.get(name),
    ),
  );
  // 바뀐 변수를 var()로 가리키는 변수도 값이 바뀐다.
  for (let hasGrown = true; hasGrown;) {
    hasGrown = false;
    for (const [name, value] of now.variables) {
      if (!variables.has(name) && references(value, variables)) {
        variables.add(name);
        hasGrown = true;
      }
    }
  }
  const classes = new Set<string>();
  const prefixes: string[] = [];
  const utilityNames = new Set([...old.utilities.keys(), ...now.utilities.keys()]);
  for (const utility of utilityNames) {
    const bodies = [old.utilities.get(utility), now.utilities.get(utility)];
    const isWildcard = utility.endsWith('-*');
    const isChanged =
      bodies[0] !== bodies[1] || bodies.some((body) => references(body ?? '', variables));
    if (!isWildcard) {
      if (isChanged) {
        classes.add(utility);
      }
      continue;
    }
    const prefix = utility.slice(0, -1);
    if (isChanged) {
      prefixes.push(prefix);
      continue;
    }
    for (const namespace of namespacesOf(bodies[1] ?? '')) {
      for (const variable of variables) {
        if (variable.startsWith(`--${namespace}-`)) {
          classes.add(`${prefix}${variable.slice(namespace.length + 3)}`);
        }
      }
    }
  }
  for (const [namespace, classPrefixes] of Object.entries(builtinPrefixes)) {
    for (const variable of variables) {
      if (variable.startsWith(`--${namespace}-`)) {
        const suffix = variable.slice(namespace.length + 3);
        for (const classPrefix of classPrefixes) {
          classes.add(`${classPrefix}-${suffix}`);
        }
      }
    }
  }
  return { classes, prefixes, variables };
}

/**
 * 소스가 바뀐 토큰의 클래스나 변수를 쓰는지 본다. 클래스는 변형 접두어(`hover:`, `group-data-x:`)와
 * `!`·`-`를 떼고 비교한다.
 * @codocs [[피그마 연동:캡처 범위]]
 * @param source 소스 내용
 * @param usage 바뀐 클래스와 변수
 * @returns 쓰면 true
 */
export function usesTokens(source: string, usage: TokenUsage): boolean {
  for (const word of source.split(/[\s'"`{}()<>,;=[\]]+/u)) {
    const name = (word.split(':').at(-1) ?? '').replace(/^[!-]+|!$/gu, '');
    if (
      name !== '' &&
      (usage.classes.has(name) || usage.prefixes.some((prefix) => name.startsWith(prefix)))
    ) {
      return true;
    }
  }
  return [...usage.variables].some((variable) =>
    new RegExp(`${variable}(?![a-z0-9-])`, 'u').test(source),
  );
}

/**
 * 값이 변수 집합 중 하나를 var()로 가리키는지 본다.
 * @param value CSS 값이나 본문
 * @param variables 변수 이름
 * @returns 가리키면 true
 */
function references(value: string, variables: ReadonlySet<string>): boolean {
  return [...value.matchAll(CSS_VARIABLE_REFERENCE)].some((match) => variables.has(match[1] ?? ''));
}

/**
 * `@utility` 본문이 `--value(--<이름공간>-*)`로 고르는 이름공간을 구한다.
 * @param body 유틸리티 본문
 * @returns 이름공간
 */
function namespacesOf(body: string): string[] {
  return [...body.matchAll(VALUE_NAMESPACE)].map((match) => match[1] ?? '');
}

/**
 * tokens.css를 변수(`@theme`, `:root`), `@utility` 본문, 나머지로 나눈다.
 * @param css tokens.css 내용
 * @returns 나눈 결과
 */
function cssBlocks(css: string): CssBlocks {
  const text = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const variables = new Map<string, string>();
  const utilities = new Map<string, string>();
  let rest = '';
  let cursor = 0;
  for (const match of text.matchAll(/(@theme|@utility|:root)([^{]*)\{/gu)) {
    if (match.index < cursor) {
      continue;
    }
    const start = match.index + match[0].length;
    const end = blockEnd(text, start);
    const body = text.slice(start, end);
    rest += text.slice(cursor, match.index);
    cursor = end + 1;
    if (match[1] === '@utility') {
      utilities.set((match[2] ?? '').trim(), body.replace(/\s+/gu, ' ').trim());
      continue;
    }
    for (const declaration of body.split(';')) {
      const separator = declaration.indexOf(':');
      const name = declaration.slice(0, separator).trim();
      if (separator >= 0 && name.startsWith('--')) {
        variables.set(
          name,
          declaration
            .slice(separator + 1)
            .replace(/\s+/gu, ' ')
            .trim(),
        );
      }
    }
  }
  rest += text.slice(cursor);
  return { variables, utilities, rest: rest.replace(/\s+/gu, ' ').trim() };
}

/**
 * 여는 중괄호 바로 뒤에서 시작해 짝이 맞는 닫는 중괄호의 위치를 찾는다.
 * @param text CSS
 * @param start 여는 중괄호 다음 위치
 * @returns 닫는 중괄호 위치(없으면 글자 끝)
 */
function blockEnd(text: string, start: number): number {
  let depth = 1;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === '{') {
      depth += 1;
    } else if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return text.length;
}

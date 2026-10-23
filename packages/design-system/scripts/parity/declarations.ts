/**
 * 요소의 CSS 속성을 정한(이긴) 선언과, 그 선언이 `var()`로 가리키는 변수 이름을 읽는다.
 * 선언은 Chromium DevTools 프로토콜(CDP) `CSS.getMatchedStylesForNode`로 읽는다. 규칙은 우선순위가 낮은 것부터
 * (레이어 순서, 선택자 우선순위, 소스 순서) 오고, 인라인 스타일이 그 뒤에 온다.
 * CDP를 쓰는 부분(DeclarationReader)과 읽은 규칙을 다루는 순수 함수로 나눈다. 순수 함수는 단위 테스트가 확인한다.
 * 규칙은 [[피그마 일치 검사:판정 항목]]의 "이긴 선언 읽기"에 있다.
 */

import type { CDPSession, Page } from '@playwright/test';

/** 선언 하나 */
export type Declaration = { name: string; value: string };

/** 규칙(또는 인라인 스타일) 하나 */
export type StyleBlock = {
  /** 메시지용 출처(선택자나 `style=""`) */
  source: string;
  /** CDP 규칙 출처(`regular`, `user-agent`, `inline` 등) */
  origin: string;
  declarations: Declaration[];
};

/** 요소 하나(대상, 또는 조상)의 규칙. 우선순위가 낮은 것부터, 인라인 스타일이 마지막이다 */
export type StyleLevel = StyleBlock[];

/** `@property`로 등록한 사용자 속성 */
export type Registration = { inherits: boolean; initialValue: string | null };

/** 요소 하나에 맞는 규칙 전체. levels[0]이 대상, 그 뒤가 가까운 조상부터 */
export type MatchedLevels = {
  levels: StyleLevel[];
  registrations: ReadonlyMap<string, Registration>;
};

/** 이긴 선언 */
export type Winner = Declaration & {
  source: string;
  origin: string;
  /** 선언이 있는 단계(0이 대상, 1부터 조상) */
  level: number;
};

/** 선언을 찾는 방법 */
export type LookupOptions = {
  /** 상속되는 속성이라 자기 선언이 없으면 조상의 선언을 본다 */
  inherited?: boolean;
  /** 의사 요소(`::placeholder`) */
  pseudo?: string;
};

/** 변수 참조 하나 */
export type VarReference = { name: string; fallback: string | null };

// Tailwind가 유틸리티 안에서 쓰는 내부 변수의 접두어. 이름 비교에서 이 변수만 거쳐 갈 수 있다.
const TAILWIND_PREFIX = '--tw-';

// 상속되는 속성이다. 자기 선언이 없거나 `inherit`이면 조상의 선언이 값을 정한다.
const inheritedProperties = new Set([
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
]);

// 왼쪽에서 오른쪽으로 쓰는 가로 쓰기에서 물리 변 → 논리 변, 그리고 그 변을 담는 축
const SIDE_LOGICAL = {
  top: ['block-start', 'block'],
  right: ['inline-end', 'inline'],
  bottom: ['block-end', 'block'],
  left: ['inline-start', 'inline'],
} as const;

// 물리 모서리 → 논리 모서리
const CORNER_LOGICAL = {
  'top-left': 'start-start',
  'top-right': 'start-end',
  'bottom-right': 'end-end',
  'bottom-left': 'end-start',
} as const;

// 값 하나로 변 넷(또는 모서리 넷)을 정하는 단축 속성. 값 개수에 따라 변마다 값을 고른다(위·오른쪽·아래·왼쪽 순서).
const boxShorthands = new Set([
  'padding',
  'margin',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
]);

// 값 하나나 둘로 시작·끝 두 변을 정하는 단축 속성
const PAIR_SHORTHANDS = /^(padding|margin|border)-(inline|block)(-width|-style|-color)?$/u;

/**
 * 롱핸드 하나를 정할 수 있는 선언 이름을 모두 구한다(자신, 단축 속성, 논리 속성). 왼쪽에서 오른쪽 가로 쓰기로 본다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param property CSS 롱핸드
 * @returns 선언 이름 목록
 */
export function settersOf(property: string): string[] {
  const setters = [property];
  const boxSide = /^(padding|margin)-(top|right|bottom|left)$/u.exec(property);
  if (boxSide?.[1] !== undefined && boxSide[2] !== undefined) {
    const [box, side] = [boxSide[1], boxSide[2] as keyof typeof SIDE_LOGICAL];
    const [logical, axis] = SIDE_LOGICAL[side];
    setters.push(`${box}-${logical}`, `${box}-${axis}`, box);
    return setters;
  }
  const border = /^border-(top|right|bottom|left)-(width|style|color)$/u.exec(property);
  if (border?.[1] !== undefined && border[2] !== undefined) {
    const [side, part] = [border[1] as keyof typeof SIDE_LOGICAL, border[2]];
    const [logical, axis] = SIDE_LOGICAL[side];
    setters.push(
      `border-${logical}-${part}`,
      `border-${axis}-${part}`,
      `border-${part}`,
      `border-${side}`,
      `border-${logical}`,
      `border-${axis}`,
      'border',
    );
    return setters;
  }
  const corner = /^border-(top-left|top-right|bottom-right|bottom-left)-radius$/u.exec(property);
  if (corner?.[1] !== undefined) {
    setters.push(
      `border-${CORNER_LOGICAL[corner[1] as keyof typeof CORNER_LOGICAL]}-radius`,
      'border-radius',
    );
    return setters;
  }
  const others: Readonly<Record<string, readonly string[]>> = {
    'column-gap': ['gap'],
    'row-gap': ['gap'],
    'background-color': ['background'],
    'background-image': ['background'],
    'outline-color': ['outline'],
    'outline-width': ['outline'],
    'outline-style': ['outline'],
    width: ['inline-size'],
    height: ['block-size'],
    'min-width': ['min-inline-size'],
    'max-width': ['max-inline-size'],
    'min-height': ['min-block-size'],
    'max-height': ['max-block-size'],
    'font-size': ['font'],
    'font-weight': ['font'],
    'font-family': ['font'],
    'line-height': ['font'],
    'transition-property': ['transition'],
    'transition-duration': ['transition'],
    'transition-timing-function': ['transition'],
    'overflow-x': ['overflow', 'overflow-inline'],
    'overflow-y': ['overflow', 'overflow-block'],
    'flex-direction': ['flex-flow'],
    'flex-wrap': ['flex-flow'],
    'justify-content': ['place-content'],
    'align-items': ['place-items'],
    'text-decoration-line': ['text-decoration'],
  };
  setters.push(...(others[property] ?? []));
  return setters;
}

/**
 * 단계 하나(요소 하나)에서 속성을 정한 선언을 고른다. 마지막 선언이 이긴다.
 * @param level 요소 하나의 규칙
 * @param setters 그 속성을 정할 수 있는 선언 이름
 * @returns 이긴 선언(단계 번호는 0), 없으면 null
 */
export function winnerInLevel(level: StyleLevel, setters: readonly string[]): Winner | null {
  let winner: Winner | null = null;
  for (const block of level) {
    for (const declaration of block.declarations) {
      if (!setters.includes(declaration.name)) {
        continue;
      }
      winner = { ...declaration, source: block.source, origin: block.origin, level: 0 };
    }
  }
  return winner;
}

/**
 * 속성을 정한 선언을 찾는다. 상속되는 속성은 자기 선언이 없거나 `inherit`이면 가까운 조상부터 찾는다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param matched 요소에 맞는 규칙 전체
 * @param property CSS 롱핸드
 * @param isInherited 상속되는 속성으로 볼지
 * @returns 이긴 선언, 없으면 null
 */
export function findWinner(
  matched: MatchedLevels,
  property: string,
  isInherited: boolean,
): Winner | null {
  const setters = settersOf(property);
  for (const [index, level] of matched.levels.entries()) {
    const winner = winnerInLevel(level, setters);
    const isInheriting = winner === null || /^(inherit|unset)$/u.test(winner.value.trim());
    if (!isInheriting) {
      return { ...winner, level: index };
    }
    if (!isInherited) {
      return winner === null ? null : { ...winner, level: index };
    }
  }
  return null;
}

/**
 * 이긴 선언에서 그 롱핸드에 해당하는 값을 고른다. 변이나 모서리를 값 개수로 나누는 단축 속성만 나누고,
 * 나머지(`background`, `font`, `transition` 등)는 값 전체를 쓴다.
 * @param declaration 선언 이름
 * @param property CSS 롱핸드
 * @param value 선언 값
 * @returns 롱핸드에 해당하는 값
 */
export function shorthandPart(declaration: string, property: string, value: string): string {
  const parts = splitWhitespace(value.trim());
  if (declaration === 'gap') {
    return (property === 'column-gap' ? parts[1] : undefined) ?? parts[0] ?? value;
  }
  const pair = PAIR_SHORTHANDS.exec(declaration);
  if (pair !== null) {
    const isEnd = /(right|bottom)/u.test(property);
    return (isEnd ? parts[1] : undefined) ?? parts[0] ?? value;
  }
  if (!boxShorthands.has(declaration) || (declaration === 'border-radius' && value.includes('/'))) {
    return value;
  }
  const position = boxPosition(property);
  if (position === null) {
    return value;
  }
  // 값 1개: 모두, 2개: 위아래·좌우, 3개: 위·좌우·아래, 4개: 위·오른쪽·아래·왼쪽(모서리도 같은 순서)
  const pick = [
    [0, 0, 0, 0],
    [0, 1, 0, 1],
    [0, 1, 2, 1],
    [0, 1, 2, 3],
  ][Math.min(parts.length, 4) - 1];
  const index = pick?.[position];
  return index === undefined ? value : (parts[index] ?? value);
}

/**
 * 롱핸드의 변·모서리 위치를 구한다(위·오른쪽·아래·왼쪽, 모서리는 왼쪽 위부터 시계 방향).
 * @param property CSS 롱핸드
 * @returns 0–3, 변·모서리가 아니면 null
 */
function boxPosition(property: string): number | null {
  const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const corner = corners.findIndex((name) => property.includes(`-${name}-`));
  if (corner !== -1) {
    return corner;
  }
  const sides = ['top', 'right', 'bottom', 'left'];
  const side = sides.findIndex((name) => property === name || property.includes(`-${name}`));
  return side === -1 ? null : side;
}

/**
 * 값 안의 `var()` 참조를 앞에서부터 모두 찾는다. 다른 함수(`calc()`, `blur()`) 안의 참조도 찾고,
 * 대체값 안의 참조는 대체값을 풀 때 찾으므로 여기서 꺼내지 않는다.
 * @param value CSS 값
 * @returns 참조 목록
 */
export function parseVarReferences(value: string): VarReference[] {
  const references: VarReference[] = [];
  let index = 0;
  while (index < value.length) {
    const start = value.indexOf('var(', index);
    if (start === -1) {
      break;
    }
    let depth = 1;
    let cursor = start + 4;
    let comma = -1;
    while (cursor < value.length && depth > 0) {
      const character = value[cursor];
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
      } else if (character === ',' && depth === 1 && comma === -1) {
        comma = cursor;
      }
      cursor += 1;
    }
    const end = cursor - 1;
    const name = value.slice(start + 4, comma === -1 ? end : comma).trim();
    references.push({ name, fallback: comma === -1 ? null : value.slice(comma + 1, end) });
    index = cursor;
  }
  return references;
}

/**
 * 사용자 속성의 값을 정한 선언을 찾는다. 대상 단계부터 보고, 상속되는 사용자 속성이면 조상으로 올라간다.
 * @param matched 요소에 맞는 규칙 전체
 * @param level 찾기 시작할 단계
 * @param name 사용자 속성 이름(`--spacing-12`)
 * @returns 이긴 선언, 없으면 null
 */
export function customProperty(matched: MatchedLevels, level: number, name: string): Winner | null {
  const canInherit = matched.registrations.get(name)?.inherits ?? true;
  for (let index = level; index < matched.levels.length; index += 1) {
    const winner = winnerInLevel(matched.levels[index] ?? [], [name]);
    if (winner !== null && winner.value.trim() !== 'inherit') {
      return { ...winner, level: index };
    }
    if (!canInherit) {
      break;
    }
  }
  return null;
}

/**
 * 값에서 `var()` 사슬을 따라가며 닿는 변수 이름을 모두 모은다. 사용자 속성은 그 요소(없으면 가까운 조상)의
 * 이긴 선언으로 풀고, 정의가 없거나 `initial`이면 등록한 초기값, 그것도 없으면 대체값을 쓴다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param matched 요소에 맞는 규칙 전체
 * @param level 값이 선언된 단계
 * @param value CSS 값
 * @returns 닿은 변수 이름
 */
export function variablesReached(
  matched: MatchedLevels,
  level: number,
  value: string,
): Set<string> {
  const names = new Set<string>();
  const seen = new Set<string>();
  /**
   * 값 하나를 풀며 이름을 모은다.
   * @param current 단계
   * @param text 값
   */
  function visit(current: number, text: string): void {
    for (const reference of parseVarReferences(text)) {
      names.add(reference.name);
      const key = `${String(current)}\u0000${reference.name}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const found = customProperty(matched, current, reference.name);
      const isDefined = found !== null && found.value.trim() !== 'initial';
      if (isDefined) {
        visit(found.level, found.value);
        continue;
      }
      const initial = matched.registrations.get(reference.name)?.initialValue ?? null;
      if (initial !== null) {
        visit(current, initial);
      } else if (reference.fallback !== null) {
        visit(current, reference.fallback);
      }
    }
  }
  visit(level, value);
  return names;
}

/**
 * 값이 기대한 변수 이름에 닿는지 본다. 기대한 이름까지 가는 길에는 Tailwind 내부 변수(`--tw-*`)만 거칠 수 있다.
 * 다른 사용자 속성(`--color-my-button`)을 거치면 그 길은 닿지 않은 것이다. 정의가 없는 사용자 속성은 등록한 초기값,
 * 그것도 없으면 대체값으로 이어 간다. 기대한 이름에 닿으면 그 정의(`--color-blue-dark-1` 등)는 따라가지 않는다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param matched 요소에 맞는 규칙 전체
 * @param level 값이 선언된 단계
 * @param value CSS 값
 * @param expected 기대한 변수 이름 후보
 * @returns 닿으면 true
 */
export function reachesVariable(
  matched: MatchedLevels,
  level: number,
  value: string,
  expected: readonly string[],
): boolean {
  const seen = new Set<string>();
  /**
   * 값 하나를 풀며 기대한 이름을 찾는다.
   * @param current 단계
   * @param text 값
   * @returns 닿으면 true
   */
  function visit(current: number, text: string): boolean {
    for (const reference of parseVarReferences(text)) {
      if (expected.includes(reference.name)) {
        return true;
      }
      const key = `${String(current)}\u0000${reference.name}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const found = customProperty(matched, current, reference.name);
      const isDefined = found !== null && found.value.trim() !== 'initial';
      if (isDefined) {
        if (reference.name.startsWith(TAILWIND_PREFIX) && visit(found.level, found.value)) {
          return true;
        }
        continue;
      }
      const initial = matched.registrations.get(reference.name)?.initialValue ?? null;
      const next = initial ?? reference.fallback;
      if (next !== null && visit(current, next)) {
        return true;
      }
    }
    return false;
  }
  return visit(level, value);
}

/**
 * 대상 요소 자신의 일반 출처·클래스 선택자 규칙에서, 디자인 토큰 변수에 닿는 선언을 찾는다.
 * 표시(`data-figma`) 없는 요소가 피그마에 없는 모양을 그리는지 볼 때 쓴다.
 * @codocs [[피그마 일치 검사:짝짓기]]
 * @param matched 요소에 맞는 규칙 전체
 * @param tokenNames 디자인 토큰 CSS 이름
 * @returns 토큰에 닿는 선언(메시지용 `이름: 값`)
 */
export function tokenDeclarations(
  matched: MatchedLevels,
  tokenNames: ReadonlySet<string>,
): string[] {
  const found: string[] = [];
  for (const block of matched.levels[0] ?? []) {
    if (block.origin !== 'regular' || !block.source.includes('.')) {
      continue;
    }
    for (const declaration of block.declarations) {
      const reached = variablesReached(matched, 0, declaration.value);
      if ([...reached].some((name) => tokenNames.has(name))) {
        found.push(`${declaration.name}: ${declaration.value}`);
      }
    }
  }
  return found;
}

/**
 * 상속되는 속성인지 본다.
 * @param property CSS 롱핸드
 * @returns 상속되면 true
 */
export function isInheritedProperty(property: string): boolean {
  return inheritedProperties.has(property);
}

/**
 * 괄호 밖의 공백으로 값을 나눈다.
 * @param value CSS 값
 * @returns 항목
 */
function splitWhitespace(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const character of value) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }
    if (/\s/u.test(character) && depth === 0) {
      if (current !== '') {
        parts.push(current);
      }
      current = '';
    } else {
      current += character;
    }
  }
  if (current !== '') {
    parts.push(current);
  }
  return parts;
}

// ---- CDP ----

type CdpProperty = {
  name: string;
  value: string;
  disabled?: boolean;
  parsedOk?: boolean;
  range?: unknown;
};
type CdpStyle = { cssProperties: CdpProperty[] };
type CdpRuleMatch = { rule: { origin: string; selectorList: { text: string }; style: CdpStyle } };
type CdpInherited = { inlineStyle?: CdpStyle; matchedCSSRules: CdpRuleMatch[] };
type CdpPropertyRule = { propertyName: { text: string }; style: CdpStyle };
type CdpMatched = {
  inlineStyle?: CdpStyle;
  matchedCSSRules?: CdpRuleMatch[];
  inherited?: CdpInherited[];
  cssPropertyRules?: CdpPropertyRule[];
};
type CdpNode = {
  backendNodeId: number;
  nodeType: number;
  attributes?: string[];
  children?: CdpNode[];
  shadowRoots?: CdpNode[];
};

// 입력 요소의 placeholder 글자를 담는 브라우저 내부 요소의 pseudo 속성 값이다.
const PLACEHOLDER_PSEUDO = '-webkit-input-placeholder';

/**
 * CDP 응답을 단계 목록으로 바꾼다.
 * @param matched CSS.getMatchedStylesForNode 응답
 * @returns 요소에 맞는 규칙 전체
 */
export function toMatchedLevels(matched: CdpMatched): MatchedLevels {
  const registrations = new Map<string, Registration>();
  for (const rule of matched.cssPropertyRules ?? []) {
    registrations.set(rule.propertyName.text, {
      inherits: descriptorOf(rule, 'inherits') !== 'false',
      initialValue: descriptorOf(rule, 'initial-value') ?? null,
    });
  }
  return {
    levels: [
      levelOf(matched.matchedCSSRules ?? [], matched.inlineStyle),
      ...(matched.inherited ?? []).map((entry) =>
        levelOf(entry.matchedCSSRules, entry.inlineStyle),
      ),
    ],
    registrations,
  };
}

/**
 * 요소 하나의 규칙과 인라인 스타일을 단계 하나로 바꾼다.
 * @param rules 우선순위가 낮은 것부터의 규칙
 * @param inline 인라인 스타일
 * @returns 단계
 */
function levelOf(rules: readonly CdpRuleMatch[], inline: CdpStyle | undefined): StyleLevel {
  const level: StyleLevel = rules.map(blockOf);
  if (inline !== undefined) {
    level.push({ source: 'style=""', origin: 'inline', declarations: declarationsOf(inline) });
  }
  return level;
}

/**
 * CDP 규칙 하나를 규칙 블록으로 바꾼다.
 * @param match CDP 규칙
 * @returns 규칙 블록
 */
function blockOf(match: CdpRuleMatch): StyleBlock {
  return {
    source: match.rule.selectorList.text,
    origin: match.rule.origin,
    declarations: declarationsOf(match.rule.style),
  };
}

/**
 * `@property` 규칙의 서술자 값을 읽는다.
 * @param rule `@property` 규칙
 * @param name 서술자 이름(`inherits`, `initial-value`)
 * @returns 값, 없으면 undefined
 */
function descriptorOf(rule: CdpPropertyRule, name: string): string | undefined {
  return rule.style.cssProperties.find((property) => property.name === name)?.value;
}

/**
 * 스타일에서 실제로 쓴 선언만 꺼낸다. CDP는 단축 속성을 펼친 롱핸드도 함께 주는데, 소스 범위가 없는 것이 그것이다.
 * 브라우저 기본 스타일은 범위가 없으므로 모두 쓴다.
 * @param style CDP 스타일
 * @returns 선언 목록
 */
function declarationsOf(style: CdpStyle): Declaration[] {
  const enabled = style.cssProperties.filter(
    (property) => property.disabled !== true && property.parsedOk !== false,
  );
  const written = enabled.some((property) => property.range !== undefined)
    ? enabled.filter((property) => property.range !== undefined)
    : enabled;
  return written.map(declarationOf);
}

/**
 * CDP 선언 하나를 선언으로 바꾼다.
 * @param property CDP 선언
 * @returns 선언
 */
function declarationOf(property: CdpProperty): Declaration {
  return { name: property.name, value: property.value };
}

/**
 * CDP로 요소의 이긴 선언과 변수 사슬을 읽는다. 요소는 page-checks.ts가 붙인 번호 속성으로 찾고, 규칙은 요소마다 한 번만 읽는다.
 * 페이지의 DOM을 바꾼 뒤(번호를 붙인 뒤)에 연다.
 */
export class DeclarationReader {
  private readonly cache = new Map<string, Promise<MatchedLevels | null>>();
  private readonly session: CDPSession;
  private readonly documentId: number;
  private readonly nodeAttribute: string;

  /**
   * 읽기 도구를 만든다. 밖에서는 open으로 만든다.
   * @param session CDP 세션(DOM, CSS 사용 중)
   * @param documentId 문서 노드 ID
   * @param nodeAttribute 요소 번호 속성
   */
  private constructor(session: CDPSession, documentId: number, nodeAttribute: string) {
    this.session = session;
    this.documentId = documentId;
    this.nodeAttribute = nodeAttribute;
  }

  /**
   * 페이지에 CDP 세션을 열고 읽기를 준비한다.
   * @param page Playwright 페이지
   * @param nodeAttribute 요소 번호 속성
   * @returns 읽기 도구
   */
  static async open(page: Page, nodeAttribute: string): Promise<DeclarationReader> {
    const session = await page.context().newCDPSession(page);
    await session.send('DOM.enable');
    await session.send('CSS.enable');
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    return new DeclarationReader(session, root.nodeId, nodeAttribute);
  }

  /** CDP 세션을 닫는다. */
  async close(): Promise<void> {
    await this.session.detach();
  }

  /**
   * 요소(또는 의사 요소)에 맞는 규칙 전체를 읽는다.
   * @param node 요소 번호
   * @param pseudo 의사 요소(`::placeholder`)
   * @returns 규칙 전체, 요소를 찾지 못하면 null
   */
  async matched(node: number, pseudo?: string): Promise<MatchedLevels | null> {
    const key = `${String(node)}${pseudo ?? ''}`;
    let cached = this.cache.get(key);
    if (cached === undefined) {
      cached = this.load(node, pseudo);
      this.cache.set(key, cached);
    }
    return cached;
  }

  /**
   * 속성을 정한 선언을 읽고, 그 선언이 기대한 변수 이름에 닿는지 본다.
   * @codocs [[피그마 일치 검사:판정 항목]]
   * @param node 요소 번호
   * @param property CSS 롱핸드
   * @param variables 기대한 변수 이름 후보
   * @param options 상속, 의사 요소
   * @returns 이긴 선언(없으면 null)과 닿았는지
   */
  async read(
    node: number,
    property: string,
    variables: readonly string[],
    options: LookupOptions = {},
  ): Promise<{ winner: Winner | null; isReached: boolean }> {
    const matched = await this.matched(node, options.pseudo);
    if (matched === null) {
      return { winner: null, isReached: false };
    }
    const winner = findWinner(
      matched,
      property,
      options.inherited ?? isInheritedProperty(property),
    );
    if (winner === null) {
      return { winner, isReached: false };
    }
    const value = shorthandPart(winner.name, property, winner.value);
    return { winner, isReached: reachesVariable(matched, winner.level, value, variables) };
  }

  /**
   * CDP로 규칙을 읽는다.
   * @param node 요소 번호
   * @param pseudo 의사 요소
   * @returns 규칙 전체, 요소를 찾지 못하면 null
   */
  private async load(node: number, pseudo: string | undefined): Promise<MatchedLevels | null> {
    const { nodeId } = await this.session.send('DOM.querySelector', {
      nodeId: this.documentId,
      selector: `[${this.nodeAttribute}="${String(node)}"]`,
    });
    if (nodeId === 0) {
      return null;
    }
    let target = nodeId;
    if (pseudo === '::placeholder') {
      // placeholder는 입력 요소의 브라우저 내부 그림자 트리에 있는 요소가 그린다.
      const { node: described } = await this.session.send('DOM.describeNode', {
        nodeId,
        depth: -1,
        pierce: true,
      });
      const holder = findPseudoHolder(described, PLACEHOLDER_PSEUDO);
      if (holder === undefined) {
        return null;
      }
      const { nodeIds } = await this.session.send('DOM.pushNodesByBackendIdsToFrontend', {
        backendNodeIds: [holder],
      });
      const [holderId] = nodeIds;
      if (holderId === undefined) {
        return null;
      }
      target = holderId;
    } else if (pseudo !== undefined) {
      throw new Error(`의사 요소 ${pseudo}는 읽을 수 없다.`);
    }
    const matched = await this.session.send('CSS.getMatchedStylesForNode', { nodeId: target });
    return toMatchedLevels(matched);
  }
}

/**
 * 그림자 트리에서 pseudo 속성이 그 값인 요소를 찾는다.
 * @param node CDP 노드
 * @param pseudo pseudo 속성 값
 * @returns backendNodeId
 */
function findPseudoHolder(node: CdpNode, pseudo: string): number | undefined {
  const attributes = node.attributes ?? [];
  for (let index = 0; index + 1 < attributes.length; index += 2) {
    if (attributes[index] === 'pseudo' && attributes[index + 1] === pseudo) {
      return node.backendNodeId;
    }
  }
  for (const child of [...(node.shadowRoots ?? []), ...(node.children ?? [])]) {
    const found = findPseudoHolder(child, pseudo);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

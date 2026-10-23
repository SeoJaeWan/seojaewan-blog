import { expectedOfVariable, type FigmaTokens } from './figma-tokens.ts';
import type { VariantChecks } from './layer-checks.ts';
import { TRANSITION_ROLES } from './rules/one-to-one.ts';

// 피그마 변형 사이 프로토타입 전환을 코드의 CSS 전환과 값으로 비교할 확인 항목으로 바꾼다.
// 두 변형의 확인 항목을 비교해 바뀌는 역할을 찾고, 그 역할의 CSS 속성이 전환되는지와 시간·이징 값을 본다.
// CSS 전환은 바뀐 뒤 상태의 transition 값을 쓰므로, 도착 변형의 상태에서 확인한다.

/** 레이어 하나의 들어오는 전환 확인 항목 */
export type TransitionCheck = {
  /** 출발 변형 이름 */
  from: string;
  trigger: string;
  /** 레이어 경로(루트는 빈 문자열) */
  layer: string;
  /** 전환해야 할 CSS 속성 → 그 속성을 바꾸는 피그마 역할 */
  properties: Record<string, string>;
  /** 피그마 전환 시간(ms) */
  duration: number;
  /** 피그마 이징 베지어 값. 스프링 이징이면 null(판정하지 않는다) */
  easing: readonly [number, number, number, number] | null;
};

/** export.json 변형의 transitions 항목 */
type TransitionEntry = {
  to: string;
  trigger: string;
  type: string;
  /** ms. 예전 내보내기는 모션 토큰 이름이다 */
  duration?: number | string;
  /** 베지어 네 값. 예전 내보내기는 모션 토큰 이름이다 */
  easing?: readonly number[] | string | null;
};

/**
 * 도착 변형으로 들어오는 전환마다, 레이어별로 전환해야 할 CSS 속성과 시간·이징 기대값을 만든다.
 * 즉시 전환(시간 없음)은 움직임이 없어 비교하지 않는다.
 * @codocs [[피그마 일치 검사:상태 전환]]
 * @param target 도착 변형 이름
 * @param variants 변형 이름 → export.json 변형 항목
 * @param checksOf 변형 이름 → 레이어 확인 항목
 * @param tokens tokens.json 토큰 표(예전 내보내기의 모션 토큰 이름을 값으로 풀 때 쓴다)
 * @returns 전환 확인 항목
 */
export function incomingTransitions(
  target: string,
  variants: Readonly<Record<string, unknown>>,
  checksOf: (variant: string) => VariantChecks,
  tokens: FigmaTokens,
): TransitionCheck[] {
  const result: TransitionCheck[] = [];
  for (const [from, entry] of Object.entries(variants)) {
    for (const transition of transitionsOf(entry)) {
      if (transition.to !== target || transition.duration === undefined) {
        continue;
      }
      const duration = durationOf(transition.duration, tokens);
      const easing = easingOf(transition.easing, tokens);
      for (const [layer, properties] of changedProperties(checksOf(from), checksOf(target))) {
        if (Object.keys(properties).length > 0) {
          result.push({ from, trigger: transition.trigger, layer, properties, duration, easing });
        }
      }
    }
  }
  return result;
}

/**
 * 두 변형의 확인 항목에서 피그마 값이 다르고 전환해야 하는 역할을 레이어별로 모은다.
 * @param from 출발 변형 확인 항목
 * @param to 도착 변형 확인 항목
 * @returns 레이어 경로 → CSS 속성 → 역할
 */
export function changedProperties(
  from: VariantChecks,
  to: VariantChecks,
): Map<string, Record<string, string>> {
  const before = roleValues(from);
  const after = roleValues(to);
  const changes = new Map<string, Record<string, string>>();
  for (const [key, entry] of after) {
    const previous = before.get(key);
    if (previous?.figma === entry.figma || !to.layers.includes(entry.layer)) {
      continue;
    }
    // 자산 파일이 바뀌면(다른 자산으로 바꿈) 색도 함께 바뀌는 것이라 색 전환을 따로 보지 않는다.
    const isSwapped =
      before.get(`${entry.layer}\u0000자산`)?.figma !==
      after.get(`${entry.layer}\u0000자산`)?.figma;
    if (entry.role === '자산 색' && isSwapped) {
      continue;
    }
    if (
      !TRANSITION_ROLES.some((role) => entry.role === role || entry.role.startsWith(`${role}(`))
    ) {
      continue;
    }
    changes.set(entry.layer, { ...changes.get(entry.layer), [entry.property]: entry.role });
  }
  return changes;
}

type RoleValue = { layer: string; role: string; property: string; figma: string };

/**
 * 확인 항목을 `레이어\0역할` → 피그마 값 표로 펼친다. 글자 구간과 자산도 담는다.
 * @param checks 확인 항목
 * @returns 표
 */
function roleValues(checks: VariantChecks): Map<string, RoleValue> {
  const values = new Map<string, RoleValue>();
  for (const check of checks.checks) {
    putRole(values, check.layer, check.role, check.property, check.figma);
  }
  for (const asset of checks.assets) {
    putRole(values, asset.layer, '자산', 'data-asset', asset.file);
    putRole(values, asset.layer, '자산 색', 'color', asset.color?.figma ?? '');
  }
  for (const text of checks.texts) {
    for (const segment of text.segments) {
      for (const check of segment.checks) {
        putRole(values, text.layer, check.role, check.property, check.figma);
      }
    }
  }
  return values;
}

/**
 * 표에 역할 값을 더한다. 같은 레이어·역할이 여럿이면(변마다 등) 값을 `|`로 잇는다.
 * @param values 표
 * @param layer 레이어 경로
 * @param role 역할
 * @param property CSS 속성
 * @param figma 피그마 값
 */
function putRole(
  values: Map<string, RoleValue>,
  layer: string,
  role: string,
  property: string,
  figma: string,
): void {
  const key = `${layer}\u0000${role}`;
  const previous = values.get(key);
  values.set(key, {
    layer,
    role,
    property,
    figma: previous === undefined ? figma : `${previous.figma}|${figma}`,
  });
}

/**
 * 전환 시간을 ms로 읽는다. 예전 내보내기의 모션 토큰 이름은 tokens.json 값으로 푼다.
 * @param value export.json의 duration
 * @param tokens 토큰 표
 * @returns ms
 */
function durationOf(value: number | string, tokens: FigmaTokens): number {
  if (typeof value === 'number') {
    return value;
  }
  const expected = expectedOfVariable(tokens, value);
  if (expected.kind !== 'ms') {
    throw new Error(`전환 시간 ${value}은 시간 토큰이 아니다.`);
  }
  return expected.value;
}

/**
 * 이징을 베지어 값으로 읽는다. 예전 내보내기의 모션 토큰 이름은 tokens.json 값으로 푼다.
 * @param value export.json의 easing
 * @param tokens 토큰 표
 * @returns 베지어 값, 없거나 스프링이면 null
 */
function easingOf(
  value: TransitionEntry['easing'],
  tokens: FigmaTokens,
): readonly [number, number, number, number] | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    const expected = expectedOfVariable(tokens, value);
    if (expected.kind !== 'bezier') {
      throw new Error(`전환 이징 ${value}은 이징 토큰이 아니다.`);
    }
    return expected.points;
  }
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = value;
  return [x1, y1, x2, y2];
}

/**
 * export.json 변형 항목의 transitions를 읽는다.
 * @param entry 변형 항목
 * @returns 전환 목록
 */
function transitionsOf(entry: unknown): TransitionEntry[] {
  if (entry === null || typeof entry !== 'object') {
    return [];
  }
  const list: unknown = Reflect.get(entry, 'transitions');
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((item): item is TransitionEntry => isTransitionEntry(item));
}

/**
 * 값이 전환 항목 모양인지 본다.
 * @param item 값
 * @returns 전환 항목이면 true
 */
function isTransitionEntry(item: unknown): item is TransitionEntry {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof Reflect.get(item, 'to') === 'string' &&
    typeof Reflect.get(item, 'trigger') === 'string'
  );
}

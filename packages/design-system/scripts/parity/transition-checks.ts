import { variableName } from '../tokens/tokens-css.ts';
import type { VariantChecks } from './layer-checks.ts';
import { transitionProperties } from './rules/class-rules.ts';

// M1: 피그마 변형 사이 프로토타입 전환을 코드의 CSS 전환과 비교할 확인 항목으로 바꾼다.
// 두 변형의 레이어 확인 항목을 비교해 바뀌는 역할을 찾고, 역할 → CSS 속성 표(class-rules.ts)로 전환할 속성을 정한다.
// CSS 전환은 바뀐 뒤 상태의 transition 값을 쓰므로, 도착 변형의 상태에서 확인한다.

/** 토큰 하나(시간 또는 이징)의 기대값 */
export type MotionExpectation = {
  /** 피그마 모션 토큰 이름(`motion/duration/fast`) */
  figma: string;
  /** 코드 클래스(`duration-fast`) */
  className: string;
  /** 기대 계산값을 만들 CSS 값(`var(--motion-duration-fast)`) */
  css: string;
};

/** 레이어 하나의 들어오는 전환 확인 항목 */
export type TransitionCheck = {
  /** 출발 변형 이름 */
  from: string;
  trigger: string;
  /** 레이어 경로(루트는 빈 문자열) */
  layer: string;
  /** 전환해야 할 CSS 속성 → 그 속성을 바꾸는 피그마 역할 */
  properties: Record<string, string>;
  /** 바뀌지만 CSS로 부드럽게 바뀌지 않아 뺀 역할 */
  skipped: string[];
  /** 역할 → CSS 속성 표에 없는 역할(비교할 수 없어 실패) */
  unknown: string[];
  duration: MotionExpectation;
  easing: MotionExpectation;
};

/** export.json 변형의 transitions 항목 */
type TransitionEntry = {
  to: string;
  trigger: string;
  type: string;
  duration?: string;
  easing?: string;
};

/**
 * 도착 변형으로 들어오는 전환마다, 레이어별로 전환해야 할 CSS 속성과 시간·이징 기대값을 만든다.
 * 즉시 전환(INSTANT)은 움직임이 없어 비교하지 않는다.
 * @codocs [[피그마 일치 검사:상태 전환]]
 * @param target 도착 변형 이름
 * @param variants 변형 이름 → export.json 변형 항목
 * @param checksOf 변형 이름 → 레이어 확인 항목
 * @returns 전환 확인 항목
 */
export function incomingTransitions(
  target: string,
  variants: Readonly<Record<string, unknown>>,
  checksOf: (variant: string) => VariantChecks,
): TransitionCheck[] {
  const result: TransitionCheck[] = [];
  for (const [from, entry] of Object.entries(variants)) {
    for (const transition of transitionsOf(entry)) {
      if (
        transition.to !== target ||
        transition.duration === undefined ||
        transition.easing === undefined
      ) {
        continue;
      }
      const changes = changedRoles(checksOf(from), checksOf(target));
      for (const [layer, roles] of changes) {
        const check: TransitionCheck = {
          from,
          trigger: transition.trigger,
          layer,
          properties: {},
          skipped: [],
          unknown: [],
          duration: motionExpectation(transition.duration, 'duration'),
          easing: motionExpectation(transition.easing, 'ease'),
        };
        // 자산 파일이 바뀌면(다른 자산으로 바꿈) 색도 함께 바뀌는 것이라 색 전환을 따로 보지 않는다.
        const isAssetSwap = roles.includes('자산');
        for (const role of roles) {
          const property = isAssetSwap && role === '자산 색' ? null : transitionProperty(role);
          if (property === undefined) {
            check.unknown.push(role);
          } else if (property === null) {
            check.skipped.push(role);
          } else {
            check.properties[property] = role;
          }
        }
        result.push(check);
      }
    }
  }
  return result;
}

/**
 * 두 변형의 레이어 확인 항목에서 값(피그마 이름)이 다른 역할을 레이어별로 모은다.
 * @param from 출발 변형 확인 항목
 * @param to 도착 변형 확인 항목
 * @returns 레이어 경로 → 바뀌는 역할
 */
export function changedRoles(from: VariantChecks, to: VariantChecks): Map<string, string[]> {
  const before = roleValues(from);
  const after = roleValues(to);
  const changes = new Map<string, string[]>();
  for (const key of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(key) === after.get(key)) {
      continue;
    }
    const [layer = '', role = ''] = key.split('\u0000');
    if (!to.layers.includes(layer)) {
      continue;
    }
    changes.set(layer, [...new Set([...(changes.get(layer) ?? []), role])]);
  }
  return changes;
}

/**
 * 레이어 확인 항목을 `레이어\0역할` → 피그마 이름 표로 펼친다. 글자 구간과 자산도 담는다.
 * @param checks 레이어 확인 항목
 * @returns 표
 */
function roleValues(checks: VariantChecks): Map<string, string> {
  const values = new Map<string, string>();
  for (const check of checks.checks) {
    putRoleValue(values, check.layer, check.role, check.figma);
  }
  for (const asset of checks.assets) {
    putRoleValue(values, asset.layer, '자산', asset.file);
    putRoleValue(values, asset.layer, '자산 색', asset.color?.figma ?? '');
  }
  for (const text of checks.texts) {
    for (const segment of text.segments) {
      putRoleValue(values, text.layer, '글자 색', segment.fill?.figma ?? '');
      putRoleValue(values, text.layer, '글자 스타일', segment.textStyle);
    }
  }
  return values;
}

/**
 * 역할 값 하나를 표에 더한다. 같은 역할이 여럿이면(글자 구간 등) 값을 이어 붙인다.
 * @param values 표
 * @param layer 레이어 경로
 * @param role 역할
 * @param value 피그마 이름
 */
function putRoleValue(
  values: Map<string, string>,
  layer: string,
  role: string,
  value: string,
): void {
  const key = `${layer}\u0000${role}`;
  values.set(key, values.has(key) ? `${values.get(key) ?? ''}|${value}` : value);
}

/**
 * 역할에 맞는 CSS 전환 속성을 찾는다.
 * @param role 역할 이름(구간·방향 꼬리 포함)
 * @returns CSS 속성, 전환하지 않는 역할이면 null, 표에 없으면 undefined
 */
function transitionProperty(role: string): string | null | undefined {
  if (role in transitionProperties) {
    return transitionProperties[role];
  }
  if (role.startsWith('모서리 반경')) {
    return transitionProperties['모서리 반경'];
  }
  if (role.startsWith('절대 위치')) {
    return transitionProperties['절대 위치'];
  }
  if (role.endsWith(' 채우기') || role.endsWith(' 내용 맞춤')) {
    return null;
  }
  return undefined;
}

/**
 * 모션 토큰 이름으로 클래스와 기대 CSS 값을 만든다.
 * @param token `motion/duration/fast`, `motion/easing/fade`
 * @param prefix 클래스 접두어(`duration`, `ease`)
 * @returns 기대값
 */
function motionExpectation(token: string, prefix: 'duration' | 'ease'): MotionExpectation {
  const segments = token.split('/');
  return {
    figma: token,
    className: `${prefix}-${segments.at(-1) ?? ''}`,
    css: `var(${variableName(segments)})`,
  };
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

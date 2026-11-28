import type { StateCondition } from '../../src/behaviors/behavior-spec.ts';
import type {
  AutoLayout,
  Bindable,
  Corners,
  Easing,
  Layer,
  MotionTimeline,
  MotionTrack,
  MotionValue,
  Paints,
  Sides,
  Stroke,
  TransitionMotion,
  VariableRef,
} from '../../src/figma-export/component-schema.ts';
import { MOTION_WRAPPER_LAYER } from '../../src/figma-export/component-schema.ts';
import { type LayerKey, ROOT_LAYER_KEY } from '../../src/figma-export/layer-key.ts';
import { cssName } from '../tokens/tokens-css.ts';
import {
  ComponentGenerationError,
  type ComponentModel,
  type ConditionTerm,
  type GenerationContext,
  type LayerNode,
  type VariantInfo,
} from './component-model.ts';
import { modifierClassName, nameWords } from './component-naming.ts';

// 스킨의 CSS를 만든다. 레이어마다 모습을 칸(slot)별 선언으로 읽고, 기본 모습은 전부, 다른 변형은 기본과의 차이만 낸다.
// 값은 토큰 클래스(`@apply`)로 내고, 크기·위치·움직임만 숫자로 낸다. 모든 규칙은 `:where()` 안에 두어
// 우선순위를 적은 순서로만 정하고, 쓰는 곳의 클래스(utilities 층)가 언제나 이기도록 components 층에 둔다.

/** 효과 스타일이 어느 클래스로 옮겨지는지. tokens.css에서 읽는다 */
export type EffectStyleKind = 'shadow' | 'backdrop-blur' | 'surface';

/** 생성기가 토큰에서 알아야 하는 것 */
export type TokenCatalog = {
  effectKind: (token: string) => EffectStyleKind;
};

/** 레이어 하나의 모습. 칸 이름 → 선언 */
type Look = Map<string, string>;

/** 비교한 칸이 사라졌을 때 되돌리는 선언 */
const resetDeclarations: Readonly<Record<string, string>> = {
  display: 'display: none;',
  gap: 'column-gap: 0; row-gap: 0;',
  padding: 'padding: 0;',
  width: 'width: auto;',
  height: 'height: auto;',
  flex: 'flex: 0 1 auto; align-self: auto;',
  minWidth: 'min-width: 0;',
  maxWidth: 'max-width: none;',
  minHeight: 'min-height: 0;',
  maxHeight: 'max-height: none;',
  aspect: 'aspect-ratio: auto;',
  position: 'position: static; isolation: auto;',
  inset: 'inset: auto;',
  overflow: 'overflow: visible;',
  background: 'background-color: transparent; background-image: none;',
  color: 'color: inherit;',
  ring: '&::before { content: none; }',
  border: 'border-width: 0;',
  outline: 'outline-style: none;',
  radius: 'border-radius: 0;',
  effect: 'box-shadow: none; text-shadow: none; backdrop-filter: none;',
  opacity: 'opacity: 1;',
  rotate: 'rotate: none;',
  scale: 'scale: none;',
  fit: 'object-fit: fill;',
  whiteSpace: 'white-space: normal;',
  textAlign: 'text-align: start;',
  truncate: 'overflow: visible; text-overflow: clip;',
};

/** 변형 사이 전환으로 움직이는 칸과 그 CSS 속성([[디자인 시스템:상태]]) */
const transitionProperties: Readonly<Record<string, readonly string[]>> = {
  background: ['background-color'],
  color: ['color'],
  border: ['border-color'],
  outline: ['outline-color'],
  effect: ['box-shadow'],
  opacity: ['opacity'],
};

/** 이름만 있는 피그마 이징의 곡선. 피그마가 곡선 숫자를 주지 않는 종류다 */
const namedEasings: Readonly<Partial<Record<Easing['type'], string>>> = {
  LINEAR: 'linear',
  EASE_IN: 'cubic-bezier(0.42, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.58, 1)',
  EASE_IN_AND_OUT: 'cubic-bezier(0.42, 0, 0.58, 1)',
  EASE_IN_BACK: 'cubic-bezier(0.3, -0.05, 0.7, -0.5)',
  EASE_OUT_BACK: 'cubic-bezier(0.45, 1.45, 0.8, 1)',
  EASE_IN_AND_OUT_BACK: 'cubic-bezier(0.7, -0.4, 0.4, 1.4)',
  HOLD: 'steps(1, end)',
};

/** 숫자를 CSS에 쓸 때의 소수 자리 */
const NUMBER_PRECISION = 4;

/** 흐름 순서. 기본 모습 → 다른 입력 묶음 → 상태 → 모바일 순서로 낸다 */
type Rule = { selector: string; body: string; isHover: boolean; transition: string | null };

/**
 * 컴포넌트의 스킨 CSS를 만든다.
 * @codocs [[디자인 시스템:상태]]
 * @codocs [[디자인 시스템:기기 변형]]
 * @codocs [[디자인 시스템:크기 변수]]
 * @codocs [[디자인 시스템:토큰 사용 강제]]
 * @codocs [[디자인 시스템:모션 클래스]]
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @param tokens 토큰 정보
 * @param tokensPath 이 CSS에서 tokens.css까지의 상대 경로
 * @returns CSS 글
 */
export function skinCss(
  model: ComponentModel,
  context: GenerationContext,
  tokens: TokenCatalog,
  tokensPath: string,
): string {
  const reader = new LookReader(model, context, tokens);
  const desktopRules: Rule[] = [];
  const mobileRules: Rule[] = [];
  const combos = comboBases(model);
  const defaultBase = combos[0];
  if (defaultBase === undefined) {
    throw new ComponentGenerationError(model.schema.name, '변형이 없다.');
  }
  const baseTransitions = transitionsFrom(defaultBase.base);
  for (const [comboIndex, { base, members }] of combos.entries()) {
    const comboClasses = combos.length > 1 ? comboModifiers(model, base) : [];
    const modifiers = comboIndex === 0 ? [] : comboClasses;
    for (const node of reader.nodesIn(members)) {
      const from =
        comboIndex === 0 ? new Map<string, string>() : reader.look(node, defaultBase.base);
      const to = reader.look(node, base);
      const body = diffLooks(from, to, comboIndex === 0);
      if (body !== '') {
        desktopRules.push({
          selector: reader.selector(node, modifiers, []),
          body,
          isHover: false,
          transition: baseTransitionFor(reader, node, base, members, baseTransitions),
        });
      }
    }
    const states = members
      .filter((info) => info !== base && info.motion === null)
      .toSorted(compareVariants);
    for (const info of states) {
      const reference = info.isMobile ? (desktopTwin(members, info) ?? base) : base;
      const incoming = incomingTransition(model, info, base);
      for (const node of reader.nodesIn(members)) {
        const from = reader.look(node, reference);
        const to = reader.look(node, info);
        const body = diffLooks(from, to, false);
        if (body === '') {
          continue;
        }
        const rule: Rule = {
          selector: reader.selector(node, comboClasses, info.terms),
          body,
          isHover: info.terms.some(isHoverTerm),
          transition: stateTransition(from, to, incoming, baseTransitions !== null),
        };
        (info.isMobile ? mobileRules : desktopRules).push(rule);
      }
    }
  }
  const motion = motionCss(model, reader);
  return [
    '@layer theme, base, components, utilities;',
    `@reference '${tokensPath}';`,
    '',
    ...motion.keyframes,
    '@layer components {',
    ...desktopRules.map(ruleCss),
    ...(mobileRules.length === 0 ? [] : ['@variant mobile {', ...mobileRules.map(ruleCss), '}']),
    ...motion.rules,
    '}',
    '',
  ].join('\n');
}

/**
 * 입력 묶음마다 기본 모습의 변형(상태 조건 없음, 기본 기기, 가만히 있음)과 묶음의 변형을 모은다.
 * 기본 입력 값의 묶음이 맨 앞이다.
 * @param model 읽은 컴포넌트
 * @returns 묶음
 */
export function comboBases(
  model: ComponentModel,
): { combo: string; base: VariantInfo; members: VariantInfo[] }[] {
  const groups = new Map<string, VariantInfo[]>();
  for (const info of model.variants) {
    groups.set(info.combo, [...(groups.get(info.combo) ?? []), info]);
  }
  const defaultCombo = model.axes
    .filter((axis) => axis.kind === 'prop')
    .map((axis) => axis.options.find((option) => option.figma === axis.defaultValue)?.code ?? '')
    .join('/');
  return [...groups.entries()]
    .toSorted(([a], [b]) => Number(b === defaultCombo) - Number(a === defaultCombo))
    .map(
      /**
       * 묶음 하나의 기본 변형을 고른다.
       * @param root0 받는 값
       * @param root0."0" 묶음 이름
       * @param root0."1" 묶음의 변형
       */
      ([combo, members]) => ({
        combo,
        members,
        base: comboBase(model, members),
      }),
    );
}

/**
 * 묶음의 기본 모습 변형을 고른다. 상태 조건이 없고 기본 기기이고 가만히 있는 변형이다.
 * @param model 읽은 컴포넌트
 * @param members 묶음의 변형
 * @returns 기본 변형
 */
function comboBase(model: ComponentModel, members: readonly VariantInfo[]): VariantInfo {
  const base =
    members.find((info) => info.terms.length === 0 && !info.isMobile && info.motion === null) ??
    members[0];
  if (base === undefined) {
    throw new ComponentGenerationError(model.schema.name, '변형이 없는 묶음이 있다.');
  }
  return base;
}

/**
 * 같은 묶음의 변형 순서를 정한다. 약한 조건이 먼저 나오고 강한 조건이 뒤에서 이긴다.
 * 가장 강한 낱말이 같으면 낱말이 적은 쪽이 먼저다(그린 조합이 낱말 하나를 이긴다).
 * @codocs [[디자인 시스템:상태]]
 * @param a 변형
 * @param b 변형
 * @returns 정렬 값
 */
function compareVariants(a: VariantInfo, b: VariantInfo): number {
  return (
    Number(a.isMobile) - Number(b.isMobile) ||
    strongest(b) - strongest(a) ||
    a.terms.length - b.terms.length ||
    a.index - b.index
  );
}

/**
 * 변형의 가장 강한 조건의 우선순위를 구한다.
 * @param info 변형
 * @returns 우선순위. 조건이 없으면 가장 약하다
 */
function strongest(info: VariantInfo): number {
  return Math.min(...info.terms.map((term) => term.priority), Number.MAX_SAFE_INTEGER);
}

/**
 * 모바일 변형과 상태가 같은 데스크톱 변형을 찾는다.
 * @param members 묶음의 변형
 * @param info 모바일 변형
 * @returns 데스크톱 변형
 */
function desktopTwin(members: readonly VariantInfo[], info: VariantInfo): VariantInfo | undefined {
  const words = info.terms.map((term) => term.word).join(' ');
  return members.find(
    (candidate) =>
      !candidate.isMobile &&
      candidate.motion === null &&
      candidate.terms.map((term) => term.word).join(' ') === words,
  );
}

/**
 * 묶음의 변형 값 클래스를 모은다.
 * @param model 읽은 컴포넌트
 * @param base 묶음의 기본 변형
 * @returns 클래스
 */
function comboModifiers(model: ComponentModel, base: VariantInfo): string[] {
  return model.axes
    .filter((axis) => axis.kind === 'prop')
    .map((axis) =>
      modifierClassName(model.fileName, axis.input, base.propValues[axis.input] ?? ''),
    );
}

/**
 * 조건이 올림인지 본다.
 * @param term 조건
 * @returns 올림이면 true
 */
function isHoverTerm(term: ConditionTerm): boolean {
  return conditionHasHover(term.condition);
}

/**
 * 조건 안에 올림이 있는지 본다.
 * @param condition 조건
 * @returns 올림이 있으면 true
 */
function conditionHasHover(condition: StateCondition): boolean {
  if (condition.kind === 'pseudo-class') {
    return condition.name === 'hover';
  }
  return condition.kind === 'not' && conditionHasHover(condition.condition);
}

/**
 * 조건을 CSS 선택자 조각으로 옮긴다.
 * @codocs [[디자인 시스템:상태]]
 * @param condition 조건
 * @returns `:hover`, `[aria-selected='true']`, `[data-current]`, `:not(:focus-within)`
 */
export function conditionSelector(condition: StateCondition): string {
  switch (condition.kind) {
    case 'pseudo-class':
      return `:${condition.name}`;
    case 'aria':
      return `[${condition.attribute}='${condition.value}']`;
    case 'data':
      return condition.value === null
        ? `[${condition.attribute}]`
        : `[${condition.attribute}='${condition.value}']`;
    case 'not':
      return `:not(${conditionSelector(condition.condition)})`;
  }
}

/**
 * 두 모습의 차이를 선언으로 낸다.
 * @param from 앞 모습
 * @param to 뒤 모습
 * @param isFull 앞 모습 없이 전부 낼지
 * @returns 선언 글. 차이가 없으면 빈 글
 */
function diffLooks(from: Look, to: Look, isFull: boolean): string {
  const lines: string[] = [];
  for (const [slot, body] of to) {
    if (isFull || from.get(slot) !== body) {
      lines.push(body);
    }
  }
  if (!isFull) {
    for (const slot of from.keys()) {
      if (!to.has(slot)) {
        lines.push(resetDeclarations[slot] ?? '');
      }
    }
  }
  return lines.filter((line) => line !== '').join(' ');
}

/**
 * 바뀐 칸 가운데 전환으로 움직이는 CSS 속성을 모은다.
 * @param from 앞 모습
 * @param to 뒤 모습
 * @returns CSS 속성
 */
function changedTransitionProperties(from: Look, to: Look): string[] {
  const properties: string[] = [];
  for (const [slot, names] of Object.entries(transitionProperties)) {
    if (from.get(slot) !== to.get(slot)) {
      properties.push(...names);
    }
  }
  return properties;
}

/**
 * 이 변형으로 들어오는 전환을 찾는다. 묶음의 기본 변형에서 오는 것을 먼저 쓴다.
 * @param model 읽은 컴포넌트
 * @param info 도착 변형
 * @param base 묶음의 기본 변형
 * @returns 전환. 바로 바뀌면 null
 */
function incomingTransition(
  model: ComponentModel,
  info: VariantInfo,
  base: VariantInfo,
): TransitionMotion | null {
  const sources = [base, ...model.variants.filter((candidate) => candidate !== base)];
  for (const source of sources) {
    const found = source.variant.transitions.find(
      (transition) => transition.destination === info.variant.name,
    );
    if (found !== undefined) {
      return found.transition;
    }
  }
  return null;
}

/**
 * 기본 상태에 걸린 전환(기본 상태로 돌아올 때 쓴다)을 찾는다.
 * @param base 기본 변형
 * @returns 전환. 없으면 null
 */
function transitionsFrom(base: VariantInfo): TransitionMotion | null {
  return (
    base.variant.transitions.find((transition) => transition.transition !== null)?.transition ??
    null
  );
}

/**
 * 기본 모습 규칙에 걸 전환을 만든다. 이 레이어가 기본 상태와 전환이 걸린 상태 사이에서 바뀌는 속성에 건다.
 * @param reader 모습을 읽는 곳
 * @param node 마디
 * @param base 묶음의 기본 변형
 * @param members 묶음의 변형
 * @param transition 기본 상태에 걸린 전환
 * @returns transition 선언. 없으면 null
 */
function baseTransitionFor(
  reader: LookReader,
  node: LayerNode,
  base: VariantInfo,
  members: readonly VariantInfo[],
  transition: TransitionMotion | null,
): string | null {
  if (transition === null) {
    return null;
  }
  const destinations = new Set(base.variant.transitions.map((item) => item.destination));
  const properties = new Set<string>();
  for (const info of members) {
    if (destinations.has(info.variant.name)) {
      for (const property of changedTransitionProperties(
        reader.look(node, base),
        reader.look(node, info),
      )) {
        properties.add(property);
      }
    }
  }
  return properties.size === 0 ? null : transitionDeclaration([...properties], transition);
}

/**
 * 상태 규칙에 걸 전환을 만든다. 들어오는 전환이 없는데 기본 상태에 전환이 있으면 바로 바뀌게 끈다.
 * @param from 기본 모습
 * @param to 이 상태의 모습
 * @param incoming 들어오는 전환
 * @param hasBaseTransition 기본 상태에 전환이 걸렸는지
 * @returns transition 선언. 없으면 null
 */
function stateTransition(
  from: Look,
  to: Look,
  incoming: TransitionMotion | null,
  hasBaseTransition: boolean,
): string | null {
  const properties = changedTransitionProperties(from, to);
  if (properties.length === 0) {
    return null;
  }
  if (incoming === null) {
    return hasBaseTransition ? 'transition-property: none;' : null;
  }
  return transitionDeclaration(properties, incoming);
}

/**
 * transition 선언을 만든다.
 * @param properties CSS 속성
 * @param transition 전환
 * @returns 선언 글
 */
function transitionDeclaration(
  properties: readonly string[],
  transition: TransitionMotion,
): string {
  return [
    `transition-property: ${properties.join(', ')};`,
    `transition-duration: ${formatNumber(transition.duration * 1000)}ms;`,
    `transition-timing-function: ${easingCss(transition.easing)};`,
  ].join(' ');
}

/**
 * 피그마 이징을 CSS 이징으로 옮긴다. 곡선 숫자가 있으면 그대로 쓰고, 이름만 있으면 피그마의 같은 곡선을 쓴다.
 * 스프링은 CSS로 옮길 수 없어 실패한다.
 * @codocs [[디자인 시스템:모션]]
 * @param easing 피그마 이징
 * @returns CSS 이징
 */
export function easingCss(easing: Easing): string {
  if (easing.bezier !== null) {
    const { x1, y1, x2, y2 } = easing.bezier;
    return `cubic-bezier(${[x1, y1, x2, y2].map(formatNumber).join(', ')})`;
  }
  const named = namedEasings[easing.type];
  if (named === undefined) {
    throw new Error(`[components] 이징 \`${easing.type}\`은 CSS로 옮길 규칙이 없다.`);
  }
  return named;
}

/**
 * 규칙 하나를 CSS로 쓴다. 올림 조건은 마우스가 있는 기기에서만 걸고, 전환은 동작 줄이기에서 걸지 않는다.
 * @codocs [[디자인 시스템:상태]]
 * @codocs [[디자인 시스템:동작 줄이기]]
 * @param rule 규칙
 * @returns CSS 글
 */
function ruleCss(rule: Rule): string {
  const lines = [`${rule.selector} { ${rule.body} }`];
  if (rule.transition !== null) {
    lines.push(
      `@media (prefers-reduced-motion: no-preference) { ${rule.selector} { ${rule.transition} } }`,
    );
  }
  const text = lines.join('\n');
  return rule.isHover ? `@media (hover: hover) {\n${text}\n}` : text;
}

/**
 * 레이어의 모습을 읽고 선택자를 만든다. 품은 컴포넌트의 루트 크기와 표시 방법을 알기 위해 그 컴포넌트를 읽는다.
 */
class LookReader {
  private readonly cache = new Map<string, Look>();
  private readonly model: ComponentModel;
  private readonly context: GenerationContext;
  private readonly tokens: TokenCatalog;

  /**
   * 읽을 컴포넌트를 받는다.
   * @param model 읽은 컴포넌트
   * @param context 품은 컴포넌트를 읽는 곳
   * @param tokens 토큰 정보
   */
  constructor(model: ComponentModel, context: GenerationContext, tokens: TokenCatalog) {
    this.model = model;
    this.context = context;
    this.tokens = tokens;
  }

  /**
   * 묶음 안 어느 변형에든 있는 마디를 나무 순서로 모은다.
   * @param members 묶음의 변형
   * @returns 마디
   */
  nodesIn(members: readonly VariantInfo[]): LayerNode[] {
    return [...this.model.nodes.values()].filter((node) =>
      members.some((info) => node.layers[info.index] !== undefined),
    );
  }

  /**
   * 마디의 한 변형 모습을 읽는다. 그 변형에 없거나 숨긴 레이어는 `display: none`이다.
   * @param node 마디
   * @param info 변형
   * @returns 모습
   */
  look(node: LayerNode, info: VariantInfo): Look {
    const cacheKey = `${node.key}\u0000${String(info.index)}`;
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    const layer = node.layers[info.index];
    const parent = layer === undefined ? undefined : this.parentLayer(node, info);
    const look =
      layer === undefined || (!layer.isVisible && layer.propertyRefs.visible === undefined)
        ? new Map([['display', 'display: none;']])
        : this.layerLook(node, layer, parent);
    this.cache.set(cacheKey, look);
    return look;
  }

  /**
   * 규칙의 선택자를 만든다. 레이어 클래스와 루트의 변형 값 클래스, 조건을 잇고 `:where()`로 감싼다.
   * 품은 컴포넌트의 루트(바깥 클래스를 받은 요소)는 클래스 하나만큼 강하게 두어 안쪽 컴포넌트의 기본 모습을 이긴다.
   * @param node 대상 마디
   * @param modifiers 루트의 변형 값 클래스
   * @param terms 상태 조건
   * @returns 선택자
   */
  selector(node: LayerNode, modifiers: readonly string[], terms: readonly ConditionTerm[]): string {
    const root = this.model.tree;
    let rootCompound = `.${root.className}${modifiers.map((modifier) => `.${modifier}`).join('')}`;
    let targetCompound = `.${node.className}`;
    let hasContext = modifiers.length > 0;
    for (const term of terms) {
      const fragment = conditionSelector(term.condition);
      const targets = this.roleNodes(term.target);
      hasContext = true;
      if (targets.includes(root)) {
        rootCompound += fragment;
      } else if (targets.includes(node)) {
        targetCompound += fragment;
      } else {
        rootCompound += `:has(${targets.map((target) => `.${target.className}${fragment}`).join(', ')})`;
      }
    }
    if (node.kind === 'instance' && node !== root) {
      return hasContext ? `:where(${rootCompound}) ${targetCompound}` : targetCompound;
    }
    if (node === root) {
      return `:where(${rootCompound})`;
    }
    return hasContext ? `:where(${rootCompound} ${targetCompound})` : `:where(${targetCompound})`;
  }

  /**
   * 역할을 맡은 마디를 찾는다.
   * @param role 역할 이름
   * @returns 마디. 루트 역할이면 루트다
   */
  roleNodes(role: string): LayerNode[] {
    const found = [...this.model.nodes.values()].filter((node) =>
      node.roles.some((spec) => spec.role === role),
    );
    return found.length === 0 ? [this.model.tree] : found;
  }

  /**
   * 변형에서 마디의 부모 레이어를 찾는다.
   * @param node 마디
   * @param info 변형
   * @returns 부모 레이어. 루트면 undefined
   */
  private parentLayer(node: LayerNode, info: VariantInfo): Layer | undefined {
    if (node.key === ROOT_LAYER_KEY) {
      return undefined;
    }
    for (const candidate of this.model.nodes.values()) {
      if (!candidate.children.includes(node)) {
        continue;
      }
      const layer = candidate.layers[info.index];
      if (node.slotContent !== null && layer?.kind === 'instance') {
        const slotNode = this.context.modelOf(layer.component).nodes.get(node.slotContent.layer);
        return slotNode?.layers.find((slotLayer) => slotLayer !== undefined);
      }
      return layer;
    }
    return undefined;
  }

  /**
   * 레이어 하나의 모습을 칸별로 읽는다.
   * @param node 마디
   * @param layer 레이어
   * @param parent 부모 레이어
   * @returns 모습
   */
  private layerLook(node: LayerNode, layer: Layer, parent: Layer | undefined): Look {
    const look: Look = new Map();
    const componentName = this.model.schema.name;
    /**
     * 칸에 선언을 둔다. 빈 선언은 두지 않는다.
     * @param slot 칸 이름
     * @param body 선언
     */
    function put(slot: string, body: string): void {
      if (body !== '') {
        look.set(slot, body);
      }
    }
    /**
     * 이 레이어를 옮길 수 없다고 알린다.
     * @param message 이유
     */
    function fail(message: string): never {
      throw new ComponentGenerationError(componentName, `레이어 \`${layer.key}\`: ${message}`);
    }
    const isRoot = node.key === ROOT_LAYER_KEY;
    const isInstance = layer.kind === 'instance';
    if (layer.kind === 'box' || layer.kind === 'slot') {
      put('display', layer.layout === null ? 'display: block;' : flexDisplay(layer.layout));
      if (layer.layout !== null) {
        put('gap', gapApply(layer.layout, fail));
        put('padding', paddingApply(layer.layout.padding, fail));
      }
      put('overflow', overflowDeclaration(layer.isClippingContent, layer.overflowDirection));
    } else if (layer.kind === 'text' || layer.kind === 'asset') {
      put('display', textDisplay(layer));
    } else if (isInstance && parent !== undefined) {
      const inner = this.context.modelOf(layer.component);
      const isFlex = inner.tree.layers.some(
        (rootLayer) => rootLayer?.kind === 'box' && rootLayer.layout !== null,
      );
      put('display', `display: ${isFlex ? 'flex' : 'block'};`);
    }
    for (const [slot, body] of sizingDeclarations(layer, parent, isRoot)) {
      put(slot, body);
    }
    const hasRing =
      layer.kind !== 'instance' && layer.kind !== 'asset' && hasInsideRing(layer.stroke);
    const hasAbsoluteChild =
      (layer.kind === 'box' || layer.kind === 'slot') &&
      layer.children.some((child) => isAbsolute(child, layer));
    if (parent !== undefined && isAbsolute(layer, parent)) {
      put('position', `position: absolute;${hasRing ? ' isolation: isolate;' : ''}`);
      put('inset', insetDeclaration(layer, parent));
    } else if (hasRing || hasAbsoluteChild) {
      put('position', `position: relative;${hasRing ? ' isolation: isolate;' : ''}`);
    }
    if (layer.kind === 'box' || layer.kind === 'slot') {
      put('background', fillApply(layer.fills, fail));
      put('ring', ringApply(layer.stroke, fail));
      put('border', borderApply(layer.stroke, fail));
      put('outline', outlineApply(layer.stroke, fail));
      put('radius', radiusApply(layer.cornerRadius, fail));
      put('effect', this.effectApply(layer.effectStyle, false));
      if ('paints' in layer.fills) {
        const image = layer.fills.paints.find((paint) => paint.type === 'IMAGE');
        if (image !== undefined) {
          put('fit', `object-fit: ${image.scaleMode === 'FIT' ? 'contain' : 'cover'};`);
        }
      }
    } else if (layer.kind === 'text') {
      put('color', textColorApply(layer.fills, fail));
      put('type', `@apply type-${styleToken(layer.textStyle)};`);
      put('effect', this.effectApply(layer.effectStyle, true));
      if (layer.stroke !== null) {
        fail('글자 선은 옮길 규칙이 없다.');
      }
      for (const [slot, body] of textDeclarations(layer)) {
        put(slot, body);
      }
    } else if (layer.kind === 'asset') {
      if (layer.color !== null) {
        put('color', `@apply text-${bindableColorToken(layer.color, fail)};`);
      }
      if (layer.scaleMode !== null) {
        put('fit', `object-fit: ${layer.scaleMode === 'FIT' ? 'contain' : 'cover'};`);
      }
    }
    put('opacity', opacityDeclaration(layer.opacity));
    if (layer.rotation !== 0) {
      put('rotate', `rotate: ${formatNumber(-layer.rotation)}deg;`);
    }
    if ((layer.kind === 'instance' || layer.kind === 'asset') && layer.scaleFactor !== 1) {
      put('scale', `scale: ${formatNumber(layer.scaleFactor)}; transform-origin: 0 0;`);
    }
    return look;
  }

  /**
   * 효과 스타일을 클래스로 옮긴다.
   * @param effectStyle 효과 스타일 이름
   * @param isText 글자 레이어인지
   * @returns `@apply` 선언. 없으면 빈 글
   */
  private effectApply(effectStyle: string | null, isText: boolean): string {
    if (effectStyle === null) {
      return '';
    }
    const token = styleToken(effectStyle);
    if (isText) {
      return `@apply text-shadow-${token};`;
    }
    const kind = this.tokens.effectKind(token);
    return `@apply ${kind === 'surface' ? token : `${kind}-${token}`};`;
  }
}

/**
 * 자동 배치를 flex로 옮긴다.
 * @param layout 자동 배치
 * @returns display 선언
 */
function flexDisplay(layout: AutoLayout): string {
  const justify = {
    MIN: 'flex-start',
    CENTER: 'center',
    MAX: 'flex-end',
    SPACE_BETWEEN: 'space-between',
  };
  const align = { MIN: 'flex-start', CENTER: 'center', MAX: 'flex-end', BASELINE: 'baseline' };
  return [
    'display: flex;',
    `flex-direction: ${layout.mode === 'HORIZONTAL' ? 'row' : 'column'};`,
    `flex-wrap: ${layout.wrap === 'WRAP' ? 'wrap' : 'nowrap'};`,
    `justify-content: ${justify[layout.primaryAxisAlign]};`,
    `align-items: ${align[layout.counterAxisAlign]};`,
    ...(layout.wrap === 'WRAP'
      ? [
          `align-content: ${layout.counterAxisAlignContent === 'SPACE_BETWEEN' ? 'space-between' : 'flex-start'};`,
        ]
      : []),
  ].join(' ');
}

/**
 * 글자와 자산의 display를 정한다. 세로 정렬이 위가 아닌 글자는 세로 flex로 정렬한다.
 * @param layer 글자나 자산 레이어
 * @returns display 선언
 */
function textDisplay(layer: Layer): string {
  if (layer.kind === 'text' && layer.textAlignVertical !== 'TOP') {
    return `display: flex; flex-direction: column; justify-content: ${layer.textAlignVertical === 'CENTER' ? 'center' : 'flex-end'};`;
  }
  return 'display: block;';
}

/**
 * 자동 배치의 간격을 토큰 클래스로 옮긴다. 양쪽 끝 맞춤이면 간격을 쓰지 않는다.
 * @param layout 자동 배치
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function gapApply(layout: AutoLayout, fail: (message: string) => never): string {
  const classes: string[] = [];
  const mainAxis = layout.mode === 'HORIZONTAL' ? 'x' : 'y';
  const crossAxis = mainAxis === 'x' ? 'y' : 'x';
  if (layout.primaryAxisAlign !== 'SPACE_BETWEEN') {
    const token = spacingToken(layout.itemSpacing, '간격', fail);
    if (token !== null) {
      classes.push(`gap-${mainAxis}-${token}`);
    }
  }
  if (layout.counterAxisSpacing !== null) {
    const token = spacingToken(layout.counterAxisSpacing, '줄 간격', fail);
    if (token !== null) {
      classes.push(`gap-${crossAxis}-${token}`);
    }
  }
  return classes.length === 0 ? '' : `@apply ${classes.join(' ')};`;
}

/**
 * 안쪽 여백을 토큰 클래스로 옮긴다. 네 변이 같으면 `p-`, 두 쌍이 같으면 `px-`·`py-`를 쓴다.
 * @param padding 네 변의 여백
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function paddingApply(padding: Sides<Bindable<number>>, fail: (message: string) => never): string {
  const top = spacingToken(padding.top, '여백', fail);
  const right = spacingToken(padding.right, '여백', fail);
  const bottom = spacingToken(padding.bottom, '여백', fail);
  const left = spacingToken(padding.left, '여백', fail);
  const classes: string[] = [];
  /**
   * 토큰이 있으면 클래스를 더한다.
   * @param prefix 유틸리티 앞부분
   * @param token 토큰 이름. 0이면 null
   */
  function add(prefix: string, token: string | null): void {
    if (token !== null) {
      classes.push(`${prefix}-${token}`);
    }
  }
  if (top === right && right === bottom && bottom === left) {
    add('p', top);
  } else if (top === bottom && left === right) {
    add('px', left);
    add('py', top);
  } else {
    add('pt', top);
    add('pr', right);
    add('pb', bottom);
    add('pl', left);
  }
  return classes.length === 0 ? '' : `@apply ${classes.join(' ')};`;
}

/**
 * 간격 값을 토큰 이름으로 옮긴다. 0은 토큰 없이 둔다.
 * @param value 피그마 값
 * @param what 메시지에 쓸 이름
 * @param fail 실패를 알린다
 * @returns 토큰 이름. 0이면 null
 */
function spacingToken(
  value: Bindable<number>,
  what: string,
  fail: (message: string) => never,
): string | null {
  if ('variable' in value) {
    return variableToken(value.variable);
  }
  if (value.value === 0) {
    return null;
  }
  return fail(`${what} ${String(value.value)}이 토큰에 묶여 있지 않다.`);
}

/**
 * 크기와 자리 선언을 만든다. 루트의 고정 크기는 기본값이고, 부모 자동 배치 안에서는 flex로 옮긴다.
 * 품은 컴포넌트는 내용에 맞추면 크기를 적지 않아 그 컴포넌트가 정한다.
 * @codocs [[디자인 시스템:크기 변수]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param layer 레이어
 * @param parent 부모 레이어
 * @param isRoot 변형 루트인지
 * @returns 칸과 선언
 */
function sizingDeclarations(
  layer: Layer,
  parent: Layer | undefined,
  isRoot: boolean,
): [string, string][] {
  const declarations: [string, string][] = [];
  const parentLayout =
    parent !== undefined && (parent.kind === 'box' || parent.kind === 'slot')
      ? parent.layout
      : null;
  const isFlexChild = parentLayout !== null && !isAbsolute(layer, parent);
  const flexLayout = isFlexChild ? parentLayout : null;
  const isInstance = layer.kind === 'instance';
  for (const axis of ['horizontal', 'vertical'] as const) {
    const property = axis === 'horizontal' ? 'width' : 'height';
    const sizing = layer.sizing[axis];
    const fixed = sizeValue(property, layer[property]);
    const isMain =
      parentLayout !== null && (parentLayout.mode === 'HORIZONTAL') === (axis === 'horizontal');
    if (layer.kind === 'asset') {
      declarations.push([property, fixed]);
    } else if (isRoot) {
      if (sizing !== 'HUG') {
        declarations.push([property, fixed]);
      } else if (axis === 'horizontal') {
        declarations.push([property, 'width: fit-content;']);
      }
    } else if (!isFlexChild) {
      const constraint = layer.placement?.constraints[axis];
      if (constraint !== 'STRETCH' && constraint !== 'SCALE') {
        declarations.push([property, fixed]);
      }
    } else if (sizing === 'FIXED') {
      declarations.push([property, fixed]);
    } else if (sizing === 'FILL' && !isMain) {
      declarations.push([property, `${property}: auto;`]);
    }
  }
  if (flexLayout !== null) {
    const mainAxis = flexLayout.mode === 'HORIZONTAL' ? 'horizontal' : 'vertical';
    const counterAxis = mainAxis === 'horizontal' ? 'vertical' : 'horizontal';
    const parts: string[] = [];
    if (layer.sizing[mainAxis] === 'FILL') {
      parts.push('flex: 1 1 0px;');
      const ownMin = mainAxis === 'horizontal' ? layer.minWidth : layer.minHeight;
      if (ownMin === null && !isInstance) {
        parts.push(`${mainAxis === 'horizontal' ? 'min-width' : 'min-height'}: 0;`);
      }
    } else {
      parts.push('flex: none;');
    }
    if (layer.sizing[counterAxis] === 'FILL') {
      parts.push('align-self: stretch;');
    }
    declarations.push(['flex', parts.join(' ')]);
  }
  for (const [slot, property, value] of [
    ['minWidth', 'min-width', layer.minWidth],
    ['maxWidth', 'max-width', layer.maxWidth],
    ['minHeight', 'min-height', layer.minHeight],
    ['maxHeight', 'max-height', layer.maxHeight],
  ] as const) {
    if (value !== null) {
      declarations.push([slot, sizeValue(property, value)]);
    }
  }
  if (layer.aspectRatio !== null) {
    declarations.push(['aspect', `aspect-ratio: ${formatNumber(layer.aspectRatio)};`]);
  }
  return declarations;
}

/**
 * 크기 하나를 선언으로 옮긴다. 변수에 묶였으면 그 토큰 클래스, 아니면 px 숫자다.
 * @codocs [[디자인 시스템:크기 변수]]
 * @param property CSS 속성
 * @param value 피그마 값
 * @returns 선언
 */
function sizeValue(property: string, value: Bindable<number>): string {
  if ('variable' in value) {
    const prefix =
      {
        width: 'w',
        height: 'h',
        'min-width': 'min-w',
        'max-width': 'max-w',
        'min-height': 'min-h',
        'max-height': 'max-h',
      }[property] ?? 'w';
    return `@apply ${prefix}-${variableToken(value.variable)};`;
  }
  return `${property}: ${formatNumber(value.value)}px;`;
}

/**
 * 레이어가 부모 안에서 절대 위치로 놓였는지 본다. 자동 배치가 아닌 부모의 자식도 제약으로 놓인다.
 * @codocs [[디자인 시스템:겹쳐 놓기]]
 * @param layer 레이어
 * @param parent 부모 레이어
 * @returns 절대 위치면 true
 */
function isAbsolute(layer: Layer, parent: Layer | undefined): boolean {
  if (parent === undefined || layer.placement === null) {
    return false;
  }
  const hasLayout = (parent.kind === 'box' || parent.kind === 'slot') && parent.layout !== null;
  return !hasLayout || layer.placement.positioning === 'ABSOLUTE';
}

/**
 * 절대 위치 레이어의 제약을 inset으로 옮긴다. 왼쪽·위는 거리, 오른쪽·아래는 반대쪽 거리, 양쪽 늘이기는 둘 다,
 * 가운데는 부모 가운데에서의 거리, 비율은 백분율이다.
 * @codocs [[디자인 시스템:겹쳐 놓기]]
 * @param layer 레이어
 * @param parent 부모 레이어
 * @returns inset 선언
 */
function insetDeclaration(layer: Layer, parent: Layer): string {
  if (layer.placement === null) {
    return '';
  }
  const parts: string[] = [];
  const axes = [
    [
      'horizontal',
      'left',
      'right',
      layer.placement.x,
      numberOf(layer.width),
      numberOf(parent.width),
    ],
    [
      'vertical',
      'top',
      'bottom',
      layer.placement.y,
      numberOf(layer.height),
      numberOf(parent.height),
    ],
  ] as const;
  for (const [axis, start, end, offset, size, parentSize] of axes) {
    const constraint = layer.placement.constraints[axis];
    const far = parentSize - offset - size;
    if (constraint === 'MIN') {
      parts.push(`${start}: ${formatNumber(offset)}px;`);
    } else if (constraint === 'MAX') {
      parts.push(`${end}: ${formatNumber(far)}px;`);
    } else if (constraint === 'STRETCH') {
      parts.push(`${start}: ${formatNumber(offset)}px; ${end}: ${formatNumber(far)}px;`);
    } else if (constraint === 'CENTER') {
      parts.push(`${start}: calc(50% + ${formatNumber(offset - parentSize / 2)}px);`);
    } else {
      parts.push(
        `${start}: ${formatNumber((offset / parentSize) * 100)}%; ${end}: ${formatNumber((far / parentSize) * 100)}%;`,
      );
    }
  }
  return parts.join(' ');
}

/**
 * 크기 값의 숫자를 읽는다. 변수에 묶인 값은 자리 계산에 숫자가 없어 0으로 본다.
 * @param value 피그마 값
 * @returns 숫자
 */
function numberOf(value: Bindable<number>): number {
  return 'value' in value ? value.value : 0;
}

/**
 * 내용 자르기와 스크롤을 overflow로 옮긴다.
 * @param isClipping 내용 자르기
 * @param direction 스크롤 방향
 * @returns overflow 선언
 */
function overflowDeclaration(isClipping: boolean, direction: string): string {
  if (direction === 'BOTH') {
    return 'overflow: auto;';
  }
  if (direction === 'HORIZONTAL') {
    return `overflow-x: auto; overflow-y: ${isClipping ? 'hidden' : 'visible'};`;
  }
  if (direction === 'VERTICAL') {
    return `overflow-y: auto; overflow-x: ${isClipping ? 'hidden' : 'visible'};`;
  }
  return isClipping ? 'overflow: hidden;' : '';
}

/**
 * 틀의 칠을 토큰 클래스로 옮긴다. 칠 스타일은 그라데이션이다.
 * @param fills 칠
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function fillApply(fills: Paints, fail: (message: string) => never): string {
  if ('style' in fills) {
    return `@apply bg-gradient-${styleToken(fills.style)};`;
  }
  const solids = fills.paints.filter((paint) => paint.type === 'SOLID');
  if (fills.paints.length > 1) {
    return fail('칠이 둘 이상이다. 칠 하나나 칠 스타일로 둔다.');
  }
  const [solid] = solids;
  return solid === undefined ? '' : `@apply bg-${bindableColorToken(solid.color, fail)};`;
}

/**
 * 글자색을 토큰 클래스로 옮긴다.
 * @param fills 글자 레이어의 칠
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function textColorApply(fills: Paints, fail: (message: string) => never): string {
  if ('style' in fills) {
    return fail('글자에 칠 스타일(그라데이션)을 옮길 규칙이 없다.');
  }
  if (fills.paints.length > 1) {
    return fail('글자 칠이 둘 이상이다.');
  }
  const [paint] = fills.paints;
  if (paint === undefined) {
    return '';
  }
  if (paint.type !== 'SOLID') {
    return fail('글자에 이미지 칠을 옮길 규칙이 없다.');
  }
  return `@apply text-${bindableColorToken(paint.color, fail)};`;
}

/**
 * 선이 레이아웃에 들어가지 않는 안쪽 선(고리)인지 본다.
 * @codocs [[디자인 시스템:컨트롤 테두리 구현]]
 * @param stroke 선
 * @returns 고리로 그리면 true
 */
function hasInsideRing(stroke: Stroke | null): boolean {
  return stroke !== null && stroke.align === 'INSIDE' && !stroke.isIncludedInLayout;
}

/**
 * 안쪽 선을 `::before` 고리 클래스로 옮긴다. 두께는 `inner-border-w-*`, 색은 `inner-border-*`, 그라데이션은 `border-gradient-*`다.
 * @codocs [[디자인 시스템:컨트롤 테두리 구현]]
 * @param stroke 선
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function ringApply(stroke: Stroke | null, fail: (message: string) => never): string {
  if (stroke === null || !hasInsideRing(stroke)) {
    return '';
  }
  const width = uniformWeight(stroke, fail);
  return `@apply inner-border-w-${width} ${strokePaintClass(stroke.paints, 'inner-border', 'border-gradient', fail)};`;
}

/**
 * 레이아웃에 들어가는 선을 CSS 테두리로 옮긴다. 변마다 두께가 다를 수 있다.
 * @codocs [[디자인 시스템:컨트롤 테두리 구현]]
 * @param stroke 선
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function borderApply(stroke: Stroke | null, fail: (message: string) => never): string {
  if (stroke === null || stroke.align !== 'INSIDE' || !stroke.isIncludedInLayout) {
    return '';
  }
  const classes: string[] = [];
  for (const [side, prefix] of [
    ['top', 'border-t'],
    ['right', 'border-r'],
    ['bottom', 'border-b'],
    ['left', 'border-l'],
  ] as const) {
    const weight = stroke.weight[side];
    if ('variable' in weight) {
      classes.push(`${prefix}-${variableToken(weight.variable)}`);
    } else if (weight.value !== 0) {
      fail(`선 두께 ${String(weight.value)}이 토큰에 묶여 있지 않다.`);
    }
  }
  classes.push(strokePaintClass(stroke.paints, 'border', null, fail));
  return `@apply ${classes.join(' ')};`;
}

/**
 * 바깥 선과 가운데 선을 outline으로 옮긴다. 가운데 선은 두께의 반만큼 안으로 당긴다.
 * @codocs [[디자인 시스템:포커스 구현]]
 * @param stroke 선
 * @param fail 실패를 알린다
 * @returns 선언
 */
function outlineApply(stroke: Stroke | null, fail: (message: string) => never): string {
  if (stroke === null || stroke.align === 'INSIDE') {
    return '';
  }
  const width = uniformWeight(stroke, fail);
  const apply = `@apply outline-${width} ${strokePaintClass(stroke.paints, 'outline', null, fail)};`;
  return stroke.align === 'CENTER' ? `${apply} outline-offset: calc(var(--${width}) / -2);` : apply;
}

/**
 * 네 변이 같은 선 두께 토큰을 읽는다.
 * @param stroke 선
 * @param fail 실패를 알린다
 * @returns 토큰 이름
 */
function uniformWeight(stroke: Stroke, fail: (message: string) => never): string {
  const tokens = (['top', 'right', 'bottom', 'left'] as const).map((side) => {
    const weight = stroke.weight[side];
    return 'variable' in weight ? variableToken(weight.variable) : null;
  });
  const [first] = tokens;
  if (first === undefined || first === null || tokens.some((token) => token !== first)) {
    return fail('변마다 두께가 다르거나 토큰이 아닌 선은 레이아웃에 넣지 않고는 옮길 규칙이 없다.');
  }
  return first;
}

/**
 * 선의 칠을 클래스로 옮긴다.
 * @param paints 선 칠
 * @param colorPrefix 단색 클래스 앞부분
 * @param gradientPrefix 그라데이션 클래스 앞부분. 그라데이션을 못 쓰면 null
 * @param fail 실패를 알린다
 * @returns 클래스
 */
function strokePaintClass(
  paints: Paints,
  colorPrefix: string,
  gradientPrefix: string | null,
  fail: (message: string) => never,
): string {
  if ('style' in paints) {
    if (gradientPrefix === null) {
      return fail('그라데이션 선은 안쪽 선(고리)으로만 옮긴다.');
    }
    return `${gradientPrefix}-${styleToken(paints.style)}`;
  }
  const [paint, ...rest] = paints.paints;
  if (paint?.type !== 'SOLID' || rest.length > 0) {
    return fail('선 칠은 단색 하나나 칠 스타일이어야 한다.');
  }
  return `${colorPrefix}-${bindableColorToken(paint.color, fail)}`;
}

/**
 * 모서리를 토큰 클래스로 옮긴다.
 * @param corners 모서리
 * @param fail 실패를 알린다
 * @returns `@apply` 선언
 */
function radiusApply(corners: Corners<Bindable<number>>, fail: (message: string) => never): string {
  const entries = (
    [
      ['topLeft', 'rounded-tl'],
      ['topRight', 'rounded-tr'],
      ['bottomRight', 'rounded-br'],
      ['bottomLeft', 'rounded-bl'],
    ] as const
  ).map(([corner, prefix]) => [prefix, spacingToken(corners[corner], '모서리', fail)] as const);
  const tokens = entries.map(([, token]) => token);
  const [first = null] = tokens;
  if (tokens.every((token) => token === first)) {
    return first === null ? '' : `@apply rounded-${first};`;
  }
  const classes = entries.flatMap(([prefix, token]) =>
    token === null ? [] : [`${prefix}-${token}`],
  );
  return `@apply ${classes.join(' ')};`;
}

/**
 * 불투명도를 옮긴다. 변수면 토큰 클래스, 아니면 숫자다.
 * @param opacity 레이어 불투명도
 * @returns 선언
 */
function opacityDeclaration(opacity: Bindable<number>): string {
  if ('variable' in opacity) {
    return `@apply opacity-${variableToken(opacity.variable)};`;
  }
  return opacity.value === 1 ? '' : `opacity: ${formatNumber(opacity.value)};`;
}

/**
 * 글자의 줄바꿈·정렬·말줄임을 옮긴다. 피그마는 공백을 그대로 두므로 `pre` 계열을 쓴다.
 * @codocs [[디자인 시스템:서체 구현]]
 * @param layer 글자 레이어
 * @returns 칸과 선언
 */
function textDeclarations(layer: Extract<Layer, { kind: 'text' }>): [string, string][] {
  const declarations: [string, string][] = [];
  const isSingleLine = layer.autoResize === 'WIDTH_AND_HEIGHT';
  const isTruncated = layer.truncation === 'ENDING';
  if (isTruncated && (layer.maxLines === null || layer.maxLines <= 1)) {
    declarations.push(['whiteSpace', 'white-space: pre;']);
    declarations.push(['truncate', 'overflow: hidden; text-overflow: ellipsis;']);
  } else if (isTruncated && layer.maxLines !== null) {
    declarations.push(['whiteSpace', 'white-space: pre-wrap;']);
    declarations.push([
      'truncate',
      `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: ${String(layer.maxLines)}; overflow: hidden;`,
    ]);
  } else {
    declarations.push([
      'whiteSpace',
      isSingleLine ? 'white-space: pre;' : 'white-space: pre-wrap;',
    ]);
  }
  if (layer.textAlignHorizontal !== 'LEFT') {
    declarations.push([
      'textAlign',
      `text-align: ${layer.textAlignHorizontal === 'JUSTIFIED' ? 'justify' : layer.textAlignHorizontal.toLowerCase()};`,
    ]);
  }
  return declarations;
}

/**
 * 색 값을 색 토큰 이름으로 옮긴다. 색은 컬렉션 이름을 앞에 붙인다.
 * @codocs [[디자인 시스템:토큰 생성]]
 * @param color 피그마 색 값
 * @param fail 실패를 알린다
 * @returns `color-black-89`
 */
function bindableColorToken(color: Bindable<unknown>, fail: (message: string) => never): string {
  if (!('variable' in color)) {
    return fail('색이 변수에 묶여 있지 않다.');
  }
  return cssName([color.variable.collection, ...color.variable.name.split('/')]).slice(2);
}

/**
 * 색이 아닌 변수를 토큰 이름으로 옮긴다. 경로 이름이 그대로 토큰 이름이다.
 * @codocs [[디자인 시스템:토큰 생성]]
 * @param variable 변수 참조
 * @returns `spacing-sm`
 */
export function variableToken(variable: VariableRef): string {
  return cssName(variable.name.split('/')).slice(2);
}

/**
 * 스타일 이름을 토큰 이름으로 옮긴다.
 * @codocs [[디자인 시스템:토큰 생성]]
 * @param name 피그마 스타일 이름(`Elevation/Control Border`)
 * @returns `elevation-control-border`
 */
export function styleToken(name: string): string {
  return cssName(name.split('/')).slice(2);
}

/**
 * 숫자를 CSS에 쓸 꼴로 줄인다.
 * @param value 숫자
 * @returns 소수 넷째 자리까지의 글
 */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(NUMBER_PRECISION)));
}

/**
 * 컴포넌트의 움직임 CSS를 만든다. `Motion` 변형마다 속성별 `@keyframes`를 만들고, `[data-motion]`일 때 건다.
 * 이동과 배율의 키프레임 값은 CSS 변수로 내고 피그마 숫자를 기본값으로 둔다.
 * @codocs [[디자인 시스템:모션 클래스]]
 * @codocs [[디자인 시스템:모션]]
 * @param model 읽은 컴포넌트
 * @param reader 선택자를 만드는 곳
 * @returns `@keyframes`와 규칙
 */
function motionCss(
  model: ComponentModel,
  reader: LookReader,
): { keyframes: string[]; rules: string[] } {
  const keyframes: string[] = [];
  const rules: string[] = [];
  const seen = new Set<string>();
  for (const info of model.variants) {
    if (info.motion === null) {
      continue;
    }
    const animations = new Map<string, { selector: string; items: string[] }>();
    for (const timeline of info.variant.motion) {
      for (const track of mergedTracks(model, timeline)) {
        const node = motionNode(model, track.layer);
        const property = motionCssProperty(track.property);
        const name = keyframesName(model, info.motion, node, track, property);
        if (seen.has(name)) {
          continue;
        }
        seen.add(name);
        keyframes.push(keyframesCss(name, track, timeline));
        const selector = motionSelector(reader, node, info.motion, track.assetLayer);
        const entry = animations.get(selector) ?? { selector, items: [] };
        entry.items.push(
          `${name} ${formatNumber(timeline.duration * 1000)}ms linear ${timeline.isLooping ? 'infinite' : '1'} both`,
        );
        animations.set(selector, entry);
      }
    }
    for (const { selector, items } of animations.values()) {
      rules.push(`${selector} { animation: ${items.join(', ')}; }`);
    }
  }
  return { keyframes, rules };
}

/** 한 레이어의 키프레임 트랙. 선 그리기 시작·끝은 하나로 합친다 */
type CssTrack = Omit<MotionTrack, 'property'> & { property: MotionTrack['property'] | 'PATH_TRIM' };

/**
 * 트랙을 CSS 속성 단위로 모은다. 선 그리기 시작과 끝은 `stroke-dasharray`와 `stroke-dashoffset`을 함께 정하므로 합친다.
 * @param model 읽은 컴포넌트
 * @param timeline 타임라인
 * @returns 트랙
 */
function mergedTracks(model: ComponentModel, timeline: MotionTimeline): CssTrack[] {
  const tracks: CssTrack[] = [];
  const trims = new Map<string, MotionTrack[]>();
  for (const track of timeline.tracks) {
    if (track.property === 'PATH_TRIM_START' || track.property === 'PATH_TRIM_END') {
      const key = `${track.layer}\u0000${track.assetLayer ?? ''}`;
      trims.set(key, [...(trims.get(key) ?? []), track]);
    } else {
      tracks.push(track);
    }
  }
  for (const group of trims.values()) {
    tracks.push(trimTrack(model, group));
  }
  return tracks;
}

/**
 * 선 그리기 시작·끝 트랙을 하나로 합친다. 두 트랙의 키프레임 시간이 같아야 한다.
 * @param model 읽은 컴포넌트
 * @param group 같은 레이어의 선 그리기 트랙
 * @returns 합친 트랙. 값은 `{ x: 시작, y: 끝 }`이다
 */
function trimTrack(model: ComponentModel, group: readonly MotionTrack[]): CssTrack {
  const start = group.find((track) => track.property === 'PATH_TRIM_START');
  const end = group.find((track) => track.property === 'PATH_TRIM_END');
  const driver = end ?? start;
  if (driver === undefined) {
    throw new ComponentGenerationError(model.schema.name, '선 그리기 트랙이 없다.');
  }
  const base = { x: numericValue(start?.baseValue ?? 0), y: numericValue(end?.baseValue ?? 1) };
  const times = driver.keyframes.map((keyframe) => keyframe.time);
  for (const track of group) {
    if (track.keyframes.map((keyframe) => keyframe.time).join() !== times.join()) {
      throw new ComponentGenerationError(
        model.schema.name,
        `레이어 \`${track.layer}\`의 선 그리기 시작·끝 키프레임 시간이 다르다.`,
      );
    }
  }
  return {
    ...driver,
    property: 'PATH_TRIM',
    baseValue: base,
    keyframes: driver.keyframes.map(
      /**
       * 키프레임 하나의 선 그리기 시작·끝 값을 합친다.
       * @param keyframe 키프레임
       * @param index 순서
       */
      (keyframe, index) => ({
        ...keyframe,
        value: {
          x: start === undefined ? base.x : trackValue(start, index),
          y: end === undefined ? base.y : trackValue(end, index),
        },
      }),
    ),
  };
}

/**
 * 트랙의 키프레임 값을 연산(`SET`, `OFFSET`, `SCALE`)에 따라 실제 값으로 푼다.
 * @param track 트랙
 * @param index 키프레임 순서
 * @returns 값
 */
function trackValue(track: MotionTrack, index: number): number {
  const value = numericValue(track.keyframes[index]?.value ?? track.baseValue);
  const base = numericValue(track.baseValue);
  return applyOperation(track.operation, base, value);
}

/**
 * 키프레임 연산을 푼다.
 * @param operation 연산
 * @param base 기본값
 * @param value 키프레임 값
 * @returns 실제 값
 */
export function applyOperation(
  operation: MotionTrack['operation'],
  base: number,
  value: number,
): number {
  if (operation === 'OFFSET') {
    return base + value;
  }
  if (operation === 'SCALE') {
    return base * value;
  }
  return value;
}

/**
 * 숫자 값을 읽는다. `_XY` 값은 x를 쓴다.
 * @param value 키프레임 값
 * @returns 숫자
 */
function numericValue(value: MotionValue): number {
  return typeof value === 'number' ? value : value.x;
}

/**
 * 키프레임 트랙이 걸린 레이어의 마디를 찾는다. `motion` 레이어는 루트다.
 * @param model 읽은 컴포넌트
 * @param key 레이어 키
 * @returns 마디
 */
function motionNode(model: ComponentModel, key: LayerKey): LayerNode {
  if (key === MOTION_WRAPPER_LAYER && model.hasMotionWrapper) {
    return model.tree;
  }
  const node = model.nodes.get(key);
  if (node === undefined) {
    throw new ComponentGenerationError(
      model.schema.name,
      `키프레임이 걸린 레이어 \`${key}\`가 없다.`,
    );
  }
  return node;
}

/**
 * 키프레임 항목의 CSS 속성 이름을 정한다.
 * @codocs [[디자인 시스템:모션]]
 * @param property 피그마 항목
 * @returns CSS 속성 이름(이름 짓기에 쓴다)
 */
function motionCssProperty(property: CssTrack['property']): string {
  switch (property) {
    case 'OPACITY':
      return 'opacity';
    case 'SCALE_XY':
    case 'SCALE_X':
    case 'SCALE_Y':
      return 'scale';
    case 'TRANSLATION_XY':
    case 'TRANSLATION_X':
    case 'TRANSLATION_Y':
      return 'translate';
    case 'ROTATION':
      return 'rotate';
    default:
      return 'stroke';
  }
}

/**
 * `@keyframes` 이름을 짓는다. 컴포넌트를 통째로 움직이면 `<컴포넌트>-<Motion 값>-<속성>`이고,
 * 안쪽 레이어면 속성 앞에 레이어 자리를 넣는다.
 * @codocs [[디자인 시스템:모션 클래스]]
 * @param model 읽은 컴포넌트
 * @param motion `Motion` 값의 코드 이름
 * @param node 움직이는 마디
 * @param track 트랙
 * @param property CSS 속성 이름
 * @returns 이름
 */
function keyframesName(
  model: ComponentModel,
  motion: string,
  node: LayerNode,
  track: CssTrack,
  property: string,
): string {
  const layer =
    node === model.tree
      ? []
      : [node.className.slice(model.fileName.length + 2).replaceAll('__', '-')];
  const asset =
    track.assetLayer === null || track.assetLayer === ''
      ? []
      : [nameWords(track.assetLayer).join('-')];
  return [model.fileName, motion, ...layer, ...asset, property].join('-');
}

/**
 * 움직이는 요소의 선택자를 만든다. 자산 안쪽은 선 그리기 경로(`pathLength`가 있는 요소)다.
 * @param reader 선택자를 만드는 곳
 * @param node 마디
 * @param motion `Motion` 값의 코드 이름
 * @param assetLayer 자산 안쪽 레이어 경로
 * @returns 선택자
 */
function motionSelector(
  reader: LookReader,
  node: LayerNode,
  motion: string,
  assetLayer: string | null,
): string {
  const motionTerm: ConditionTerm = {
    word: motion,
    target: 'root',
    condition: { kind: 'data', attribute: 'data-motion', value: motion },
    priority: 0,
    codeName: null,
  };
  const selector = reader.selector(node, [], [motionTerm]);
  if (assetLayer === null) {
    return selector;
  }
  return `${selector} [pathLength]`;
}

/**
 * `@keyframes` 하나를 만든다. 키프레임 이징은 앞 키프레임에서 그 키프레임까지라, 앞 키프레임의 곡선으로 옮긴다.
 * 처음과 끝에 키프레임이 없으면 가까운 키프레임 값을 둔다.
 * @codocs [[디자인 시스템:모션]]
 * @param name 이름
 * @param track 트랙
 * @param timeline 타임라인
 * @returns CSS 글
 */
function keyframesCss(name: string, track: CssTrack, timeline: MotionTimeline): string {
  const frames = track.keyframes.map(
    /**
     * 키프레임 하나를 위치·값·이징으로 옮긴다.
     * @param keyframe 키프레임
     * @param index 순서
     */
    (keyframe, index) => ({
      offset: timeline.duration === 0 ? 0 : keyframe.time / timeline.duration,
      value: keyframe.value,
      easing: track.keyframes[index + 1]?.easing ?? null,
      index,
    }),
  );
  const first = frames[0];
  const last = frames.at(-1);
  if (first !== undefined && first.offset > 0) {
    frames.unshift({ offset: 0, value: first.value, easing: null, index: -1 });
  }
  if (last !== undefined && last.offset < 1) {
    frames.push({ offset: 1, value: last.value, easing: null, index: -1 });
  }
  const body = frames.map(
    /**
     * 키프레임 하나를 CSS 줄로 쓴다.
     * @param frame 키프레임
     */
    (frame) => {
      const value = keyframeDeclaration(name, track, frame.value, frame.offset);
      const easing =
        frame.easing === null ? '' : ` animation-timing-function: ${easingCss(frame.easing)};`;
      return `  ${formatNumber(frame.offset * 100)}% { ${value}${easing} }`;
    },
  );
  return [`@keyframes ${name} {`, ...body, '}', ''].join('\n');
}

/**
 * 키프레임 값 하나를 선언으로 옮긴다. 이동·배율은 CSS 변수 안의 기본값으로 둔다.
 * @codocs [[디자인 시스템:모션]]
 * @codocs [[디자인 시스템:회전 구현]]
 * @param name `@keyframes` 이름(변수 이름 앞부분)
 * @param track 트랙
 * @param raw 키프레임 값
 * @param offset 위치(0~1)
 * @returns 선언
 */
function keyframeDeclaration(
  name: string,
  track: CssTrack,
  raw: MotionValue,
  offset: number,
): string {
  const position = formatNumber(offset * 100);
  const variable = `--${name}-${position}`;
  const base = track.baseValue;
  const { operation } = track;
  switch (track.property) {
    case 'OPACITY':
      return `opacity: ${formatNumber(applyOperation(operation, numericValue(base), numericValue(raw)))};`;
    case 'ROTATION':
      return `rotate: ${formatNumber(-applyOperation(operation, numericValue(base), numericValue(raw)))}deg;`;
    case 'SCALE_XY':
    case 'SCALE_X':
    case 'SCALE_Y': {
      const [x, y] = xyValues(track.property, raw, base, operation, 1);
      return `scale: var(${variable}, ${formatNumber(x)} ${formatNumber(y)});`;
    }
    case 'TRANSLATION_XY':
    case 'TRANSLATION_X':
    case 'TRANSLATION_Y': {
      const [x, y] = xyValues(track.property, raw, base, operation, 0);
      return `translate: var(${variable}, ${formatNumber(x)}px ${formatNumber(y)}px);`;
    }
    default: {
      const value = typeof raw === 'number' ? { x: 0, y: raw } : raw;
      return `stroke-dasharray: ${formatNumber(value.y - value.x)} 1; stroke-dashoffset: ${formatNumber(-value.x)};`;
    }
  }
}

/**
 * x·y 성분 값을 푼다. 한 성분만 움직이면 다른 성분은 기본값이다.
 * @param property 피그마 항목
 * @param raw 키프레임 값
 * @param base 기본값
 * @param operation 키프레임 연산
 * @param identity 움직이지 않는 성분의 값
 * @returns x, y
 */
function xyValues(
  property: string,
  raw: MotionValue,
  base: MotionValue,
  operation: MotionTrack['operation'],
  identity: number,
): [number, number] {
  if (typeof raw !== 'number' && typeof base !== 'number') {
    return [applyOperation(operation, base.x, raw.x), applyOperation(operation, base.y, raw.y)];
  }
  const value = applyOperation(operation, numericValue(base), numericValue(raw));
  return property.endsWith('_X') ? [value, identity] : [identity, value];
}

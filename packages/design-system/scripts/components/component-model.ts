import {
  type AxisSpec,
  type BehaviorSpec,
  findStateWord,
  ON_OFF_VALUE_PAIRS,
  type RoleSpec,
  type StateCondition,
  stateWordsOf,
} from '../../src/behaviors/behavior-spec.ts';
import {
  type ComponentRef,
  type ComponentSchema,
  DEVICE_AXIS,
  DEVICE_DEFAULT_VALUE,
  type InstanceLayer,
  type Layer,
  MOTION_AXIS,
  MOTION_NONE_VALUE,
  MOTION_WRAPPER_LAYER,
  type PropertyDefinition,
  STATE_AXIS,
  type VariantSchema,
} from '../../src/figma-export/component-schema.ts';
import { type LayerKey, ROOT_LAYER_KEY } from '../../src/figma-export/layer-key.ts';
import {
  booleanInputName,
  componentFileName,
  componentIdentifier,
  exposedInputName,
  inputName,
  layerClassName,
  layerClassSegment,
  layerIdentifier,
  nestedEventInputName,
  uniqueName,
  variantValueName,
} from './component-naming.ts';

// 스키마 하나를 생성기가 쓰는 꼴로 읽는다. 변형 축을 나누고, 입력을 정하고, 변형마다 다른 레이어를 한 나무로 합친다.

/** 생성기가 동작의 종류를 찾는 곳. 실제 등록부와 테스트 전용 가짜 등록부가 같은 꼴을 갖는다 */
export type BehaviorSource = {
  specOf: (name: string) => BehaviorSpec | undefined;
  hookOf: (name: string) => { module: string; hook: string };
};

/** 변형 축이 맡는 일 */
export type AxisKind = 'prop' | 'state' | 'device' | 'motion' | 'behavior';

/**
 * 변형 축 하나.
 * - figmaName: 피그마 축 이름
 * - kind: prop은 입력, state는 `State`, device는 `Device`, motion은 `Motion`, behavior는 동작이 아는 축이다
 * - input: prop 축의 입력 이름
 * - options: 피그마 값과 코드 값
 * - defaultValue: 피그마 기본 값
 */
export type VariantAxis = {
  figmaName: string;
  kind: AxisKind;
  input: string;
  options: readonly { figma: string; code: string }[];
  defaultValue: string;
};

/**
 * 상태 조건 하나. 낱말 표의 낱말이나 동작이 아는 축의 값에서 온다.
 * - priority: 겹칠 때의 우선순위. 작을수록 이긴다(낱말 표에 먼저 적은 낱말)
 * - codeName: 이 조건을 켜는 입력. 브라우저나 동작이 스스로 켜면 null이다
 */
export type ConditionTerm = {
  word: string;
  target: string;
  condition: StateCondition;
  priority: number;
  codeName: string | null;
};

/**
 * 변형 하나를 읽은 것.
 * - combo: 입력 축 값으로 정한 묶음 이름. 같은 묶음의 변형은 같은 입력 값으로 그려지고 상태·기기만 다르다
 * - propValues: 입력 축 이름 → 코드 값
 * - terms: 이 변형을 켜는 상태 조건
 * - isMobile: `Device`가 기본 값이 아닌지
 * - motion: `Motion` 값의 코드 이름. 가만히 있는 모습이면 null
 */
export type VariantInfo = {
  index: number;
  variant: VariantSchema;
  root: Layer;
  combo: string;
  propValues: Readonly<Record<string, string>>;
  terms: readonly ConditionTerm[];
  isMobile: boolean;
  motion: string | null;
};

/** 컴포넌트 입력 하나([[디자인 시스템:컴포넌트 입력]]) */
export type ComponentInput =
  | { kind: 'variant'; name: string; axis: VariantAxis }
  | { kind: 'boolean'; name: string; key: string; isOnByDefault: boolean }
  | { kind: 'text'; name: string; key: string; defaultValue: string; visibleKey: string | null }
  | {
      kind: 'swap';
      name: string;
      key: string;
      defaultValue: ComponentRef;
      valueKind: SwapValueKind;
      visibleKey: string | null;
    }
  | { kind: 'slot'; name: string; key: string }
  | { kind: 'nested-event'; name: string; layerKey: LayerKey; innerEvent: string }
  | { kind: 'exposed'; name: string; layerKey: LayerKey; inner: ExposableInput }
  | { kind: 'flag'; name: string }
  | { kind: 'event'; name: string };

/** 노출한 중첩 인스턴스에서 바깥으로 여는 안쪽 입력 */
export type ExposableInput = Extract<ComponentInput, { kind: 'variant' | 'boolean' | 'text' }>;

/** 인스턴스 교체 입력의 값 꼴. svg·image는 자산 이름이고, node는 그 자리에 그릴 요소다 */
export type SwapValueKind = 'svg' | 'image' | 'node';

/**
 * 변형마다 다른 레이어를 레이어 키로 합친 나무의 마디.
 * - layers: 변형 순서대로 그 변형의 레이어. 없으면 undefined
 * - className: 이 레이어를 그린 요소의 클래스
 * - identifier: 코드 안의 이름(`LAYERS`의 키, 역할을 받는 자리 이름)
 * - roles: 이 레이어가 맡은 동작 역할
 * - slotContent: 품은 인스턴스의 슬롯을 채운 레이어면 그 슬롯(속성 이름과 안쪽 슬롯 레이어 키). 아니면 null
 */
export type LayerNode = {
  key: LayerKey;
  kind: Layer['kind'];
  name: string;
  layers: readonly (Layer | undefined)[];
  children: LayerNode[];
  className: string;
  identifier: string;
  roles: RoleSpec[];
  slotContent: { slot: string; layer: LayerKey } | null;
};

/**
 * 생성에 쓰는 바깥 자료.
 * - behaviors: 동작 등록부
 * - modelOf: 품은 컴포넌트를 이름으로 읽는다. 스키마가 없으면 실패한다
 */
export type GenerationContext = {
  behaviors: BehaviorSource;
  modelOf: (name: string) => ComponentModel;
};

/** 스키마 하나를 읽은 것 */
export type ComponentModel = {
  schema: ComponentSchema;
  fileName: string;
  identifier: string;
  spec: BehaviorSpec | null;
  axes: readonly VariantAxis[];
  variants: readonly VariantInfo[];
  inputs: readonly ComponentInput[];
  tree: LayerNode;
  nodes: ReadonlyMap<LayerKey, LayerNode>;
  hasMotionWrapper: boolean;
};

/** 생성할 수 없는 스키마. 고칠 곳을 메시지에 적는다 */
export class ComponentGenerationError extends Error {
  /**
   * 생성 실패를 만든다.
   * @param component 컴포넌트 이름
   * @param message 이유와 고칠 곳
   */
  constructor(component: string, message: string) {
    super(`[components] ${component}: ${message}`);
    this.name = 'ComponentGenerationError';
  }
}

/**
 * 스키마를 생성기의 꼴로 읽는다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @codocs [[디자인 시스템:상태]]
 * @codocs [[디자인 시스템:기기 변형]]
 * @param schema 컴포넌트 스키마
 * @param context 동작 등록부와 품은 컴포넌트
 * @returns 읽은 컴포넌트
 */
export function readComponent(schema: ComponentSchema, context: GenerationContext): ComponentModel {
  /**
   * 이 컴포넌트를 생성할 수 없다고 알린다.
   * @param message 이유와 고칠 곳
   */
  function fail(message: string): never {
    throw new ComponentGenerationError(schema.name, message);
  }
  const spec =
    schema.behavior === null ? null : (context.behaviors.specOf(schema.behavior) ?? null);
  if (schema.behavior !== null && spec === null) {
    fail(`동작의 종류 \`${schema.behavior}\`가 등록부에 없다. 종류를 먼저 만들어 main에 넣는다.`);
  }
  const axes = readAxes(schema, spec, fail);
  const variants = schema.variants.map((variant, index) =>
    readVariant(variant, index, axes, spec, fail),
  );
  const fileName = componentFileName(schema.name);
  const hasMotionWrapper = variants.some(
    ({ variant }) => motionWrapperOf(variant.root) !== undefined,
  );
  const tree = buildTree(variants, fileName, fail);
  const nodes = new Map<LayerKey, LayerNode>();
  collectNodes(tree, nodes);
  if (spec !== null) {
    assignRoles(spec, variants, axes, nodes, fail);
  }
  const inputs = readInputs({ schema, axes, spec, nodes, context, fail });
  return {
    schema,
    fileName,
    identifier: componentIdentifier(schema.name),
    spec,
    axes,
    variants,
    inputs,
    tree,
    nodes,
    hasMotionWrapper,
  };
}

/**
 * 변형 축을 나눈다.
 * @param schema 스키마
 * @param spec 동작의 종류
 * @param fail 실패를 알린다
 * @returns 축
 */
function readAxes(
  schema: ComponentSchema,
  spec: BehaviorSpec | null,
  fail: (message: string) => never,
): VariantAxis[] {
  return schema.properties
    .filter(
      (property): property is Extract<PropertyDefinition, { type: 'VARIANT' }> =>
        property.type === 'VARIANT',
    )
    .map(
      /**
       * 변형 속성 하나를 축으로 읽는다.
       * @param property 변형 속성 정의
       */
      (property) => {
        const kind = axisKind(property.name, property.options, spec);
        if (kind === 'state' && spec === null) {
          fail('`State` 축이 있는데 동작의 종류가 없다. 상태 낱말 표가 있는 종류를 적는다.');
        }
        return {
          figmaName: property.name,
          kind,
          input: inputName(property.name),
          options: property.options.map((option) => ({
            figma: option,
            code: variantValueName(option),
          })),
          defaultValue: property.default,
        };
      },
    );
}

/**
 * 변형 축이 맡는 일을 정한다.
 * @param name 축 이름
 * @param options 축 값
 * @param spec 동작의 종류
 * @returns 축의 일
 */
function axisKind(name: string, options: readonly string[], spec: BehaviorSpec | null): AxisKind {
  if (name === STATE_AXIS) {
    return 'state';
  }
  if (name === DEVICE_AXIS) {
    return 'device';
  }
  if (name === MOTION_AXIS) {
    return 'motion';
  }
  if (spec !== null && behaviorAxisOf(spec, name, options) !== undefined) {
    return 'behavior';
  }
  return 'prop';
}

/**
 * 동작이 아는 축의 규칙을 찾는다. 이름으로 정한 축은 이름으로, 켜짐과 꺼짐 축은 값 쌍으로 찾는다.
 * @param spec 동작의 종류
 * @param name 축 이름
 * @param options 축 값
 * @returns 축 규칙
 */
function behaviorAxisOf(
  spec: BehaviorSpec,
  name: string,
  options: readonly string[],
): AxisSpec | undefined {
  return spec.axes.find((axis) =>
    axis.kind === 'named' ? axis.axis === name : onOffPairOf(options) !== undefined,
  );
}

/**
 * 값이 켜짐과 꺼짐 쌍인지 본다.
 * @param options 축 값
 * @returns 켜진 값과 꺼진 값. 쌍이 아니면 undefined
 */
function onOffPairOf(options: readonly string[]): { on: string; off: string } | undefined {
  if (options.length !== 2) {
    return undefined;
  }
  for (const [on, off] of ON_OFF_VALUE_PAIRS) {
    const onValue = options.find((option) => option.toLowerCase() === on.toLowerCase());
    const offValue = options.find((option) => option.toLowerCase() === off.toLowerCase());
    if (onValue !== undefined && offValue !== undefined) {
      return { on: onValue, off: offValue };
    }
  }
  return undefined;
}

/**
 * 변형 하나를 읽는다.
 * @param variant 변형
 * @param index 변형 순서
 * @param axes 축
 * @param spec 동작의 종류
 * @param fail 실패를 알린다
 * @returns 읽은 변형
 */
function readVariant(
  variant: VariantSchema,
  index: number,
  axes: readonly VariantAxis[],
  spec: BehaviorSpec | null,
  fail: (message: string) => never,
): VariantInfo {
  const propValues: Record<string, string> = {};
  const terms: ConditionTerm[] = [];
  let isMobile = false;
  let motion: string | null = null;
  for (const axis of axes) {
    const value = variant.values[axis.figmaName] ?? axis.defaultValue;
    if (axis.kind === 'prop') {
      propValues[axis.input] = variantValueName(value);
    } else if (axis.kind === 'state' && spec !== null) {
      terms.push(...stateTerms(spec, value, variant.name, fail));
    } else if (axis.kind === 'behavior' && spec !== null) {
      const term = behaviorAxisTerm(spec, axis, value);
      if (term !== null) {
        terms.push(term);
      }
    } else if (axis.kind === 'device') {
      isMobile = value !== DEVICE_DEFAULT_VALUE;
    } else if (axis.kind === 'motion' && value !== MOTION_NONE_VALUE) {
      motion = variantValueName(value);
    }
  }
  const combo = axes
    .filter((axis) => axis.kind === 'prop')
    .map((axis) => propValues[axis.input] ?? '')
    .join('/');
  return {
    index,
    variant,
    root: effectiveRoot(variant.root),
    combo,
    propValues,
    terms,
    isMobile,
    motion,
  };
}

/**
 * 상태 값을 낱말로 쪼개 조건으로 옮긴다. 낱말 표에 없는 낱말은 막는다.
 * @codocs [[디자인 시스템:상태]]
 * @param spec 동작의 종류
 * @param value `State` 값
 * @param variantName 변형 이름(메시지용)
 * @param fail 실패를 알린다
 * @returns 조건. 기본 낱말(조건 null)은 담지 않는다
 */
function stateTerms(
  spec: BehaviorSpec,
  value: string,
  variantName: string,
  fail: (message: string) => never,
): ConditionTerm[] {
  return stateWordsOf(value).flatMap(
    /**
     * 상태 낱말 하나를 조건으로 옮긴다.
     * @param word 상태 낱말
     */
    (word) => {
      const entry = findStateWord(spec, word);
      if (entry === undefined) {
        return fail(
          `변형 \`${variantName}\`의 상태 낱말 \`${word}\`가 \`${spec.name}\` 종류의 낱말 표에 없다.`,
        );
      }
      if (entry.condition === null) {
        return [];
      }
      return [
        {
          word: entry.word,
          target: entry.target,
          condition: entry.condition,
          priority: spec.stateWords.indexOf(entry),
          codeName: entry.codeName,
        },
      ];
    },
  );
}

/**
 * 동작이 아는 축의 값을 조건으로 옮긴다. 우선순위는 낱말 표의 낱말 다음이다.
 * @param spec 동작의 종류
 * @param axis 축
 * @param value 축 값
 * @returns 조건. 기본 값이면 null
 */
function behaviorAxisTerm(
  spec: BehaviorSpec,
  axis: VariantAxis,
  value: string,
): ConditionTerm | null {
  const options = axis.options.map((option) => option.figma);
  const rule = behaviorAxisOf(spec, axis.figmaName, options);
  if (rule === undefined) {
    return null;
  }
  const priority = spec.stateWords.length + spec.axes.indexOf(rule);
  if (rule.kind === 'on-off') {
    const pair = onOffPairOf(options);
    if (pair === undefined || value !== pair.on) {
      return null;
    }
    return {
      word: value,
      target: rule.target,
      condition: rule.condition,
      priority,
      codeName: rule.codeName,
    };
  }
  const entry = rule.values.find((candidate) => candidate.value === value);
  if (entry === undefined || entry.condition === null) {
    return null;
  }
  return {
    word: value,
    target: rule.target,
    condition: entry.condition,
    priority,
    codeName: rule.codeName,
  };
}

/**
 * 컴포넌트를 통째로 움직이는 `motion` 레이어를 찾는다.
 * @codocs [[디자인 시스템:모션 견본]]
 * @param root 변형 루트
 * @returns 감싼 레이어. 없으면 undefined
 */
export function motionWrapperOf(root: Layer): Layer | undefined {
  if (root.kind !== 'box' || root.children.length !== 1) {
    return undefined;
  }
  const [child] = root.children;
  return child?.name === MOTION_WRAPPER_LAYER && (child.kind === 'box' || child.kind === 'slot')
    ? child
    : undefined;
}

/**
 * `motion` 레이어를 루트와 합칠 때 모습을 어느 쪽에서 가져오는지 정한다. 루트에 칠·선·효과가 있으면 루트다.
 * @codocs [[디자인 시스템:모션 견본]]
 * @param root 변형 루트
 * @returns 모습을 가져오는 레이어. 감싼 레이어가 없으면 null
 */
export function motionLookSource(root: Layer): 'root' | 'wrapper' | null {
  if (motionWrapperOf(root) === undefined || root.kind !== 'box') {
    return null;
  }
  const hasRootLook =
    ('paints' in root.fills && root.fills.paints.length > 0) ||
    'style' in root.fills ||
    root.stroke !== null ||
    root.effectStyle !== null;
  return hasRootLook ? 'root' : 'wrapper';
}

/**
 * `motion` 레이어를 코드에 만들지 않도록 루트에 합친다. 루트의 크기와 감싼 레이어의 배치·자식을 쓰고,
 * 모습은 루트에 있으면 루트, 없으면 감싼 레이어의 것을 쓴다.
 * @codocs [[디자인 시스템:모션 견본]]
 * @param root 변형 루트
 * @returns 코드가 그리는 루트
 */
function effectiveRoot(root: Layer): Layer {
  const wrapper = motionWrapperOf(root);
  if (wrapper === undefined || root.kind !== 'box' || wrapper.kind !== 'box') {
    return root;
  }
  const look = motionLookSource(root) === 'root' ? root : wrapper;
  return {
    ...root,
    fills: look.fills,
    stroke: look.stroke,
    cornerRadius: look.cornerRadius,
    effectStyle: look.effectStyle,
    layout: wrapper.layout,
    isClippingContent: root.isClippingContent || wrapper.isClippingContent,
    children: wrapper.children,
  };
}

/**
 * 변형마다 레이어를 레이어 키로 합친 나무를 만든다. 형제 순서는 처음 나온 변형의 순서이고,
 * 다른 변형에만 있는 레이어는 그 변형에서 바로 앞에 있던 형제 뒤에 끼운다.
 * @param variants 변형
 * @param fileName 컴포넌트 파일 이름
 * @param fail 실패를 알린다
 * @returns 루트 마디
 */
function buildTree(
  variants: readonly VariantInfo[],
  fileName: string,
  fail: (message: string) => never,
): LayerNode {
  const usedClasses = new Set<string>();
  const usedIdentifiers = new Set<string>();
  const count = variants.length;
  /**
   * 마디를 만든다.
   * @param layer 처음 만난 레이어
   * @param slotContent 품은 인스턴스의 슬롯을 채운 레이어면 그 슬롯
   * @returns 빈 마디
   */
  function makeNode(layer: Layer, slotContent: LayerNode['slotContent'] = null): LayerNode {
    return {
      key: layer.key,
      kind: layer.kind,
      name: layer.name,
      layers: Array.from({ length: count }, () => undefined),
      children: [],
      className: uniqueName(
        layerClassName(fileName, layerClassSegment(layer.key)),
        usedClasses,
        '-',
      ),
      identifier: uniqueName(layerIdentifier(layer.key), usedIdentifiers),
      roles: [],
      slotContent,
    };
  }
  const first = variants[0];
  if (first === undefined) {
    return fail('변형이 하나도 없다.');
  }
  const root = makeNode(first.root);
  /**
   * 레이어 하나와 그 자식을 마디에 합친다.
   * @param node 마디
   * @param layer 이 변형의 레이어
   * @param variantIndex 변형 순서
   */
  function merge(node: LayerNode, layer: Layer, variantIndex: number): void {
    if (node.kind !== layer.kind) {
      fail(`레이어 \`${layer.key}\`의 종류가 변형마다 다르다(${node.kind}, ${layer.kind}).`);
    }
    const layers = [...node.layers];
    layers[variantIndex] = layer;
    node.layers = layers;
    const groups =
      layer.kind === 'box' || layer.kind === 'slot'
        ? [{ content: null, children: layer.children }]
        : layer.kind === 'instance'
          ? layer.slots.map((slot) => ({
              content: { slot: slot.slot, layer: slot.layer },
              children: slot.children,
            }))
          : [];
    for (const { content, children } of groups) {
      let previous = -1;
      for (const child of children) {
        let position = node.children.findIndex((candidate) => candidate.key === child.key);
        if (position === -1) {
          position = previous + 1;
          node.children.splice(position, 0, makeNode(child, content));
        }
        const target = node.children[position];
        if (target !== undefined) {
          merge(target, child, variantIndex);
        }
        previous = position;
      }
    }
  }
  for (const info of variants) {
    merge(root, info.root, info.index);
  }
  return root;
}

/**
 * 나무의 마디를 키로 모은다.
 * @param node 마디
 * @param nodes 모을 곳
 */
function collectNodes(node: LayerNode, nodes: Map<LayerKey, LayerNode>): void {
  nodes.set(node.key, node);
  for (const child of node.children) {
    collectNodes(child, nodes);
  }
}

/**
 * 종류의 역할을 레이어에 잇는다.
 * @codocs [[디자인 시스템:동작의 종류]]
 * @param spec 동작의 종류
 * @param variants 변형
 * @param axes 축
 * @param nodes 마디
 * @param fail 실패를 알린다
 */
function assignRoles(
  spec: BehaviorSpec,
  variants: readonly VariantInfo[],
  axes: readonly VariantAxis[],
  nodes: ReadonlyMap<LayerKey, LayerNode>,
  fail: (message: string) => never,
): void {
  for (const role of spec.roles) {
    const matched = [...nodes.values()].filter((node) => roleMatches(role, node, variants, axes));
    if (role.isRequired) {
      for (const info of variants) {
        if (!matched.some((node) => node.layers[info.index] !== undefined)) {
          fail(`변형 \`${info.variant.name}\`에 \`${role.role}\` 역할의 레이어가 없다.`);
        }
      }
    }
    if (!role.isMultiple && matched.length > 1) {
      fail(
        `\`${role.role}\` 역할의 레이어가 여럿이다(${matched.map((node) => node.key).join(', ')}).`,
      );
    }
    for (const node of matched) {
      node.roles.push(role);
    }
  }
}

/**
 * 레이어가 역할의 찾는 법에 맞는지 본다.
 * @param role 역할
 * @param node 마디
 * @param variants 변형
 * @param axes 축
 * @returns 맞으면 true
 */
function roleMatches(
  role: RoleSpec,
  node: LayerNode,
  variants: readonly VariantInfo[],
  axes: readonly VariantAxis[],
): boolean {
  const present = node.layers.filter((layer): layer is Layer => layer !== undefined);
  switch (role.selector.kind) {
    case 'root':
      return node.key === ROOT_LAYER_KEY;
    case 'text-property':
      return present.some(
        (layer) => layer.kind === 'text' && layer.propertyRefs.characters !== undefined,
      );
    case 'swap-property':
      return present.some((layer) => layer.propertyRefs.mainComponent !== undefined);
    case 'layer-name': {
      const { names } = role.selector;
      return names.includes(node.name);
    }
    case 'nested-behavior':
      return false;
    case 'indicator':
      return isIndicator(node, variants, axes);
  }
}

/**
 * 켜짐과 꺼짐 축이 켜진 변형에만 있는 레이어인지 본다.
 * @param node 마디
 * @param variants 변형
 * @param axes 축
 * @returns 표시 레이어면 true
 */
function isIndicator(
  node: LayerNode,
  variants: readonly VariantInfo[],
  axes: readonly VariantAxis[],
): boolean {
  const axis = axes.find(
    (candidate) =>
      candidate.kind === 'behavior' &&
      onOffPairOf(candidate.options.map((option) => option.figma)) !== undefined,
  );
  if (axis === undefined) {
    return false;
  }
  const pair = onOffPairOf(axis.options.map((option) => option.figma));
  return variants.every(({ variant, index }) => {
    const isOn = variant.values[axis.figmaName] === pair?.on;
    return (node.layers[index] !== undefined) === isOn;
  });
}

/**
 * 입력을 정한다. 켜고 끄는 속성이 글자·교체 속성과 같은 레이어에 묶였으면 하나로 합친다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param source 읽을 것
 * @param source.schema 스키마
 * @param source.axes 축
 * @param source.spec 동작의 종류
 * @param source.nodes 마디
 * @param source.context 품은 컴포넌트를 읽는 곳
 * @param source.fail 실패를 알린다
 * @returns 입력
 */
function readInputs({
  schema,
  axes,
  spec,
  nodes,
  context,
  fail,
}: {
  schema: ComponentSchema;
  axes: readonly VariantAxis[];
  spec: BehaviorSpec | null;
  nodes: ReadonlyMap<LayerKey, LayerNode>;
  context: GenerationContext;
  fail: (message: string) => never;
}): ComponentInput[] {
  const layers = [...nodes.values()].flatMap((node) =>
    node.layers.filter((layer): layer is Layer => layer !== undefined),
  );
  const mergedVisibility = mergedVisibilityKeys(layers);
  const used = new Set<string>();
  const inputs: ComponentInput[] = [];
  for (const axis of axes) {
    if (axis.kind === 'prop') {
      inputs.push({ kind: 'variant', name: uniqueName(axis.input, used), axis });
    }
  }
  for (const property of schema.properties) {
    if (property.type === 'BOOLEAN') {
      if (!mergedVisibility.has(property.key)) {
        inputs.push({
          kind: 'boolean',
          name: uniqueName(booleanInputName(property.name), used),
          key: property.key,
          isOnByDefault: property.isOnByDefault,
        });
      }
    } else if (property.type === 'TEXT') {
      inputs.push({
        kind: 'text',
        name: uniqueName(inputName(property.name), used),
        key: property.key,
        defaultValue: property.default,
        visibleKey: visibilityPartner(layers, 'characters', property.key, mergedVisibility),
      });
    } else if (property.type === 'INSTANCE_SWAP') {
      inputs.push({
        kind: 'swap',
        name: uniqueName(inputName(property.name), used),
        key: property.key,
        defaultValue: property.default,
        valueKind: swapValueKind([property.default, ...property.preferredValues]),
        visibleKey: visibilityPartner(layers, 'mainComponent', property.key, mergedVisibility),
      });
    } else if (property.type === 'SLOT') {
      inputs.push({
        kind: 'slot',
        name: uniqueName(inputName(property.name), used),
        key: property.key,
      });
    }
  }
  for (const node of nodes.values()) {
    const instance = node.layers.find(
      (layer): layer is InstanceLayer => layer?.kind === 'instance',
    );
    if (instance === undefined || isInsideSlot(node.key, nodes)) {
      continue;
    }
    const inner = context.modelOf(instance.component);
    const innerEvent = inner.spec?.event ?? null;
    if (innerEvent !== null) {
      inputs.push({
        kind: 'nested-event',
        name: uniqueName(nestedEventInputName(node.name, innerEvent.nestedSuffix), used),
        layerKey: node.key,
        innerEvent: innerEvent.inputName,
      });
    }
    if (instance.isExposed) {
      for (const innerInput of inner.inputs) {
        if (
          innerInput.kind === 'variant' ||
          innerInput.kind === 'boolean' ||
          innerInput.kind === 'text'
        ) {
          inputs.push({
            kind: 'exposed',
            name: uniqueName(exposedInputName(node.name, innerInput.name), used),
            layerKey: node.key,
            inner: innerInput,
          });
        }
      }
    }
  }
  if (spec !== null) {
    const codeNames = new Set<string>();
    for (const word of spec.stateWords) {
      if (word.codeName !== null) {
        codeNames.add(word.codeName);
      }
    }
    for (const axis of spec.axes) {
      if (axis.codeName !== null) {
        codeNames.add(axis.codeName);
      }
    }
    for (const codeName of codeNames) {
      if (used.has(codeName)) {
        fail(`동작의 입력 \`${codeName}\`이 피그마 속성의 입력 이름과 겹친다.`);
      }
      used.add(codeName);
      inputs.push({ kind: 'flag', name: codeName });
    }
    if (spec.event !== null) {
      used.add(spec.event.inputName);
      inputs.push({ kind: 'event', name: spec.event.inputName });
    }
  }
  return inputs;
}

/**
 * 글자·교체 속성과 함께 묶여 하나로 합칠 켜고 끄는 속성의 키를 찾는다. 그 속성을 쓰는 모든 레이어가
 * 글자나 교체 속성에도 묶였을 때만 합친다.
 * @param layers 모든 변형의 레이어
 * @returns 합칠 켜고 끄는 속성 키
 */
function mergedVisibilityKeys(layers: readonly Layer[]): Set<string> {
  const keys = new Set<string>();
  const rejected = new Set<string>();
  for (const layer of layers) {
    const visible = layer.propertyRefs.visible;
    if (visible === undefined) {
      continue;
    }
    if (
      layer.propertyRefs.characters !== undefined ||
      layer.propertyRefs.mainComponent !== undefined
    ) {
      keys.add(visible);
    } else {
      rejected.add(visible);
    }
  }
  for (const key of rejected) {
    keys.delete(key);
  }
  return keys;
}

/**
 * 글자·교체 속성과 함께 묶인 켜고 끄는 속성을 찾는다.
 * @param layers 모든 변형의 레이어
 * @param ref 속성을 가리키는 자리
 * @param key 글자·교체 속성 키
 * @param merged 합칠 켜고 끄는 속성 키
 * @returns 켜고 끄는 속성 키. 없으면 null
 */
function visibilityPartner(
  layers: readonly Layer[],
  ref: 'characters' | 'mainComponent',
  key: string,
  merged: ReadonlySet<string>,
): string | null {
  for (const layer of layers) {
    const visible = layer.propertyRefs.visible;
    if (layer.propertyRefs[ref] === key && visible !== undefined && merged.has(visible)) {
      return visible;
    }
  }
  return null;
}

/**
 * 인스턴스 교체 속성의 값 꼴을 정한다. 모두 한 묶음의 자산이면 그 자산 이름이고, 아니면 요소를 받는다.
 * @param refs 기본값과 선호값
 * @returns 값 꼴
 */
function swapValueKind(refs: readonly ComponentRef[]): SwapValueKind {
  if (refs.every((ref) => ref.kind === 'asset' && ref.asset.group === 'Images')) {
    return 'image';
  }
  if (refs.every((ref) => ref.kind === 'asset' && ref.asset.group !== 'Images')) {
    return 'svg';
  }
  return 'node';
}

/**
 * 레이어가 슬롯의 기본 내용 안에 있는지 본다.
 * @param key 레이어 키
 * @param nodes 마디
 * @returns 슬롯 안이면 true
 */
export function isInsideSlot(key: LayerKey, nodes: ReadonlyMap<LayerKey, LayerNode>): boolean {
  for (const node of nodes.values()) {
    if (node.kind === 'slot' && node.key !== key && key.startsWith(`${node.key}/`)) {
      return true;
    }
  }
  return false;
}

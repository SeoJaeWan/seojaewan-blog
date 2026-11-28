import type { StateCondition } from '../../src/behaviors/behavior-spec.ts';
import type { InstanceLayer } from '../../src/figma-export/component-schema.ts';
import { MOTION_WRAPPER_LAYER } from '../../src/figma-export/component-schema.ts';
import { joinLayerKey, type LayerKey, ROOT_LAYER_KEY } from '../../src/figma-export/layer-key.ts';
import type { ForcedPseudoClass, ParityStory } from '../../src/figma-parity/parity-manifest.ts';
import {
  ComponentGenerationError,
  type ComponentInput,
  type ComponentModel,
  type GenerationContext,
  type LayerNode,
  motionLookSource,
  type VariantInfo,
} from './component-model.ts';
import { storyExportName, uniqueName } from './component-naming.ts';
import { innerFlags, innerPropertyValue, svgAssetName } from './skin-code.ts';

// 변형마다의 스토리와, 스토리 테스트가 레이어와 요소를 짝짓는 짝 표를 만든다.

/** 스토리가 다른 기기를 고를 때의 뷰포트 이름([[테스트 작성 규칙:스토리 테스트]]) */
const MOBILE_VIEWPORT = 'mobile1';

/** 강제로 켤 수 있는 의사 클래스 */
const forceablePseudoClasses = [
  'hover',
  'active',
  'focus',
  'focus-visible',
  'focus-within',
] as const satisfies readonly ForcedPseudoClass[];

/**
 * 변형마다의 스토리 이름을 정한다. 변형 값을 PascalCase로 잇고 겹치면 순번을 붙인다.
 * @codocs [[디자인 시스템:스토리 규칙]]
 * @param model 읽은 컴포넌트
 * @returns 변형 순서대로의 스토리 export 이름
 */
export function storyNames(model: ComponentModel): string[] {
  const used = new Set<string>();
  return model.variants.map(
    /**
     * 변형 하나의 스토리 이름을 정한다.
     * @param info 변형
     */
    (info) =>
      uniqueName(
        storyExportName(model.axes.map((axis) => info.variant.values[axis.figmaName] ?? '')),
        used,
      ),
  );
}

/**
 * 스토리 파일을 만든다. 변형 하나에 스토리 하나이고, 입력은 그 변형의 피그마 값이다. `play`는 넣지 않는다.
 * @codocs [[디자인 시스템:스토리 규칙]]
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @returns TSX 글
 */
export function storyCode(model: ComponentModel, context: GenerationContext): string {
  const names = storyNames(model);
  const imports = new Map<string, Set<string>>();
  /**
   * import를 더한다.
   * @param module 모듈 경로
   * @param name 가져올 이름
   */
  function addImport(module: string, name: string): void {
    imports.set(module, new Set([...(imports.get(module) ?? []), name]));
  }
  addImport(`./${model.fileName}.gen`, model.identifier);
  const stories = model.variants.map(
    /**
     * 변형 하나의 스토리를 쓴다.
     * @param info 변형
     * @param index 순서
     */
    (info, index) => {
      const args = storyArgs(model, context, info, addImport);
      const lines = [
        `export const ${names[index] ?? 'Default'}: Story = {`,
        `  name: ${JSON.stringify(info.variant.name)},`,
        `  args: { ${args.join(', ')} },`,
        ...(info.isMobile
          ? [`  globals: { viewport: { value: '${MOBILE_VIEWPORT}', isRotated: false } },`]
          : []),
        '};',
      ];
      return lines.join('\n');
    },
  );
  const relative = [...imports.keys()].sort(
    (a, b) => parentDepth(b) - parentDepth(a) || a.localeCompare(b),
  );
  return [
    "import type { Meta, StoryObj } from '@storybook/react-vite';",
    '',
    ...relative.map(
      (module) =>
        `import { ${[...(imports.get(module) ?? [])].sort().join(', ')} } from '${module}';`,
    ),
    '',
    '// 생성 파일이라 손으로 고치지 않는다. 피그마 변형 하나에 스토리 하나다([[디자인 시스템:스토리 규칙]]).',
    'const meta = {',
    `  title: '${model.schema.page}/${model.schema.name}',`,
    `  component: ${model.identifier},`,
    `} satisfies Meta<typeof ${model.identifier}>;`,
    '',
    'export default meta;',
    '',
    'type Story = StoryObj<typeof meta>;',
    '',
    stories.join('\n\n'),
    '',
  ].join('\n');
}

/**
 * 상대 경로가 몇 단계 위로 올라가는지 센다.
 * @param path 경로
 * @returns `../`의 수
 */
function parentDepth(path: string): number {
  return (path.match(/\.\.\//gu) ?? []).length;
}

/**
 * 변형 하나의 스토리 입력을 만든다.
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @param info 변형
 * @param addImport import를 더하는 함수
 * @returns `이름: 값` 글
 */
function storyArgs(
  model: ComponentModel,
  context: GenerationContext,
  info: VariantInfo,
  addImport: (module: string, name: string) => void,
): string[] {
  const args: string[] = [];
  const toggles = new Map<string, boolean>();
  for (const property of model.schema.properties) {
    if (property.type === 'BOOLEAN') {
      toggles.set(property.key, property.isOnByDefault);
    }
  }
  for (const input of model.inputs) {
    switch (input.kind) {
      case 'variant':
        args.push(`${input.name}: '${info.propValues[input.name] ?? ''}'`);
        break;
      case 'boolean':
        args.push(`${input.name}: ${String(input.isOnByDefault)}`);
        break;
      case 'text':
        if (input.visibleKey === null || toggles.get(input.visibleKey) === true) {
          args.push(`${input.name}: ${JSON.stringify(input.defaultValue)}`);
        }
        break;
      case 'swap':
        if (input.visibleKey === null || toggles.get(input.visibleKey) === true) {
          args.push(`${input.name}: ${swapDefault(input)}`);
        }
        break;
      case 'slot': {
        const content = slotDefault(model, context, info, input, addImport);
        if (content !== null) {
          args.push(`${input.name}: ${content}`);
        }
        break;
      }
      case 'exposed': {
        const node = model.nodes.get(input.layerKey);
        const layer = node?.layers[info.index];
        if (layer?.kind === 'instance') {
          const value = innerPropertyValue(context.modelOf(layer.component), layer, input.inner);
          if (value !== undefined) {
            args.push(`${input.name}: ${value}`);
          }
        }
        break;
      }
      case 'flag':
        if (info.terms.some((term) => term.codeName === input.name)) {
          args.push(`${input.name}: true`);
        }
        break;
      case 'nested-event':
      case 'event':
        break;
    }
  }
  return args;
}

/**
 * 인스턴스 교체 입력의 피그마 기본 인스턴스를 값 글로 옮긴다.
 * @param input 교체 입력
 * @returns 값 글
 */
function swapDefault(input: Extract<ComponentInput, { kind: 'swap' }>): string {
  const ref = input.defaultValue;
  if (ref.kind !== 'asset') {
    throw new Error(`[components] 인스턴스 교체 입력 \`${input.name}\`의 기본값이 자산이 아니다.`);
  }
  return JSON.stringify(
    ref.asset.group === 'Images' ? ref.asset.file : svgAssetName(ref.asset.file),
  );
}

/**
 * 슬롯의 피그마 기본 내용을 스토리 입력으로 옮긴다. 기본 내용은 컴포넌트 인스턴스여야 한다.
 * @codocs [[디자인 시스템:스토리 규칙]]
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @param info 변형
 * @param input 슬롯 입력
 * @param addImport import를 더하는 함수
 * @returns JSX 글. 기본 내용이 없으면 null
 */
function slotDefault(
  model: ComponentModel,
  context: GenerationContext,
  info: VariantInfo,
  input: Extract<ComponentInput, { kind: 'slot' }>,
  addImport: (module: string, name: string) => void,
): string | null {
  const slot = [...model.nodes.values()]
    .map((node) => node.layers[info.index])
    .find((layer) => layer?.kind === 'slot' && layer.slotProperty === input.key);
  if (slot?.kind !== 'slot' || slot.children.length === 0) {
    return null;
  }
  const children = slot.children.map(
    /**
     * 슬롯 기본 내용의 인스턴스 하나를 JSX로 쓴다.
     * @param child 슬롯 기본 내용의 레이어
     */
    (child) => {
      if (child.kind !== 'instance') {
        throw new ComponentGenerationError(
          model.schema.name,
          `슬롯 \`${slot.key}\`의 기본 내용 \`${child.key}\`가 컴포넌트 인스턴스가 아니다. 슬롯에는 실제 컴포넌트를 넣는다.`,
        );
      }
      const inner = context.modelOf(child.component);
      addImport(`../${inner.fileName}/${inner.fileName}.gen`, inner.identifier);
      const props = instanceProps(inner, child);
      return `<${inner.identifier} ${Object.entries(props)
        .map(([name, value]) => `${name}={${value}}`)
        .join(' ')} />`;
    },
  );
  return children.length === 1 ? (children[0] ?? 'null') : `<>${children.join('')}</>`;
}

/**
 * 인스턴스에 고른 속성을 안쪽 입력 값 글로 옮긴다.
 * @param inner 품은 컴포넌트
 * @param layer 인스턴스 레이어
 * @returns 입력 이름 → 값 글
 */
function instanceProps(inner: ComponentModel, layer: InstanceLayer): Record<string, string> {
  const props: Record<string, string> = {};
  for (const input of inner.inputs) {
    if (
      input.kind === 'variant' ||
      input.kind === 'boolean' ||
      input.kind === 'text' ||
      input.kind === 'swap'
    ) {
      const value = innerPropertyValue(inner, layer, input);
      if (value !== undefined) {
        props[input.name] = value;
      }
    }
  }
  for (const flag of innerFlags(inner, layer)) {
    props[flag] = 'true';
  }
  return props;
}

/**
 * 짝 표와 검증 안내 파일(`<이름>.layers.gen.ts`)을 만든다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @param paths 다른 파일 경로
 * @param paths.source `src/`까지의 상대 경로
 * @returns TS 글
 */
export function layersCode(
  model: ComponentModel,
  context: GenerationContext,
  paths: { source: string },
): string {
  const pairs = layerPairs(model, context);
  const names = storyNames(model);
  const stories = model.variants.map(
    (info, index) => [names[index] ?? 'Default', parityStory(model, info)] as const,
  );
  return [
    `import type { LayerPairTable } from '${paths.source}/figma-export/component-layout';`,
    `import { ROOT_LAYER_KEY } from '${paths.source}/figma-export/layer-key';`,
    `import type { ParityStories } from '${paths.source}/figma-parity/parity-manifest';`,
    '',
    '// 생성 파일이라 손으로 고치지 않는다. 스토리 테스트의 생성 결과 검증만 읽는다([[디자인 시스템:생성 결과 검증]]).',
    '',
    // 빈 문자열 키는 lint가 클래스 자리로 잘못 읽어 루트는 ROOT_LAYER_KEY로 적는다.
    'export const layerPairs: LayerPairTable = {',
    ...[...pairs].map(
      ([key, selector]) =>
        `  ${key === ROOT_LAYER_KEY ? '[ROOT_LAYER_KEY]' : JSON.stringify(key)}: ${JSON.stringify(selector)},`,
    ),
    '};',
    '',
    `export const parityStories: ParityStories = ${JSON.stringify(Object.fromEntries(stories), null, 2)};`,
    '',
  ].join('\n');
}

/**
 * 레이어 키마다 그 레이어를 그린 요소의 선택자를 만든다. 품은 인스턴스 안쪽 레이어는 인스턴스 선택자 뒤에
 * 안쪽 컴포넌트의 선택자를 잇는다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @returns 레이어 키 → 선택자
 */
export function layerPairs(
  model: ComponentModel,
  context: GenerationContext,
): Map<LayerKey, string> {
  const pairs = new Map<LayerKey, string>();
  for (const node of model.nodes.values()) {
    const selector = `.${node.className}`;
    pairs.set(node.key, selector);
    const instance = node.layers.find(
      (layer): layer is InstanceLayer => layer?.kind === 'instance',
    );
    if (instance !== undefined) {
      for (const [innerKey, innerSelector] of layerPairs(
        context.modelOf(instance.component),
        context,
      )) {
        if (innerKey !== ROOT_LAYER_KEY && !pairs.has(joinLayerKey(node.key, innerKey))) {
          pairs.set(joinLayerKey(node.key, innerKey), `${selector} ${innerSelector}`);
        }
      }
    }
  }
  if (model.hasMotionWrapper) {
    pairs.set('motion', `.${model.tree.className}`);
  }
  return pairs;
}

/**
 * 스토리 하나를 검증하는 법을 정한다. 코드 이름이 없는 의사 클래스 낱말은 테스트가 브라우저에 켜고,
 * 코드 이름이 없는 aria·data 낱말은 테스트가 그 속성을 붙인다. 코드 이름이 있는 낱말은 스토리 입력이 켠다.
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:스토리 규칙]]
 * @param model 읽은 컴포넌트
 * @param info 변형
 * @returns 검증하는 법
 */
function parityStory(model: ComponentModel, info: VariantInfo): ParityStory {
  const forcedStates = new Map<string, Set<ForcedPseudoClass>>();
  const forcedAttributes: { selector: string; name: string; value: string }[] = [];
  for (const term of info.terms) {
    if (term.codeName !== null) {
      continue;
    }
    for (const target of roleNodes(model, term.target)) {
      collectForcing(model, term.condition, `.${target.className}`, forcedStates, forcedAttributes);
    }
  }
  const ignored: ParityStory['ignored'][number][] = (model.spec?.runtimeValues ?? []).flatMap(
    (value) => roleNodes(model, value.role).map((node) => ({ key: node.key, field: value.field })),
  );
  const lookSource = motionLookSource(info.variant.root);
  if (lookSource !== null) {
    ignored.push({
      key: lookSource === 'root' ? MOTION_WRAPPER_LAYER : ROOT_LAYER_KEY,
      field: 'look',
    });
  }
  return {
    variant: info.variant.name,
    forcedStates: [...forcedStates].map(([selector, pseudoClasses]) => ({
      selector,
      pseudoClasses: [...pseudoClasses],
    })),
    forcedAttributes,
    motion: info.motion,
    ignored,
  };
}

/**
 * 조건을 켜는 법을 모은다. 아님(`not`) 조건은 켜지 않은 그대로가 맞으므로 아무것도 하지 않는다.
 * @param model 읽은 컴포넌트
 * @param condition 조건
 * @param selector 대상 요소 선택자
 * @param forcedStates 강제로 켤 상태
 * @param forcedAttributes 붙일 속성
 */
function collectForcing(
  model: ComponentModel,
  condition: StateCondition,
  selector: string,
  forcedStates: Map<string, Set<ForcedPseudoClass>>,
  forcedAttributes: { selector: string; name: string; value: string }[],
): void {
  if (condition.kind === 'pseudo-class') {
    const pseudoClass = forceablePseudoClasses.find((name) => name === condition.name);
    if (pseudoClass === undefined) {
      throw new ComponentGenerationError(
        model.schema.name,
        `\`:${condition.name}\` 낱말은 브라우저에 강제로 켤 수 없다. 낱말 표에 코드 이름을 적는다.`,
      );
    }
    const set = forcedStates.get(selector) ?? new Set<ForcedPseudoClass>();
    set.add(pseudoClass);
    forcedStates.set(selector, set);
  } else if (condition.kind === 'aria' || condition.kind === 'data') {
    forcedAttributes.push({ selector, name: condition.attribute, value: condition.value ?? '' });
  }
}

/**
 * 역할을 맡은 마디를 찾는다. 루트 역할이거나 찾지 못하면 루트다.
 * @param model 읽은 컴포넌트
 * @param role 역할 이름
 * @returns 마디
 */
function roleNodes(model: ComponentModel, role: string): LayerNode[] {
  const found = [...model.nodes.values()].filter((node) =>
    node.roles.some((spec) => spec.role === role),
  );
  return found.length === 0 ? [model.tree] : found;
}

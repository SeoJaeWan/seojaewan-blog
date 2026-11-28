import { ROOT_ROLE } from '../../src/behaviors/behavior-spec.ts';
import type {
  AssetLayer,
  ComponentRef,
  InstanceLayer,
  Layer,
  PropertyValue,
} from '../../src/figma-export/component-schema.ts';
import { ROOT_LAYER_KEY } from '../../src/figma-export/layer-key.ts';
import {
  ComponentGenerationError,
  type ComponentInput,
  type ComponentModel,
  type GenerationContext,
  type LayerNode,
  type VariantInfo,
} from './component-model.ts';
import { modifierClassName, pascalCase } from './component-naming.ts';
import { comboBases } from './skin-style.ts';

// 스킨과 합친 컴포넌트의 TSX를 만든다. 스킨은 모양만 알고, 합친 컴포넌트가 동작의 결과를 스킨의 자리에 넘긴다.

/**
 * 생성 파일이 다른 파일을 가리키는 경로. 컴포넌트 폴더 기준이다.
 * - source: `src/`까지(`../..`)
 */
export type CodePaths = { source: string };

/** 자산 묶음 가운데 SVG로 그리는 묶음 */
const svgGroups = new Set(['Icons', 'Shapes', 'Illustrations']);

/**
 * 스킨 TSX를 만든다.
 * @codocs [[디자인 시스템:세 겹]]
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @param paths 다른 파일 경로
 * @returns TSX 글
 */
export function skinCode(
  model: ComponentModel,
  context: GenerationContext,
  paths: CodePaths,
): string {
  const writer = new SkinWriter(model, context, paths);
  return writer.write();
}

/**
 * 합친 컴포넌트 TSX를 만든다. 적힌 종류의 훅을 불러 역할마다 받은 속성을 스킨의 자리에 넘긴다. 종류가 없으면 스킨을 그대로 그린다.
 * @codocs [[디자인 시스템:동작의 종류]]
 * @codocs [[디자인 시스템:세 겹]]
 * @param model 읽은 컴포넌트
 * @param context 동작 등록부
 * @returns TSX 글
 */
export function combinedCode(model: ComponentModel, context: GenerationContext): string {
  const skin = `${model.identifier}Skin`;
  const variantTypes = model.inputs
    .filter((input) => input.kind === 'variant')
    .map((input) => variantTypeName(model, input.name));
  const exportTypes =
    variantTypes.length === 0
      ? []
      : [`export type { ${variantTypes.join(', ')} } from './${model.fileName}.skin.gen';`, ''];
  const description = jsdocText(model.schema.description || `피그마 ${model.schema.name}`);
  if (model.spec === null) {
    return [
      "import type { JSX } from 'react';",
      '',
      `import { ${skin}, type ${skin}Props } from './${model.fileName}.skin.gen';`,
      '',
      ...exportTypes,
      '/**',
      ` * ${description}`,
      ' * 동작의 종류가 없는 그림뿐인 컴포넌트라 스킨을 그대로 그린다.',
      ' * @param props 컴포넌트 입력',
      ' */',
      `export function ${model.identifier}({ ...skinProps }: ${skin}Props): JSX.Element {`,
      `  return <${skin} {...skinProps} />;`,
      '}',
      '',
    ].join('\n');
  }
  const { spec } = model;
  const hook = context.behaviors.hookOf(spec.name);
  const behaviorInputs = model.inputs.filter(
    (input) => input.kind === 'flag' || input.kind === 'event',
  );
  const destructured = behaviorInputs.map((input) =>
    input.kind === 'event' ? `${input.name}: ${handlerName(input.name)}` : input.name,
  );
  const hookArgs = behaviorInputs.map((input) =>
    input.kind === 'event' ? `${input.name}: ${handlerName(input.name)}` : input.name,
  );
  const parts = [...model.nodes.values()]
    .filter((node) => node.roles.length > 0 && node.kind !== 'instance' && node.kind !== 'asset')
    .map(
      /**
       * 역할을 맡은 마디 하나를 자리 이름과 태그·속성 글로 옮긴다.
       * @param node 마디
       */
      (node) => {
        const tags = node.roles.map((role) => role.tag).filter((tag) => tag !== null);
        const props =
          node.roles.length === 1
            ? `roles.${roleAccess(node.roles[0]?.role ?? ROOT_ROLE)}`
            : `{ ${node.roles.map((role) => `...roles.${roleAccess(role.role)}`).join(', ')} }`;
        const tag = tags[0] === undefined ? '' : `tag: '${tags[0]}', `;
        return `${node.identifier}: { ${tag}props: ${props} }`;
      },
    );
  return [
    "import type { JSX } from 'react';",
    '',
    `import { ${hook.hook} } from '${hook.module}';`,
    `import { ${skin}, type ${skin}Props } from './${model.fileName}.skin.gen';`,
    '',
    ...exportTypes,
    `type ${model.identifier}Props = Omit<${skin}Props, 'parts'> & Parameters<typeof ${hook.hook}>[0];`,
    '',
    '/**',
    ` * ${description}`,
    ` * 모습은 생성한 스킨이, 동작은 \`${spec.name}\` 종류가 맡는다.`,
    ' * @param props 컴포넌트 입력',
    ...behaviorInputs.map((input) =>
      input.kind === 'event'
        ? ` * @param props.${input.name} \`${spec.name}\` 종류의 사건`
        : ` * @param props.${input.name} \`${spec.name}\` 종류가 켜는 상태`,
    ),
    ' */',
    `export function ${model.identifier}({ ${[...destructured, '...skinProps'].join(', ')} }: ${model.identifier}Props): JSX.Element {`,
    `  const { roles } = ${hook.hook}({ ${hookArgs.join(', ')} });`,
    `  return <${skin} {...skinProps} parts={{ ${parts.join(', ')} }} />;`,
    '}',
    '',
  ].join('\n');
}

/**
 * 역할 이름을 속성 접근 글로 옮긴다.
 * @param role 역할 이름
 * @returns `label`, `['scroll-bar']`
 */
function roleAccess(role: string): string {
  return /^[A-Za-z_$][\w$]*$/u.test(role) ? role : `[${JSON.stringify(role)}]`;
}

/**
 * 사건 입력을 받아 둘 내부 이름을 만든다([[코드 작성 규칙:식별자 이름]]).
 * @param inputName `onClick`
 * @returns `handleClick`
 */
function handlerName(inputName: string): string {
  return `handle${inputName.replace(/^on/u, '')}`;
}

/**
 * 변형 입력의 타입 이름을 만든다.
 * @param model 읽은 컴포넌트
 * @param input 입력 이름
 * @returns `ButtonVariant`
 */
export function variantTypeName(model: ComponentModel, input: string): string {
  return `${model.identifier}${pascalCase([input])}`;
}

/**
 * JSDoc 한 줄에 넣을 수 있게 글을 다듬는다.
 * @param text 글
 * @returns 줄바꿈과 주석 끝 표시를 없앤 글
 */
function jsdocText(text: string): string {
  return text.replace(/\s+/gu, ' ').replaceAll('*/', '* /').trim();
}

/**
 * 입력 하나의 TypeScript 타입을 만든다.
 * @param model 읽은 컴포넌트
 * @param context 품은 컴포넌트를 읽는 곳
 * @param input 입력
 * @returns 타입 글과 선택 입력인지
 */
function inputType(
  model: ComponentModel,
  context: GenerationContext,
  input: ComponentInput,
): { type: string; isOptional: boolean } {
  switch (input.kind) {
    case 'variant':
      return { type: variantTypeName(model, input.name), isOptional: true };
    case 'boolean':
      return { type: 'boolean', isOptional: true };
    case 'text':
      return { type: 'string', isOptional: input.visibleKey !== null };
    case 'swap':
      return {
        type: { svg: 'SvgAssetName', image: 'ImageAssetName', node: 'ReactNode' }[input.valueKind],
        isOptional: input.visibleKey !== null,
      };
    case 'slot':
      return { type: 'ReactNode', isOptional: true };
    case 'nested-event': {
      const instance = instanceOf(model.nodes.get(input.layerKey));
      const inner = context.modelOf(instance?.component ?? '');
      return {
        type: `ComponentProps<typeof ${inner.identifier}>['${input.innerEvent}']`,
        isOptional: true,
      };
    }
    case 'exposed': {
      const instance = instanceOf(model.nodes.get(input.layerKey));
      const inner = context.modelOf(instance?.component ?? '');
      if (input.inner.kind === 'variant') {
        return { type: variantTypeName(inner, input.inner.name), isOptional: true };
      }
      return { type: input.inner.kind === 'boolean' ? 'boolean' : 'string', isOptional: true };
    }
    case 'flag':
      return { type: 'boolean', isOptional: true };
    case 'event':
      return { type: 'never', isOptional: true };
  }
}

/**
 * 마디의 첫 인스턴스 레이어를 찾는다.
 * @param node 마디
 * @returns 인스턴스 레이어
 */
function instanceOf(node: LayerNode | undefined): InstanceLayer | undefined {
  return node?.layers.find((layer): layer is InstanceLayer => layer?.kind === 'instance');
}

/** 스킨 TSX를 쓰는 곳 */
class SkinWriter {
  private readonly model: ComponentModel;
  private readonly context: GenerationContext;
  private readonly paths: CodePaths;
  private readonly imports = new Map<string, Set<string>>();
  private readonly typeImports = new Map<string, Set<string>>();
  private readonly combos: { combo: string; base: VariantInfo; members: VariantInfo[] }[];

  /**
   * 쓸 컴포넌트를 받는다.
   * @param model 읽은 컴포넌트
   * @param context 품은 컴포넌트를 읽는 곳
   * @param paths 다른 파일 경로
   */
  constructor(model: ComponentModel, context: GenerationContext, paths: CodePaths) {
    this.model = model;
    this.context = context;
    this.paths = paths;
    this.combos = comboBases(model);
  }

  /**
   * 스킨 파일 전체를 쓴다.
   * @returns TSX 글
   */
  write(): string {
    const { model } = this;
    const skin = `${model.identifier}Skin`;
    const contentInputs = model.inputs.filter(
      (input) => input.kind !== 'flag' && input.kind !== 'event',
    );
    const partNames = [...model.nodes.values()]
      .filter((node) => node.roles.length > 0 && node.kind !== 'instance' && node.kind !== 'asset')
      .map((node) => `'${node.identifier}'`);
    const body = this.renderNode(model.tree, 2);
    this.addImport(`${this.paths.source}/cn`, 'cn');
    if (partNames.length > 0) {
      this.addTypeImport(`${this.paths.source}/skin/skin-part`, 'SkinParts');
    }
    const propLines = contentInputs.map(
      /**
       * 입력 하나를 Props 타입 줄로 옮긴다.
       * @param input 입력
       */
      (input) => {
        const { type, isOptional } = inputType(model, this.context, input);
        if (type.startsWith('ComponentProps<')) {
          this.addTypeImport('react', 'ComponentProps');
        }
        if (type === 'ReactNode') {
          this.addTypeImport('react', 'ReactNode');
        }
        if (type === 'SvgAssetName') {
          this.addTypeImport(`${this.paths.source}/assets/asset-data`, 'SvgAssetName');
        }
        if (type === 'ImageAssetName') {
          this.addTypeImport(`${this.paths.source}/assets/image-data`, 'ImageAssetName');
        }
        return `  ${input.name}${isOptional ? '?' : ''}: ${type};`;
      },
    );
    this.addTypeImport('react', 'JSX');
    const variantTypes = model.inputs.flatMap(
      /**
       * 변형 입력이면 변형 값 타입 선언을 만든다.
       * @param input 입력
       */
      (input) =>
        input.kind === 'variant'
          ? [
              `export type ${variantTypeName(model, input.name)} = ${input.axis.options.map((option) => `'${option.code}'`).join(' | ')};`,
              '',
            ]
          : [],
    );
    const modifiers = model.inputs.flatMap(
      /**
       * 변형 입력이면 변형 값 클래스 표를 만든다.
       * @param input 입력
       */
      (input) =>
        input.kind === 'variant'
          ? [
              `  ${input.name}: {`,
              ...input.axis.options.map(
                (option) =>
                  `    ${JSON.stringify(option.code)}: '${modifierClassName(model.fileName, input.name, option.code)}',`,
              ),
              '  },',
            ]
          : [],
    );
    const destructured = [
      ...contentInputs.map(
        /**
         * 입력 하나를 받는 자리의 구조 분해 글로 옮긴다(기본값 포함).
         * @param input 입력
         */
        (input) => {
          if (input.kind === 'variant') {
            const defaultCode =
              input.axis.options.find((option) => option.figma === input.axis.defaultValue)?.code ??
              '';
            return `${input.name} = '${defaultCode}'`;
          }
          if (input.kind === 'boolean') {
            return `${input.name} = ${String(input.isOnByDefault)}`;
          }
          if (input.kind === 'exposed') {
            return `${input.name} = ${this.exposedDefault(input)}`;
          }
          if (input.kind === 'nested-event') {
            return `${input.name}: ${handlerName(input.name)}`;
          }
          return input.name;
        },
      ),
      'className',
      ...(partNames.length > 0 ? ['parts'] : []),
    ];
    const docs = [
      ...contentInputs.map((input) => ` * @param props.${input.name} ${this.inputDoc(input)}`),
      ' * @param props.className 바깥 배치(여백, 위치, 크기, 정렬)에만 쓰는 클래스',
      ...(partNames.length > 0
        ? [' * @param props.parts 동작이 역할마다 준 태그와 속성. 합친 컴포넌트가 넘긴다']
        : []),
    ];
    return [
      `import './${model.fileName}.gen.css';`,
      '',
      ...this.importLines(),
      '',
      `const LAYERS = {`,
      ...[...model.nodes.values()]
        .filter((node) => !(model.hasMotionWrapper && node.key === 'motion'))
        .map((node) => `  ${node.identifier}: '${node.className}',`),
      '} as const;',
      '',
      ...(modifiers.length === 0 ? [] : ['const MODIFIERS = {', ...modifiers, '} as const;', '']),
      ...variantTypes,
      `export type ${skin}Props = {`,
      ...propLines,
      '  className?: string;',
      ...(partNames.length > 0 ? [`  parts?: SkinParts<${partNames.join(' | ')}>;`] : []),
      '};',
      '',
      '/**',
      ` * 피그마 ${model.schema.name}의 모습을 그린다. 생성 파일이라 손으로 고치지 않는다.`,
      ' * @param props 컴포넌트 입력',
      ...docs,
      ' */',
      `export function ${skin}({ ${destructured.join(', ')} }: ${skin}Props): JSX.Element {`,
      '  return (',
      body,
      '  );',
      '}',
      '',
    ].join('\n');
  }

  /**
   * 입력 하나의 설명을 만든다.
   * @param input 입력
   * @returns 설명
   */
  private inputDoc(input: ComponentInput): string {
    const property = this.model.schema.properties.find(
      (candidate) => 'key' in input && candidate.key === input.key,
    );
    switch (input.kind) {
      case 'variant':
        return `피그마 \`${input.axis.figmaName}\` 변형`;
      case 'boolean':
        return `피그마 \`${property?.name ?? input.key}\` 켜고 끄기`;
      case 'text':
        return `피그마 \`${property?.name ?? input.key}\` 글자${input.visibleKey === null ? '' : '. 주면 보이고 주지 않으면 보이지 않는다'}`;
      case 'swap':
        return `피그마 \`${property?.name ?? input.key}\` 자리${input.visibleKey === null ? '' : '. 주면 보이고 주지 않으면 보이지 않는다'}`;
      case 'slot':
        return `피그마 \`${property?.name ?? input.key}\` 슬롯에 넣을 내용`;
      case 'nested-event':
        return `안에 놓인 \`${this.model.nodes.get(input.layerKey)?.name ?? input.layerKey}\`의 사건`;
      case 'exposed':
        return `안에 놓인 \`${this.model.nodes.get(input.layerKey)?.name ?? input.layerKey}\`의 \`${input.inner.name}\``;
      case 'flag':
      case 'event':
        return '';
    }
  }

  /**
   * 노출한 중첩 입력의 기본값(그 인스턴스에 고른 값)을 만든다.
   * @param input 노출한 입력
   * @returns 기본값 글
   */
  private exposedDefault(input: Extract<ComponentInput, { kind: 'exposed' }>): string {
    const instance = instanceOf(this.model.nodes.get(input.layerKey));
    const inner = this.context.modelOf(instance?.component ?? '');
    const value =
      instance === undefined ? undefined : innerPropertyValue(inner, instance, input.inner);
    return value ?? 'undefined';
  }

  /**
   * 마디 하나와 그 자식을 JSX로 쓴다.
   * @param node 마디
   * @param depth 들여쓰기 깊이
   * @returns JSX 글
   */
  private renderNode(node: LayerNode, depth: number): string {
    const { model } = this;
    if (model.hasMotionWrapper && node.key === 'motion') {
      return node.children.map((child) => this.renderNode(child, depth)).join('\n');
    }
    const pad = '  '.repeat(depth);
    const groups = this.renderGroups(node);
    const rendered = groups.map(({ condition, layer }) => {
      const element = this.renderElement(node, layer, depth);
      return condition === null ? element : `${pad}{${condition} && (\n${element}\n${pad})}`;
    });
    return rendered.join('\n');
  }

  /**
   * 마디를 입력 묶음마다 같은 모양으로 그릴 수 있는 무리로 나눈다. 묶음마다 다른 글자·자산·인스턴스 속성은
   * 무리마다 따로 그리고, 그 무리가 보일 입력 조건을 붙인다. 켜고 끄는 입력에 묶인 레이어도 조건을 붙인다.
   * @param node 마디
   * @returns 조건과 대표 레이어
   */
  private renderGroups(node: LayerNode): { condition: string | null; layer: Layer }[] {
    const signatures = new Map<string, { combos: string[]; layer: Layer }>();
    for (const { combo, members } of this.combos) {
      const layers = members
        .map((info) => node.layers[info.index])
        .filter((layer): layer is Layer => layer !== undefined);
      const [first] = layers;
      if (first === undefined) {
        continue;
      }
      const signature = this.signature(first);
      for (const layer of layers) {
        if (this.signature(layer) !== signature) {
          throw new ComponentGenerationError(
            this.model.schema.name,
            `레이어 \`${node.key}\`의 글자·자산·인스턴스 속성이 상태나 기기 변형마다 다르다. 입력 축 변형으로만 바꿀 수 있다.`,
          );
        }
      }
      const entry = signatures.get(signature) ?? { combos: [], layer: first };
      entry.combos.push(combo);
      signatures.set(signature, entry);
    }
    const allCombos = this.combos.map(({ combo }) => combo);
    const visibility = this.visibilityCondition(node);
    return [...signatures.values()].map(
      /**
       * 무리 하나에 보일 조건을 붙인다.
       * @param root0 받는 값
       * @param root0.combos 묶음 이름
       * @param root0.layer 대표 레이어
       */
      ({ combos, layer }) => {
        const comboCondition =
          combos.length === allCombos.length ? null : this.comboCondition(combos);
        const parts = [comboCondition, visibility].filter((part) => part !== null);
        return { condition: parts.length === 0 ? null : parts.join(' && '), layer };
      },
    );
  }

  /**
   * 레이어를 그리는 모양의 지문을 만든다. 모습(CSS)이 아니라 JSX가 달라지는 것만 담는다.
   * @param layer 레이어
   * @returns 지문
   */
  private signature(layer: Layer): string {
    switch (layer.kind) {
      case 'text':
        return JSON.stringify(['text', layer.propertyRefs.characters ?? layer.characters]);
      case 'asset':
        return JSON.stringify(['asset', layer.propertyRefs.mainComponent ?? layer.asset.file]);
      case 'instance':
        return JSON.stringify(['instance', layer.component, this.instanceProps(layer)]);
      default:
        return JSON.stringify([layer.kind, imageFillOf(layer)?.file ?? null]);
    }
  }

  /**
   * 켜고 끄는 입력에 묶인 레이어의 보일 조건을 만든다.
   * @param node 마디
   * @returns 조건 글. 묶이지 않았으면 null
   */
  private visibilityCondition(node: LayerNode): string | null {
    const layer = node.layers.find((candidate) => candidate !== undefined);
    const visibleKey = layer?.propertyRefs.visible;
    if (layer === undefined || visibleKey === undefined) {
      return null;
    }
    const merged = this.model.inputs.find(
      (input) =>
        (input.kind === 'text' || input.kind === 'swap') && input.visibleKey === visibleKey,
    );
    if (merged !== undefined) {
      return `${merged.name} !== undefined`;
    }
    const toggle = this.model.inputs.find(
      (input) => input.kind === 'boolean' && input.key === visibleKey,
    );
    return toggle === undefined ? null : toggle.name;
  }

  /**
   * 입력 묶음 목록을 입력 조건으로 옮긴다. 한 축의 값만으로 정해지면 그 축만 본다.
   * @param combos 묶음 이름
   * @returns 조건 글
   */
  private comboCondition(combos: readonly string[]): string {
    const axes = this.model.inputs.filter(
      (input): input is Extract<ComponentInput, { kind: 'variant' }> => input.kind === 'variant',
    );
    const included = new Set(combos);
    for (const [position, axis] of axes.entries()) {
      const values = new Set<string>();
      let isDecided = true;
      for (const { combo } of this.combos) {
        const value = combo.split('/')[position] ?? '';
        const others = this.combos.filter(
          (candidate) => (candidate.combo.split('/')[position] ?? '') === value,
        );
        const isIn = included.has(combo);
        if (others.some((other) => included.has(other.combo) !== isIn)) {
          isDecided = false;
          break;
        }
        if (isIn) {
          values.add(value);
        }
      }
      if (isDecided) {
        return `(${[...values].map((value) => `${axis.name} === '${value}'`).join(' || ')})`;
      }
    }
    return `(${combos
      .map(
        /**
         * 묶음 하나를 축 값 조건으로 옮긴다.
         * @param combo 묶음 이름
         */
        (combo) =>
          `(${combo
            .split('/')
            .map((value, position) => `${axes[position]?.name ?? ''} === '${value}'`)
            .join(' && ')})`,
      )
      .join(' || ')})`;
  }

  /**
   * 레이어 하나의 요소를 쓴다.
   * @param node 마디
   * @param layer 대표 레이어
   * @param depth 들여쓰기 깊이
   * @returns JSX 글
   */
  private renderElement(node: LayerNode, layer: Layer, depth: number): string {
    const pad = '  '.repeat(depth);
    const className = this.classNameExpression(node);
    const part = node.roles.length > 0 ? `parts?.${node.identifier}` : null;
    if (layer.kind === 'asset') {
      return `${pad}${this.assetElement(layer, className)}`;
    }
    if (layer.kind === 'instance') {
      return this.instanceElement(node, layer, className, depth);
    }
    const image = imageFillOf(layer);
    if (image !== undefined) {
      this.addImport(`${this.paths.source}/components/image-asset/image-asset`, 'ImageAsset');
      return `${pad}<ImageAsset name=${JSON.stringify(image.file)} className={${className}} />`;
    }
    const defaultTag = layer.kind === 'text' ? 'span' : 'div';
    let children: string;
    if (layer.kind === 'text') {
      const input = this.model.inputs.find(
        (candidate) => candidate.kind === 'text' && candidate.key === layer.propertyRefs.characters,
      );
      children = `${pad}  {${input === undefined ? JSON.stringify(layer.characters) : input.name}}`;
    } else if (layer.kind === 'slot') {
      const input = this.model.inputs.find(
        (candidate) => candidate.kind === 'slot' && candidate.key === layer.slotProperty,
      );
      children = input === undefined ? '' : `${pad}  {${input.name}}`;
    } else {
      children = node.children.map((child) => this.renderNode(child, depth + 1)).join('\n');
    }
    if (part !== null) {
      this.addImport(`${this.paths.source}/skin/skin-part`, 'SkinElement');
      const open = `${pad}<SkinElement part={${part}} defaultTag="${defaultTag}" className={${className}}>`;
      return children === ''
        ? `${open}</SkinElement>`
        : `${open}\n${children}\n${pad}</SkinElement>`;
    }
    const open = `${pad}<${defaultTag} className={${className}}>`;
    return children === ''
      ? `${open}</${defaultTag}>`
      : `${open}\n${children}\n${pad}</${defaultTag}>`;
  }

  /**
   * 요소의 클래스 식을 만든다. 루트는 변형 값 클래스와 쓰는 곳의 클래스를 함께 합친다.
   * @param node 마디
   * @returns 식 글
   */
  private classNameExpression(node: LayerNode): string {
    if (node.key !== ROOT_LAYER_KEY) {
      return `LAYERS.${node.identifier}`;
    }
    const modifiers = this.model.inputs
      .filter((input) => input.kind === 'variant')
      .map((input) => `MODIFIERS.${input.name}[${input.name}]`);
    return `cn(${['LAYERS.root', ...modifiers, 'className'].join(', ')})`;
  }

  /**
   * 자산 요소를 쓴다. 한 가지 색·여러 색 자산은 SVG로, 이미지는 `ImageAsset`으로 그린다.
   * @codocs [[디자인 시스템:자산]]
   * @codocs [[디자인 시스템:아이콘 자리]]
   * @param layer 자산 레이어
   * @param className 클래스 식
   * @returns JSX 글
   */
  private assetElement(layer: AssetLayer, className: string): string {
    const input = this.model.inputs.find(
      (candidate) =>
        candidate.kind === 'swap' && candidate.key === layer.propertyRefs.mainComponent,
    );
    if (input?.kind === 'swap' && input.valueKind === 'node') {
      return `{${input.name}}`;
    }
    if (layer.asset.group === 'Images') {
      this.addImport(`${this.paths.source}/components/image-asset/image-asset`, 'ImageAsset');
      const name = input === undefined ? JSON.stringify(layer.asset.file) : `{${input.name}}`;
      return `<ImageAsset name=${name} className={${className}} />`;
    }
    this.addImport(`${this.paths.source}/components/asset/asset`, 'Asset');
    const name =
      input === undefined ? JSON.stringify(svgAssetName(layer.asset.file)) : `{${input.name}}`;
    return `<Asset name=${name} className={${className}} />`;
  }

  /**
   * 품은 컴포넌트를 그 합친 컴포넌트로 쓴다. 고른 속성, 노출한 입력, 박힌 부품의 사건, 슬롯 내용을 넘긴다.
   * @codocs [[디자인 시스템:컴포넌트 입력]]
   * @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
   * @param node 마디
   * @param layer 인스턴스 레이어
   * @param className 클래스 식
   * @param depth 들여쓰기 깊이
   * @returns JSX 글
   */
  private instanceElement(
    node: LayerNode,
    layer: InstanceLayer,
    className: string,
    depth: number,
  ): string {
    const pad = '  '.repeat(depth);
    const inner = this.context.modelOf(layer.component);
    this.addImport(`../${inner.fileName}/${inner.fileName}.gen`, inner.identifier);
    const attributes = [`className={${className}}`];
    for (const [name, value] of Object.entries(this.instanceProps(layer))) {
      const exposed = this.model.inputs.find(
        (input) =>
          input.kind === 'exposed' && input.layerKey === node.key && input.inner.name === name,
      );
      attributes.push(jsxAttribute(name, exposed === undefined ? value : exposed.name));
    }
    for (const input of this.model.inputs) {
      if (input.kind === 'nested-event' && input.layerKey === node.key) {
        attributes.push(`${input.innerEvent}={${handlerName(input.name)}}`);
      }
    }
    for (const slot of inner.inputs) {
      if (slot.kind !== 'slot') {
        continue;
      }
      const children = node.children.filter(
        (child) => child.slotContent?.slot === this.slotFigmaName(inner, slot.key),
      );
      if (children.length > 0) {
        const rendered = children.map((child) => this.renderNode(child, depth + 2)).join('\n');
        attributes.push(`${slot.name}={\n${pad}  <>\n${rendered}\n${pad}  </>\n${pad}}`);
      }
    }
    return `${pad}<${inner.identifier} ${attributes.join(' ')} />`;
  }

  /**
   * 슬롯 속성 키의 피그마 이름을 찾는다.
   * @param inner 품은 컴포넌트
   * @param key 슬롯 속성 키
   * @returns 속성 이름
   */
  private slotFigmaName(inner: ComponentModel, key: string): string {
    return inner.schema.properties.find((property) => property.key === key)?.name ?? key;
  }

  /**
   * 인스턴스에 고른 속성을 안쪽 컴포넌트의 입력 값 글로 옮긴다.
   * @param layer 인스턴스 레이어
   * @returns 입력 이름 → 값 글
   */
  instanceProps(layer: InstanceLayer): Record<string, string> {
    const inner = this.context.modelOf(layer.component);
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
   * import를 더한다.
   * @param module 모듈 경로
   * @param name 가져올 이름
   */
  private addImport(module: string, name: string): void {
    this.imports.set(module, new Set([...(this.imports.get(module) ?? []), name]));
  }

  /**
   * 타입 import를 더한다.
   * @param module 모듈 경로
   * @param name 가져올 타입 이름
   */
  private addTypeImport(module: string, name: string): void {
    this.typeImports.set(module, new Set([...(this.typeImports.get(module) ?? []), name]));
  }

  /**
   * import 줄을 정렬해 쓴다. 바깥 패키지가 먼저, 상대 경로는 먼 곳부터다.
   * @returns import 줄
   */
  private importLines(): string[] {
    const modules = new Set([...this.imports.keys(), ...this.typeImports.keys()]);
    const external = [...modules].filter((module) => !module.startsWith('.')).sort();
    const relative = [...modules].filter((module) => module.startsWith('.')).sort(compareRelative);
    return [
      ...external.map((module) => this.importLine(module)),
      ...(external.length > 0 && relative.length > 0 ? [''] : []),
      ...relative.map((module) => this.importLine(module)),
    ];
  }

  /**
   * 모듈 하나의 import 줄을 쓴다. 타입만 가져오면 `import type`이다.
   * @param module 모듈 경로
   * @returns import 줄
   */
  private importLine(module: string): string {
    const values = [...(this.imports.get(module) ?? [])].sort();
    const types = [...(this.typeImports.get(module) ?? [])].sort();
    if (values.length === 0) {
      return `import type { ${types.join(', ')} } from '${module}';`;
    }
    const names = [...values, ...types.map((type) => `type ${type}`)].sort((a, b) =>
      a.replace(/^type /u, '').localeCompare(b.replace(/^type /u, '')),
    );
    return `import { ${names.join(', ')} } from '${module}';`;
  }
}

/**
 * 상대 경로 import 순서를 정한다. 먼 상위 폴더가 먼저이고, 같은 깊이는 이름순이다.
 * @param a 경로
 * @param b 경로
 * @returns 정렬 값
 */
function compareRelative(a: string, b: string): number {
  return parentDepth(b) - parentDepth(a) || a.localeCompare(b);
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
 * 틀 레이어의 이미지 칠 자산을 찾는다. 칠이 이미지 하나이고 자식이 없을 때만 이미지로 그린다.
 * @param layer 레이어
 * @returns 이미지 자산. 없으면 undefined
 */
function imageFillOf(layer: Layer): { file: string } | undefined {
  if ((layer.kind !== 'box' && layer.kind !== 'slot') || !('paints' in layer.fills)) {
    return undefined;
  }
  const image = layer.fills.paints.find((paint) => paint.type === 'IMAGE');
  return image === undefined || layer.children.length > 0 ? undefined : { file: image.asset.file };
}

/**
 * 자산 원본 이름을 `Asset`이 찾는 이름으로 옮긴다. 지금 자산 데이터는 확장자를 붙인 이름을 쓴다.
 * @codocs [[디자인 시스템:자산]]
 * @param file 자산 원본 이름(`icons/ic_fluent_add_20_regular`)
 * @returns `icons/ic_fluent_add_20_regular.svg`
 */
export function svgAssetName(file: string): string {
  return `${file}.svg`;
}

/**
 * 인스턴스가 고른 속성 값을 안쪽 입력의 값 글로 옮긴다.
 * @param inner 품은 컴포넌트
 * @param layer 인스턴스 레이어
 * @param input 안쪽 입력
 * @returns 값 글. 넘기지 않을 때는 undefined
 */
export function innerPropertyValue(
  inner: ComponentModel,
  layer: InstanceLayer,
  input: Extract<ComponentInput, { kind: 'variant' | 'boolean' | 'text' | 'swap' }>,
): string | undefined {
  const figmaName =
    input.kind === 'variant'
      ? input.axis.figmaName
      : inner.schema.properties.find((property) => property.key === input.key)?.name;
  const value: PropertyValue | undefined =
    figmaName === undefined ? undefined : layer.properties[figmaName];
  if (value === undefined) {
    return undefined;
  }
  if ((input.kind === 'text' || input.kind === 'swap') && input.visibleKey !== null) {
    const toggleName = inner.schema.properties.find(
      (property) => property.key === input.visibleKey,
    )?.name;
    if (toggleName !== undefined && layer.properties[toggleName] === false) {
      return undefined;
    }
  }
  if (input.kind === 'variant' && typeof value === 'string') {
    const code = input.axis.options.find((option) => option.figma === value)?.code;
    return code === undefined ? undefined : `'${code}'`;
  }
  if (typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  return refValue(value);
}

/**
 * 원본 참조를 값 글로 옮긴다.
 * @param ref 원본 참조
 * @returns 자산 이름 글
 */
function refValue(ref: ComponentRef): string | undefined {
  if (ref.kind !== 'asset') {
    return undefined;
  }
  return JSON.stringify(
    svgGroups.has(ref.asset.group) ? svgAssetName(ref.asset.file) : ref.asset.file,
  );
}

/**
 * 인스턴스의 상태 값에서 입력으로 켜는 낱말(코드 이름이 있는 낱말)을 찾는다.
 * @codocs [[디자인 시스템:상태]]
 * @param inner 품은 컴포넌트
 * @param layer 인스턴스 레이어
 * @returns 켤 입력 이름
 */
export function innerFlags(inner: ComponentModel, layer: InstanceLayer): string[] {
  const variant = inner.variants.find(
    /**
     * 인스턴스가 고른 축 값과 맞는 안쪽 변형인지 본다.
     * @param info 변형
     */
    (info) =>
      Object.entries(info.variant.values).every(([axis, value]) => {
        const chosen = layer.properties[axis];
        return chosen === undefined || chosen === value;
      }),
  );
  if (variant === undefined) {
    return [];
  }
  return variant.terms.flatMap((term) => (term.codeName === null ? [] : [term.codeName]));
}

/**
 * JSX 속성 하나를 쓴다. 따옴표 글자 값은 따옴표 속성으로, 나머지는 식으로 쓴다.
 * @param name 속성 이름
 * @param value 값 글(식)
 * @returns `label="확인"`, `isDisabled={true}`
 */
function jsxAttribute(name: string, value: string): string {
  const literal = /^(?:'([^'\\]*)'|"([^"\\]*)")$/u.exec(value);
  const text = literal?.[1] ?? literal?.[2];
  return text === undefined || /[{}<>]/u.test(text) ? `${name}={${value}}` : `${name}="${text}"`;
}

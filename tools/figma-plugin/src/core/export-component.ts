import type {
  ComponentLayout,
  ComponentRef,
  ComponentSchema,
  PropertyDefinition,
  VariantTransition,
} from '../../../../packages/design-system/src/figma-contract';
import { componentPageOf } from '../component-pages';
import { componentsByKey, listComponentNodes, placeOf, readImageAssets } from '../figma-reader';
import { buildComponentLayout } from './build-layout';
import { buildComponentSchema } from './build-schema';
import { type BehaviorLookup, checkComponent, type Violation } from './check-structure';
import type { ComponentData, VariantData } from './node-data';
import { easingData, readVariantMotion } from './read-motion';
import {
  behaviorOf,
  componentRef,
  componentRefById,
  createReadContext,
  type ReadContext,
  readVariantTree,
  slotKeysOf,
} from './read-node';

// 컴포넌트 하나를 읽어 스키마(`<이름>.json`)와 검증 자료(`<이름>.layout.json`)를 만들고 구조 검사를 한다.
// GitHub와 UI를 모르고 파일을 쓰지 않는다. 피그마에서 이 함수만 묶어 실행해 실제 값을 뽑을 수 있다.

/**
 * 파일 전체에서 한 번 읽어 두는 정보.
 * - read: 노드를 읽을 때 쓰는 파일 정보와 캐시
 * - nameCounts: 내보내는 페이지의 컴포넌트 이름 → 그 이름을 가진 컴포넌트 수
 */
export type ExportContext = {
  read: ReadContext;
  nameCounts: ReadonlyMap<string, number>;
};

/**
 * 컴포넌트 하나를 내보낸 결과.
 * - schema, layout: 스키마와 검증 자료. 페이지가 Controls·Shell·Blog가 아니면 null
 * - violations: 구조 검사 위반. 하나라도 있으면 파일로 쓰지 않는다
 */
export type ComponentExport = {
  schema: ComponentSchema | null;
  layout: ComponentLayout | null;
  violations: Violation[];
};

/**
 * 내보내기에 쓰는 파일 정보를 읽는다. 이름 있는 이미지 자산, 컴포넌트 키 표, 같은 이름 컴포넌트 수다.
 * 여러 컴포넌트를 내보낼 때는 한 번만 읽어 exportComponent에 넘긴다.
 * @codocs [[디자인 시스템:피그마 플러그인]]
 * @returns 파일 정보
 */
export async function createExportContext(): Promise<ExportContext> {
  const images = await readImageAssets();
  const read = createReadContext(
    new Map([...images].map(([hash, asset]) => [hash, asset.ref])),
    await componentsByKey(),
  );
  const nameCounts = new Map<string, number>();
  for (const { node } of await listComponentNodes()) {
    nameCounts.set(node.name, (nameCounts.get(node.name) ?? 0) + 1);
  }
  return { read, nameCounts };
}

/**
 * 컴포넌트 하나(세트이거나 변형이 없는 컴포넌트)를 읽어 스키마와 검증 자료를 만들고 구조 검사를 한다.
 * 위반이 있어도 읽은 스키마와 검증 자료를 돌려준다(쓸지는 부르는 쪽이 정한다). 세트의 변형을 넘기면 그 세트를 읽는다.
 * @codocs [[디자인 시스템:스키마]]
 * @codocs [[디자인 시스템:생성 결과 검증]]
 * @codocs [[디자인 시스템:구조 검사]]
 * @param node 컴포넌트 세트나 변형이 없는 컴포넌트(세트의 변형이면 그 세트)
 * @param options 파일 정보와 동작 등록부. 없으면 파일 정보를 새로 읽고 디자인 시스템의 등록부를 쓴다
 * @param options.context 파일 정보
 * @param options.lookupBehavior 동작 등록부
 * @returns 스키마, 검증 자료, 위반
 */
export async function exportComponent(
  node: ComponentSetNode | ComponentNode,
  options: { context?: ExportContext; lookupBehavior?: BehaviorLookup } = {},
): Promise<ComponentExport> {
  const context = options.context ?? (await createExportContext());
  // 세트의 변형 하나를 넘기면 그 세트를 내보낸다.
  const target =
    node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET' ? node.parent : node;
  const data = await readComponent(target, context);
  const violations = checkComponent(data, options.lookupBehavior);
  if (data.page === null) {
    violations.unshift({
      where: data.name,
      reason: '컴포넌트가 Controls·Shell·Blog 페이지에 있지 않다',
      fix: '내보낼 컴포넌트는 Controls·Shell·Blog 페이지에 둔다.',
      nodeId: data.nodeId,
    });
    return { schema: null, layout: null, violations };
  }
  return {
    schema: buildComponentSchema(data, data.page),
    layout: buildComponentLayout(data),
    violations,
  };
}

/**
 * 컴포넌트를 순수 데이터로 읽는다.
 * @param node 컴포넌트 세트나 변형이 없는 컴포넌트
 * @param context 파일 정보
 * @returns 컴포넌트 데이터
 */
export async function readComponent(
  node: ComponentSetNode | ComponentNode,
  context: ExportContext,
): Promise<ComponentData> {
  const slotKeys = slotKeysOf(node);
  const variants = variantsOf(node);
  const variantData: VariantData[] = [];
  for (const variant of variants) {
    const root = await readVariantTree(variant, slotKeys, context.read);
    const { motion, problems } = await readVariantMotion(variant, root);
    variantData.push({
      name: variant.name,
      nodeId: variant.id,
      values: node.type === 'COMPONENT_SET' ? { ...variant.variantProperties } : {},
      root,
      transitions: transitionsOf(variant, variants),
      motion,
      motionProblems: problems,
    });
  }
  return {
    name: node.name,
    nodeId: node.id,
    page: componentPageOf(placeOf(node).page),
    description: node.description,
    behavior: await behaviorOf(node, context.read),
    sameNameCount: context.nameCounts.get(node.name) ?? 1,
    properties: await propertyDefinitions(node, context.read),
    variants: variantData,
  };
}

/**
 * 컴포넌트 세트의 변형 목록을 구한다. 변형이 없는 컴포넌트는 자기 하나다.
 * @param node 컴포넌트 세트나 컴포넌트
 * @returns 변형 목록(피그마 순서)
 */
function variantsOf(node: ComponentSetNode | ComponentNode): ComponentNode[] {
  return node.type === 'COMPONENT_SET'
    ? node.children.filter((child): child is ComponentNode => child.type === 'COMPONENT')
    : [node];
}

/**
 * 변형에서 다른 변형으로 걸린 전환(`CHANGE_TO`)을 읽는다. 계기(누르면, 올리면)는 읽지 않는다.
 * @codocs [[디자인 시스템:상태]]
 * @param variant 변형
 * @param variants 같은 세트의 변형
 * @returns 전환
 */
function transitionsOf(
  variant: ComponentNode,
  variants: readonly ComponentNode[],
): VariantTransition[] {
  const result: VariantTransition[] = [];
  for (const reaction of variant.reactions) {
    for (const action of reaction.actions ?? []) {
      if (action.type !== 'NODE' || action.navigation !== 'CHANGE_TO') {
        continue;
      }
      const destination = variants.find((other) => other.id === action.destinationId);
      if (destination === undefined) {
        continue;
      }
      const { transition } = action;
      result.push({
        destination: destination.name,
        transition:
          transition === null
            ? null
            : {
                type: transition.type,
                duration: transition.duration,
                easing: easingData(transition.easing),
              },
      });
    }
  }
  return result;
}

/**
 * 컴포넌트 속성 정의를 피그마 순서대로 읽는다. 변형 축도 `VARIANT` 속성으로 담는다.
 * 인스턴스 교체 속성의 기본값과 선호값은 원본 참조로 옮긴다. 키로 찾지 못한 선호값은 뺀다.
 * @codocs [[디자인 시스템:컴포넌트 입력]]
 * @codocs [[디자인 시스템:아이콘 자리]]
 * @param node 컴포넌트 세트나 변형이 없는 컴포넌트
 * @param context 읽기 정보
 * @returns 속성 정의
 */
async function propertyDefinitions(
  node: ComponentSetNode | ComponentNode,
  context: ReadContext,
): Promise<PropertyDefinition[]> {
  const result: PropertyDefinition[] = [];
  for (const [key, definition] of Object.entries(node.componentPropertyDefinitions)) {
    const name = key.split('#')[0] ?? key;
    const preferredValues = (definition.preferredValues ?? []).flatMap((value): ComponentRef[] => {
      const found = context.componentsByKey.get(value.key);
      return found === undefined ? [] : [componentRef(found, context)];
    });
    switch (definition.type) {
      case 'VARIANT':
        result.push({
          type: 'VARIANT',
          key,
          name,
          options: [...(definition.variantOptions ?? [])],
          default: String(definition.defaultValue),
        });
        break;
      case 'BOOLEAN':
        result.push({
          type: 'BOOLEAN',
          key,
          name,
          isOnByDefault: definition.defaultValue === true,
        });
        break;
      case 'TEXT':
        result.push({ type: 'TEXT', key, name, default: String(definition.defaultValue) });
        break;
      case 'INSTANCE_SWAP': {
        const fallback: ComponentRef = { kind: 'component', name: '', values: {} };
        const defaultRef = await componentRefById(String(definition.defaultValue), context);
        result.push({
          type: 'INSTANCE_SWAP',
          key,
          name,
          default: defaultRef ?? fallback,
          preferredValues,
        });
        break;
      }
      case 'SLOT': {
        const settings = definition.slotSettings ?? {};
        result.push({
          type: 'SLOT',
          key,
          name,
          description: definition.description ?? '',
          preferredValues,
          settings: {
            minChildren: settings.minChildren ?? null,
            maxChildren: settings.maxChildren ?? null,
            shouldStretchChildOnInsert: settings.stretchChildOnInsert ?? false,
            isEmptyByDefault: settings.displayEmptyByDefault ?? false,
            isPreferredValuesOnly: settings.allowPreferredValuesOnly ?? false,
          },
        });
        break;
      }
    }
  }
  return result;
}

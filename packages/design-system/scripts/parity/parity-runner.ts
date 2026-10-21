import type { CDPSession, Locator, Page } from '@playwright/test';

import type { VariantChecks } from './layer-checks.ts';
import { type FontProbe, type InspectResult, inspectVariant } from './page-checks.ts';
import { FIGMA_LAYER_ATTRIBUTE, FIGMA_ROOT_ATTRIBUTE } from './parity-config.ts';
import type { PlanItem } from './parity-plan.ts';
import type { ParityFailure } from './parity-summary.ts';
import { TOKEN_CLASS_PATTERN } from './rules/class-rules.ts';
import { openStory } from './story-page.ts';
import { findParityStoryId, storyTarget } from './story-target.ts';

// 비교 항목 하나를 브라우저에서 확인하는 단계(스토리 열기, 상태 재현, 확인)다.
// parity.spec.ts(실제 비교)와 proof.spec.ts(틀린 버전이 실패하는지 확인)가 함께 쓴다.

// 실패 메시지에서 역할 클래스를 고를 때 쓰는 접두어. 긴 것부터 맞춘다.
const rolePrefixes = [
  'inner-border-w-',
  'inner-border-',
  'border-gradient-',
  'backdrop-blur-',
  'mix-blend-',
  'w-stroke-',
  'h-stroke-',
  'outline-',
  'border-',
  'rounded-',
  'shadow-',
  'opacity-',
  'justify-',
  'overflow-',
  'items-',
  'self-',
  'gap-x-',
  'gap-y-',
  'gap-',
  'min-w-',
  'max-w-',
  'min-h-',
  'max-h-',
  'inset-',
  'size-',
  'type-',
  'flex-',
  'bg-',
  'pt-',
  'pr-',
  'pb-',
  'pl-',
  'px-',
  'py-',
  'p-',
  'w-',
  'h-',
  'left-',
  'right-',
  'top-',
  'bottom-',
];

/** 스토리를 연 결과 */
export type OpenedItem = { ok: true; target: Locator } | { ok: false; failures: ParityFailure[] };

/**
 * 비교 항목의 스토리를 열고 피그마 상태를 재현한다.
 * @codocs [[피그마 일치 검사:스토리 규칙]]
 * @param page Playwright 페이지
 * @param item 비교 항목
 * @param storybookIndex storybook-static/index.json
 * @returns 비교 요소, 또는 실패
 */
export async function openItem(
  page: Page,
  item: PlanItem,
  storybookIndex: unknown,
): Promise<OpenedItem> {
  const storyId = findParityStoryId(storybookIndex, item.component);
  if (storyId === undefined) {
    return {
      ok: false,
      failures: [
        {
          layer: 'story',
          message: `스토리가 없다: src/components/${item.component}/${item.component}.stories.tsx의 Parity 스토리를 만든다`,
        },
      ],
    };
  }
  const target = storyTarget(item.properties);
  const args = { ...target.args };
  if (item.booleanArg !== null) {
    args[item.booleanArg.name] = item.booleanArg.value;
  }
  const opened = await openStory(page, storyId, args, target.interaction, item.componentName);
  return opened.ok
    ? { ok: true, target: opened.target }
    : { ok: false, failures: [{ layer: 'story', message: opened.message }] };
}

/**
 * 열린 스토리를 확인 항목과 대조한다. 글자를 span으로 감싸므로 이 뒤에는 화면을 다시 쓰지 않는다.
 * @codocs [[피그마 일치 검사:비교 규칙]]
 * @param page Playwright 페이지
 * @param item 비교 항목
 * @param checks 확인 항목(기본은 항목의 것)
 * @returns 실패 목록
 */
export async function inspectItem(
  page: Page,
  item: PlanItem,
  checks: VariantChecks = item.checks,
): Promise<ParityFailure[]> {
  const failures: ParityFailure[] = checks.unsupported.map((unsupported) => ({
    layer: unsupported.layer,
    message: `${unsupported.layer || '(루트)'} 비교할 수 없음: ${unsupported.message}`,
  }));
  const inspected: InspectResult = await page.evaluate(inspectVariant, {
    checks,
    layerAttribute: FIGMA_LAYER_ATTRIBUTE,
    rootAttribute: FIGMA_ROOT_ATTRIBUTE,
    rootName: item.componentName,
    tokenClassPattern: TOKEN_CLASS_PATTERN.source,
    rolePrefixes: rolePrefixes,
  });
  failures.push(...inspected.failures);
  failures.push(...(await fontFailures(page, inspected.fonts)));
  return failures;
}

/**
 * 글자마다 실제로 그린 서체가 피그마 구간 서체와 같은지 확인한다(D2).
 * Chrome DevTools Protocol의 CSS.getPlatformFontsForNode로 읽는다.
 * @codocs [[피그마 일치 검사:글자]]
 * @param page Playwright 페이지
 * @param probes 확인할 글자
 * @returns 실패 목록
 */
async function fontFailures(page: Page, probes: readonly FontProbe[]): Promise<ParityFailure[]> {
  if (probes.length === 0) {
    return [];
  }
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
  const failures: ParityFailure[] = [];
  for (const probe of probes) {
    const families = await platformFamilies(session, root.nodeId, probe);
    if (families.length === 1 && sameFamily(families[0] ?? '', probe.expected)) {
      continue;
    }
    failures.push({
      layer: probe.layer,
      message: `${probe.layer || '(루트)'} 서체 "${probe.character}": 피그마 ${probe.expected} → 코드 ${families.join(', ') || '읽지 못함'}`,
    });
  }
  await session.detach();
  return failures;
}

/**
 * 글자 하나(또는 입력 요소의 글자)를 그린 서체 이름을 읽는다.
 * @param session CDP 세션
 * @param documentId 문서 노드 ID
 * @param probe 확인할 글자
 * @returns 서체 이름 목록
 */
async function platformFamilies(
  session: CDPSession,
  documentId: number,
  probe: FontProbe,
): Promise<string[]> {
  if (probe.index >= 0) {
    const { nodeId } = await session.send('DOM.querySelector', {
      nodeId: documentId,
      selector: `[data-parity-char="${String(probe.index)}"]`,
    });
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId });
    return fonts.map((font) => font.familyName);
  }
  // 입력 요소의 글자는 브라우저 내부 그림자 트리(값이나 placeholder를 담은 div)에 있다.
  const { nodeId } = await session.send('DOM.querySelector', {
    nodeId: documentId,
    selector: `[${FIGMA_LAYER_ATTRIBUTE}="${probe.layer}"]`,
  });
  const { node } = await session.send('DOM.describeNode', { nodeId, depth: -1, pierce: true });
  const holder = findTextHolder(node, probe.character);
  if (holder === undefined) {
    return [];
  }
  const { nodeIds } = await session.send('DOM.pushNodesByBackendIdsToFrontend', {
    backendNodeIds: [holder],
  });
  const [holderId] = nodeIds;
  if (holderId === undefined) {
    return [];
  }
  const { fonts } = await session.send('CSS.getPlatformFontsForNode', { nodeId: holderId });
  return fonts.map((font) => font.familyName);
}

type DescribedNode = {
  backendNodeId: number;
  nodeType: number;
  nodeValue: string;
  children?: DescribedNode[];
  shadowRoots?: DescribedNode[];
};

/**
 * 글자를 담은 텍스트 노드의 부모 요소를 찾는다.
 * @param node CDP 노드
 * @param text 글자
 * @param parent 부모 요소의 backendNodeId
 * @returns 부모 요소의 backendNodeId
 */
function findTextHolder(node: DescribedNode, text: string, parent?: number): number | undefined {
  if (node.nodeType === 3 && node.nodeValue === text) {
    return parent;
  }
  for (const child of [...(node.shadowRoots ?? []), ...(node.children ?? [])]) {
    const found = findTextHolder(child, text, node.nodeType === 1 ? node.backendNodeId : parent);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

/**
 * 서체 이름이 같은지 본다. 플랫폼 이름은 굵기가 붙을 수 있어(`Pretendard SemiBold`) 앞부분을 비교한다.
 * @param platform 실제로 그린 서체 이름
 * @param figma 피그마 구간 서체 이름
 * @returns 같으면 true
 */
function sameFamily(platform: string, figma: string): boolean {
  return figma !== '' && normalizeFamily(platform).startsWith(normalizeFamily(figma));
}

/**
 * 서체 이름을 비교용으로 바꾼다(소문자, 공백 없음).
 * @param value 서체 이름
 * @returns 비교용 이름
 */
function normalizeFamily(value: string): string {
  return value.toLowerCase().replace(/\s+/gu, '');
}

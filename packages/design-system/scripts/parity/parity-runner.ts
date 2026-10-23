import type { CDPSession, Locator, Page } from '@playwright/test';

import { describeExpected, type Expected, matchesExpected } from './css-values.ts';
import { DeclarationReader, tokenDeclarations, type Winner } from './declarations.ts';
import type { ElementCheck, VariantChecks } from './layer-checks.ts';
import { type CollectResult, collectVariant, type FontProbe } from './page-checks.ts';
import {
  FIGMA_LAYER_ATTRIBUTE,
  FIGMA_ROOT_ATTRIBUTE,
  PARITY_CHAR_ATTRIBUTE,
  PARITY_NODE_ATTRIBUTE,
} from './parity-config.ts';
import type { PlanItem } from './parity-plan.ts';
import type { ParityFailure } from './parity-summary.ts';
import { openStory } from './story-page.ts';
import { findParityStoryId, storyTarget } from './story-target.ts';

// 비교 항목 하나를 브라우저에서 확인하는 단계(스토리 열기, 상태 재현, 확인)다.
// parity.spec.ts(실제 비교)와 proof.spec.ts(틀린 버전이 실패하는지 확인)가 함께 쓴다.
// 브라우저 안에서는 요소를 찾고 계산값을 모으고(page-checks.ts), 이긴 선언은 CDP로 읽어(declarations.ts) 여기서 판정한다.

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
  const collected: CollectResult = await page.evaluate(collectVariant, {
    checks,
    layerAttribute: FIGMA_LAYER_ATTRIBUTE,
    rootAttribute: FIGMA_ROOT_ATTRIBUTE,
    rootName: item.componentName,
    nodeAttribute: PARITY_NODE_ATTRIBUTE,
    charAttribute: PARITY_CHAR_ATTRIBUTE,
  });
  failures.push(...collected.failures);
  const reader = await DeclarationReader.open(page, PARITY_NODE_ATTRIBUTE);
  try {
    failures.push(...(await judgeCollected(reader, checks, collected, item.tokenNames)));
  } finally {
    await reader.close();
  }
  failures.push(...(await fontFailures(page, collected.fonts)));
  return failures;
}

/**
 * 모은 계산값과 CDP로 읽은 이긴 선언으로 확인 항목을 판정한다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param reader 이긴 선언 읽기 도구
 * @param checks 확인 항목
 * @param collected 브라우저에서 모은 값
 * @param tokenNames 디자인 토큰 CSS 이름
 * @returns 실패 목록
 */
async function judgeCollected(
  reader: DeclarationReader,
  checks: VariantChecks,
  collected: CollectResult,
  tokenNames: ReadonlySet<string>,
): Promise<ParityFailure[]> {
  const failures: ParityFailure[] = [];
  for (const [index, check] of checks.checks.entries()) {
    const read = collected.checks[index];
    if (read !== undefined && read.node >= 0) {
      failures.push(...(await judgeCheck(reader, check.layer, check, read.node, read.computed)));
    }
  }
  for (const entry of collected.segments) {
    const text = checks.texts[entry.text];
    const segment = text?.segments[entry.segment];
    if (text === undefined || segment === undefined) {
      continue;
    }
    for (const [index, check] of segment.checks.entries()) {
      // placeholder 글자의 색과 꾸밈은 의사 요소가 정한다(page-checks.ts와 같다).
      const isPseudo = check.property === 'color' || check.property === 'text-decoration-line';
      const pseudo = entry.pseudo !== null && isPseudo ? entry.pseudo : undefined;
      const computed = entry.computed[index] ?? '';
      failures.push(
        ...(await judgeCheck(reader, text.layer, { ...check, pseudo }, entry.node, computed)),
      );
    }
  }
  for (const [index, asset] of checks.assets.entries()) {
    const read = collected.assets[index];
    if (read === undefined || read.node < 0) {
      continue;
    }
    if (read.file !== asset.file) {
      failures.push(failure(asset.layer, '자산', asset.file, read.file ?? 'data-asset 없음'));
    }
    if (asset.color !== null) {
      failures.push(
        ...(await judgeCheck(reader, asset.layer, asset.color, read.node, read.computed)),
      );
    }
  }
  failures.push(...transitionFailures(checks, collected));
  failures.push(...(await unmarkedFailures(reader, collected, tokenNames)));
  return failures;
}

/**
 * 확인 항목 하나를 판정한다. 이름은 이긴 선언의 변수 사슬, 값·대응은 계산값으로 본다.
 * @codocs [[피그마 일치 검사:판정 항목]]
 * @param reader 이긴 선언 읽기 도구
 * @param layer 레이어 경로
 * @param check 확인 항목
 * @param node 요소 번호
 * @param computed 계산값
 * @returns 실패 목록
 */
async function judgeCheck(
  reader: DeclarationReader,
  layer: string,
  check: ElementCheck,
  node: number,
  computed: string,
): Promise<ParityFailure[]> {
  const failures: ParityFailure[] = [];
  const options = { inherited: check.inherited, pseudo: check.pseudo };
  if (check.variables !== undefined) {
    const { winner, isReached } = await reader.read(node, check.property, check.variables, options);
    if (!isReached) {
      failures.push(failure(layer, check.role, check.figma, declarationText(winner)));
    }
  }
  if (check.expected !== undefined) {
    const value = normalizeComputed(check.property, computed);
    if (!matchesExpected(check.expected, value)) {
      failures.push(
        failure(
          layer,
          check.role,
          check.figma,
          valueText(check.property, computed, check.expected),
        ),
      );
    }
  }
  return failures;
}

/**
 * 상태 전환을 판정한다. 바뀌는 속성을 전환하는 요소가 있고, 그 시간·이징이 피그마 값과 같아야 한다.
 * @codocs [[피그마 일치 검사:상태 전환]]
 * @param checks 확인 항목
 * @param collected 브라우저에서 모은 값
 * @returns 실패 목록
 */
function transitionFailures(checks: VariantChecks, collected: CollectResult): ParityFailure[] {
  const failures: ParityFailure[] = [];
  for (const read of collected.transitions) {
    const transition = checks.transitions[read.transition];
    if (transition === undefined) {
      continue;
    }
    const role = `상태 전환(${transition.from} → ${transition.properties[read.property] ?? read.property})`;
    if (read.owner === null) {
      failures.push(
        failure(
          transition.layer,
          role,
          `${read.property} 전환`,
          `transition-property ${read.listed}`,
        ),
      );
      continue;
    }
    const duration: Expected = { kind: 'ms', value: transition.duration };
    if (!matchesExpected(duration, read.owner.duration)) {
      failures.push(
        failure(
          transition.layer,
          `${role} 시간`,
          describeExpected(duration),
          valueText('transition-duration', read.owner.duration, duration),
        ),
      );
    }
    if (transition.easing !== null) {
      const easing: Expected = { kind: 'bezier', points: transition.easing };
      if (!matchesExpected(easing, read.owner.timing)) {
        failures.push(
          failure(
            transition.layer,
            `${role} 이징`,
            describeExpected(easing),
            valueText('transition-timing-function', read.owner.timing, easing),
          ),
        );
      }
    }
  }
  return failures;
}

/**
 * 표시(`data-figma`) 없는 요소가 피그마에 없는 모양을 그리는지 본다. 자기 클래스 규칙의 선언 중 하나라도 디자인 토큰에
 * 닿으면, 다른 선언에 덮여 화면에 보이지 않아도 실패다.
 * @codocs [[피그마 일치 검사:짝짓기]]
 * @param reader 이긴 선언 읽기 도구
 * @param collected 브라우저에서 모은 값
 * @param tokenNames 디자인 토큰 CSS 이름
 * @returns 실패 목록
 */
async function unmarkedFailures(
  reader: DeclarationReader,
  collected: CollectResult,
  tokenNames: ReadonlySet<string>,
): Promise<ParityFailure[]> {
  const failures: ParityFailure[] = [];
  for (const element of collected.unmarked) {
    const matched = await reader.matched(element.node);
    const declarations = matched === null ? [] : tokenDeclarations(matched, tokenNames);
    if (declarations.length > 0) {
      failures.push(
        failure(
          element.owner,
          '표시 없는 요소',
          `${FIGMA_LAYER_ATTRIBUTE} 표시`,
          `${element.label} ${declarations.join('; ')}`,
        ),
      );
    }
  }
  return failures;
}

/**
 * 계산값을 비교 모양으로 바꾼다. `letter-spacing: normal`은 0px이다.
 * @param property CSS 속성
 * @param computed 계산값
 * @returns 비교할 값
 */
function normalizeComputed(property: string, computed: string): string {
  return property === 'letter-spacing' && computed.trim() === 'normal' ? '0px' : computed;
}

/**
 * 실패 메시지에 쓸 이긴 선언 표기.
 * @param winner 이긴 선언
 * @returns `이름: 값`, 없으면 `선언 없음`
 */
function declarationText(winner: Winner | null): string {
  return winner === null ? '선언 없음' : `${winner.name}: ${winner.value}`;
}

/**
 * 실패 메시지에 쓸 계산값 표기.
 * @param property CSS 속성
 * @param computed 계산값
 * @param expected 기대값
 * @returns `<속성> <계산값> (기대 <기대값>)`
 */
function valueText(property: string, computed: string, expected: Expected): string {
  return `${property} ${computed || '(읽지 못함)'} (기대 ${describeExpected(expected)})`;
}

/**
 * 실패를 "<레이어> <역할>: 피그마 <피그마> → 코드 <코드>" 형식으로 만든다.
 * @param layer 레이어 경로(루트는 빈 문자열)
 * @param role 역할
 * @param figma 피그마 쪽 이름이나 값
 * @param code 코드에서 찾은 것
 * @returns 실패
 */
function failure(layer: string, role: string, figma: string, code: string): ParityFailure {
  return { layer, message: `${layer || '(루트)'} ${role}: 피그마 ${figma} → 코드 ${code}` };
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
    failures.push(
      failure(
        probe.layer,
        `서체 "${probe.character}"`,
        probe.expected,
        families.join(', ') || '읽지 못함',
      ),
    );
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
      selector: `[${PARITY_CHAR_ATTRIBUTE}="${String(probe.index)}"]`,
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

import { parityDecisions } from '../../../../packages/design-system/scripts/parity/rules/decisions';
// 값 표만 가져와 번들을 작게 둔다(피그마 MCP 코드 길이 제한).
import { valueGroups, values } from '../rules/figma-properties.json';
import type { Bound, NodeData, PaintData, TextSegmentData } from './node-data';

// 내보내기 전 구조 검사. 코드와 "같은 이름"으로 비교할 수 없는 구조를 찾아, 고칠 때까지 내보내기를 막는다.
// 값의 허용 여부는 분류표(rules/figma-properties.json)와 결정 사항(D1~D9)을 따른다.
// 분류표에 없는 값을 만나면 막는다.

/** 위반 하나 */
export type Violation = {
  /** 컴포넌트·변형·레이어 경로 */
  where: string;
  /** 무엇이 문제인지 */
  reason: string;
  /** 어떻게 고치는지 */
  fix: string;
};

/** 검사에 필요한 파일 수준 정보 */
export type CheckContext = {
  /** 숫자 이름 간격 토큰(spacing/<숫자>)의 값 → 변수 이름 목록 */
  spacingScale: ReadonlyMap<number, readonly string[]>;
};

type ValueStatus = 'allow' | 'block' | 'style' | 'asset' | 'D1' | 'D6' | 'D7';

const valueTables: Readonly<Record<string, Readonly<Record<string, string>> | undefined>> = values;
const valueGroupTables: Readonly<Record<string, Readonly<Record<string, string>>>> = valueGroups;

// 반올림 오차로 본 값의 차이다.
const EPSILON = 1e-6;

/**
 * 변형 하나의 구조를 검사한다. 숨긴 노드는 이미 빠져 있다(D4).
 * @codocs [[피그마 일치 검사:구조 검사]]
 * @param root 변형 루트 노드 데이터
 * @param where 위치 접두어(`Button / Style=Accent, State=Rest`)
 * @param context 파일 수준 정보
 * @returns 위반 목록
 */
export function checkVariant(root: NodeData, where: string, context: CheckContext): Violation[] {
  const violations: Violation[] = [];
  /**
   * 위반을 더한다.
   * @param node 노드
   * @param reason 이유
   * @param fix 고칠 방법
   */
  function add(node: NodeData, reason: string, fix: string): void {
    violations.push({ where: node.path === '' ? where : `${where} / ${node.path}`, reason, fix });
  }
  checkNode(root, true, context, add);
  return violations;
}

type Add = (node: NodeData, reason: string, fix: string) => void;

/**
 * 노드 하나와 그 아래를 검사한다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param context 파일 수준 정보
 * @param add 위반을 더하는 함수
 */
function checkNode(node: NodeData, isRoot: boolean, context: CheckContext, add: Add): void {
  if (!checkType(node, isRoot, add)) {
    return;
  }
  checkSiblingNames(node, add);
  checkCommon(node, add);
  checkPaints(node, add);
  checkStrokes(node, add);
  checkCorners(node, add);
  checkEffects(node, add);
  checkLayout(node, add);
  checkChildLayout(node, context, add);
  checkSizes(node, isRoot, add);
  if (node.text !== null) {
    checkText(node, add);
  }
  if (node.asset !== null) {
    for (const problem of node.asset.problems) {
      add(
        node,
        `자산 ${node.asset.group}/${node.asset.name}: ${problem}`,
        '한 가지 색 자산은 모든 칠·선을 같은 색 변수 하나에 연결한다. 여러 색이면 Illustrations 묶음에 둔다.',
      );
    }
    return;
  }
  for (const child of node.children) {
    checkNode(child, false, context, add);
  }
}

/**
 * 분류표에서 값의 상태를 찾는다. 표에 없는 값은 undefined다.
 * @param table 값 표
 * @param value 값
 * @returns 상태
 */
function statusOf(
  table: Readonly<Record<string, string>> | undefined,
  value: string,
): ValueStatus | undefined {
  const status = table?.[value];
  return status as ValueStatus | undefined;
}

/**
 * 열거 값이 분류표에서 허용되는지 확인한다. 표에 없거나 막는 값이면 위반을 더한다.
 * @param node 노드
 * @param property 속성 이름
 * @param value 값
 * @param add 위반을 더하는 함수
 * @returns 허용되면 true
 */
function checkEnum(node: NodeData, property: string, value: string, add: Add): boolean {
  const status = statusOf(valueTables[property], value);
  if (status === undefined) {
    add(
      node,
      `${property}=${value}는 분류표에 없는 값이다`,
      '분류표(figma-properties.json)에 값을 분류한 뒤 내보낸다.',
    );
    return false;
  }
  if (status === 'block') {
    add(
      node,
      `${property}=${value}는 코드와 이름으로 비교할 수 없다`,
      `${property}를 다른 값으로 바꾼다.`,
    );
    return false;
  }
  return true;
}

/**
 * 노드 종류를 검사한다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param add 위반을 더하는 함수
 * @returns 안쪽을 계속 검사하면 true
 */
function checkType(node: NodeData, isRoot: boolean, add: Add): boolean {
  if (isRoot) {
    // BOOLEAN 속성 경우(D4)는 변형의 임시 인스턴스를 검사한다.
    if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
      add(node, `변형 루트가 ${node.type}이다`, '컴포넌트(변형)를 내보낸다.');
      return false;
    }
    return true;
  }
  const status = statusOf(valueTables.type, node.type);
  switch (status) {
    case 'allow':
      return true;
    case 'asset':
      add(
        node,
        `${node.type}를 컴포넌트 안에 직접 그렸다`,
        'CSS로 그릴 수 없는 모양은 Foundations 자산 묶음(Icons, Shapes, Illustrations, Images)의 컴포넌트로 만들고 인스턴스로 넣는다(D6).',
      );
      return false;
    case 'D6':
      if (
        node.type === 'ELLIPSE' &&
        node.isFullEllipse === true &&
        parityDecisions.d6.allowFullEllipse
      ) {
        return true;
      }
      add(
        node,
        `${node.type}(호·별·다각형·선)는 막는다(D6)`,
        '완전한 원이나 사각형으로 바꾸거나, Foundations 자산 컴포넌트로 만든다.',
      );
      return false;
    case undefined:
      add(
        node,
        `노드 종류 ${node.type}는 분류표에 없다`,
        '분류표에 노드 종류를 분류한 뒤 내보낸다.',
      );
      return false;
    default:
      add(
        node,
        `노드 종류 ${node.type}는 코드와 이름으로 비교할 수 없다`,
        '프레임이나 자동 배치로 바꾼다.',
      );
      return false;
  }
}

/**
 * 같은 부모 안에 이름이 같은 보이는 자식이 있는지 확인한다. 레이어 경로가 짝짓기 기준이라 겹치면 안 된다.
 * @param node 부모 노드
 * @param add 위반을 더하는 함수
 */
function checkSiblingNames(node: NodeData, add: Add): void {
  const seen = new Set<string>();
  for (const child of [
    ...node.children.map((item) => item.path),
    ...node.hiddenChildren.map((item) => item.path),
  ]) {
    if (seen.has(child)) {
      add(node, `자식 레이어 경로 "${child}"가 겹친다`, '형제 레이어 이름을 서로 다르게 짓는다.');
    }
    seen.add(child);
    if (child.split('/').some((part) => part.trim() === '')) {
      add(node, `레이어 경로 "${child}"에 빈 이름이 있다`, '레이어 이름을 짓는다.');
    }
  }
}

/**
 * 불투명도·블렌드·회전·마스크·변수 모드를 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkCommon(node: NodeData, add: Add): void {
  if (Math.abs(node.opacity.value - 1) > EPSILON && node.opacity.variable === undefined) {
    add(
      node,
      `불투명도 ${String(node.opacity.value)}가 변수에 연결되어 있지 않다`,
      '불투명도를 opacity 변수에 연결한다.',
    );
  }
  checkEnum(node, 'blendMode', node.blendMode, add);
  const rotation = String(Math.round(node.rotation));
  const rotations: Readonly<Record<string, string>> = parityDecisions.d9.allowedRotations;
  if (Math.abs(node.rotation - Math.round(node.rotation)) > EPSILON || !(rotation in rotations)) {
    add(
      node,
      `회전 ${String(node.rotation)}°는 90° 배수가 아니다(D9)`,
      '회전을 0·90·-90·180° 중 하나로 둔다.',
    );
  }
  if (node.hasSkewOrFlip) {
    add(node, '뒤집기나 기울이기 변환이 있다', '변환을 없애고 회전만 쓴다.');
  }
  if (node.isMask) {
    add(
      node,
      '마스크 레이어는 지원하지 않는다',
      '자르기는 clipsContent나 모서리 반경으로 표현한다.',
    );
  }
  if (node.explicitModeCount > 0) {
    add(node, '노드에 변수 모드를 따로 지정했다', '변수 모드 지정을 지운다.');
  }
}

/**
 * 칠을 검사한다. 단색은 색 변수, 그라데이션·이미지·여러 칠은 칠 스타일이어야 한다.
 * 글자 노드의 칠은 구간마다 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkPaints(node: NodeData, add: Add): void {
  if (node.fills === null || node.text !== null || node.asset !== null) {
    return;
  }
  if (node.fills === 'mixed') {
    add(node, '칠이 섞여 있다', '칠을 하나로 정한다.');
    return;
  }
  checkPaintList(node, '칠', node.fills, node.fillStyle, 'fills.type', add);
}

/**
 * 칠·선 목록 하나를 검사한다.
 * @param node 노드
 * @param label 메시지에 쓸 이름(칠·선)
 * @param paints 칠 목록
 * @param style 연결한 스타일 이름
 * @param group 종류 표 이름
 * @param add 위반을 더하는 함수
 */
function checkPaintList(
  node: NodeData,
  label: string,
  paints: readonly PaintData[],
  style: string | undefined,
  group: string,
  add: Add,
): void {
  if (paints.some((paint) => !paint.visible)) {
    add(node, `숨긴 ${label}이 있다`, `숨긴 ${label}을 지운다.`);
  }
  if (style !== undefined) {
    return;
  }
  const visible = paints.filter((paint) => paint.visible);
  if (visible.length > 1) {
    add(
      node,
      `${label}이 ${String(visible.length)}개인데 스타일에 연결되어 있지 않다`,
      `${label} 스타일로 묶는다.`,
    );
    return;
  }
  for (const paint of visible) {
    const status = statusOf(valueGroupTables[group], paint.type);
    if (status === undefined) {
      add(
        node,
        `${label} 종류 ${paint.type}는 분류표에 없다`,
        '분류표에 칠 종류를 분류한 뒤 내보낸다.',
      );
    } else if (status === 'block') {
      add(
        node,
        `${label} 종류 ${paint.type}는 지원하지 않는다`,
        `${label}을 단색이나 스타일로 바꾼다.`,
      );
    } else if (status === 'style') {
      add(
        node,
        `${paint.type} ${label}이 스타일에 연결되어 있지 않다`,
        `${label} 스타일로 묶는다.`,
      );
    } else if (paint.variable === undefined) {
      add(
        node,
        `단색 ${label}이 색 변수에 연결되어 있지 않다`,
        `${label} 색을 색 변수에 연결한다.`,
      );
    } else if (paint.blendMode !== 'NORMAL') {
      add(
        node,
        `${label} 블렌드 ${paint.blendMode}는 스타일 밖에서 쓸 수 없다`,
        `${label} 스타일로 묶는다.`,
      );
    }
  }
}

/**
 * 선을 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkStrokes(node: NodeData, add: Add): void {
  if (node.strokes === null || node.asset !== null) {
    return;
  }
  const visible = node.strokes.filter((paint) => paint.visible);
  checkPaintList(node, '선', node.strokes, node.strokeStyle, 'strokes.type', add);
  if (visible.length === 0) {
    return;
  }
  if (node.strokeAlign !== undefined) {
    checkEnum(node, 'strokeAlign', node.strokeAlign, add);
  }
  if (node.dashPattern.length > 0) {
    add(node, '점선 패턴은 지원하지 않는다', '실선으로 바꾸거나 선을 지운다.');
  }
  if (node.variableWidthStroke || node.complexStroke) {
    add(node, '가변 두께·브러시 선은 지원하지 않는다', '기본 선으로 바꾼다.');
  }
  if (node.strokeJoin !== undefined && node.strokeJoin !== 'MITER') {
    add(node, `선 꺾임 ${node.strokeJoin}는 지원하지 않는다`, '선 꺾임을 MITER로 둔다.');
  }
  for (const [side, weight] of Object.entries(node.strokeWeight ?? {})) {
    if (weight.value > EPSILON && weight.variable === undefined) {
      add(
        node,
        `선 두께(${side}) ${String(weight.value)}가 변수에 연결되어 있지 않다`,
        '선 두께를 stroke-width 변수에 연결한다.',
      );
    }
  }
}

/**
 * 모서리 반경을 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkCorners(node: NodeData, add: Add): void {
  if (node.radius === undefined || node.asset !== null) {
    return;
  }
  for (const [corner, radius] of Object.entries(node.radius)) {
    if (radius.value > EPSILON && radius.variable === undefined) {
      add(
        node,
        `반경(${corner}) ${String(radius.value)}가 변수에 연결되어 있지 않다`,
        '반경을 radius 변수에 연결한다.',
      );
    }
  }
  if (node.cornerSmoothing > EPSILON) {
    add(node, '모서리 스무딩은 지원하지 않는다', '모서리 스무딩을 0으로 둔다.');
  }
}

/**
 * 효과를 검사한다. 보이는 효과는 효과 스타일에 연결되어야 한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkEffects(node: NodeData, add: Add): void {
  if (node.effects === null || node.asset !== null) {
    return;
  }
  if (node.effects.some((effect) => !effect.visible)) {
    add(node, '숨긴 효과가 있다', '숨긴 효과를 지운다.');
  }
  const visible = node.effects.filter((effect) => effect.visible);
  if (visible.length > 0 && node.effectStyle === undefined) {
    add(node, '효과가 효과 스타일에 연결되어 있지 않다', '효과를 효과 스타일로 묶는다.');
  }
  for (const effect of visible) {
    const status = statusOf(valueGroupTables['effects.type'], effect.type);
    if (status === undefined) {
      add(
        node,
        `효과 종류 ${effect.type}는 분류표에 없다`,
        '분류표에 효과 종류를 분류한 뒤 내보낸다.',
      );
    } else if (status === 'block') {
      add(node, `효과 ${effect.type}는 CSS로 그릴 수 없다`, '효과를 지운다.');
    }
    if (effect.blendMode !== 'NORMAL') {
      add(
        node,
        `효과 블렌드 ${effect.blendMode}는 지원하지 않는다`,
        '효과 블렌드를 NORMAL로 둔다.',
      );
    }
    if (effect.blurType !== undefined && effect.blurType !== 'NORMAL') {
      add(node, `흐림 종류 ${effect.blurType}는 지원하지 않는다`, '흐림 종류를 NORMAL로 둔다.');
    }
    if (effect.showShadowBehindNode === true && !parityDecisions.d5.allowShadowBehindNode) {
      add(node, '그림자 "투명한 부분 뒤에도 표시"는 막는다(D5)', '효과 스타일에서 이 옵션을 끈다.');
    }
  }
}

/**
 * 자동 배치를 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkLayout(node: NodeData, add: Add): void {
  const { layout } = node;
  if (layout === null || node.asset !== null) {
    return;
  }
  if (!checkEnum(node, 'layoutMode', layout.mode, add)) {
    return;
  }
  if (layout.mode === 'GRID') {
    if (!parityDecisions.d7.allowGrid) {
      add(node, 'GRID 자동 배치는 막는다(D7)', '가로·세로 자동 배치(필요하면 줄바꿈)로 바꾼다.');
    }
    return;
  }
  if (layout.mode === 'NONE') {
    if (node.children.length > 0 && !parityDecisions.d1.allowManualLayout) {
      add(
        node,
        '자동 배치가 아닌 프레임이 자식을 담고 있다(수동 배치, D1)',
        '부모를 자동 배치(방향·정렬·간격)로 바꾼다.',
      );
    }
    return;
  }
  checkEnum(node, 'layoutWrap', layout.wrap, add);
  checkEnum(node, 'primaryAxisAlignItems', layout.primaryAlign, add);
  checkEnum(node, 'counterAxisAlignItems', layout.counterAlign, add);
  checkEnum(node, 'counterAxisAlignContent', layout.alignContent, add);
  checkEnum(node, 'primaryAxisSizingMode', layout.primarySizing, add);
  checkEnum(node, 'counterAxisSizingMode', layout.counterSizing, add);
  for (const [side, padding] of Object.entries(layout.padding)) {
    requireBound(node, `여백(${side})`, padding, 'spacing', add);
  }
  const flowChildren = node.children.filter((child) => child.child?.positioning !== 'ABSOLUTE');
  if (flowChildren.length > 1 && layout.primaryAlign !== 'SPACE_BETWEEN') {
    requireBound(node, '간격', layout.itemSpacing, 'spacing', add);
  }
  if (layout.wrap === 'WRAP' && layout.counterAxisSpacing !== null) {
    requireBound(node, '줄 간격', layout.counterAxisSpacing, 'spacing', add);
  }
  if (layout.itemReverseZIndex) {
    add(node, '자식 쌓임 순서 뒤집기는 지원하지 않는다', '자식 순서를 바꾼다.');
  }
}

/**
 * 값이 0이 아니면 변수 연결을 요구한다.
 * @param node 노드
 * @param label 메시지에 쓸 이름
 * @param bound 값과 변수
 * @param collection 연결할 변수 종류(메시지용)
 * @param add 위반을 더하는 함수
 */
function requireBound(
  node: NodeData,
  label: string,
  bound: Bound,
  collection: string,
  add: Add,
): void {
  if (Math.abs(bound.value) > EPSILON && bound.variable === undefined) {
    add(
      node,
      `${label} ${String(bound.value)}가 변수에 연결되어 있지 않다`,
      `${label}을 ${collection} 변수에 연결한다.`,
    );
  }
}

/**
 * 부모 안에서의 자기 배치를 검사한다. 절대 위치는 D1을 따른다.
 * @param node 노드
 * @param context 파일 수준 정보
 * @param add 위반을 더하는 함수
 */
function checkChildLayout(node: NodeData, context: CheckContext, add: Add): void {
  const { child } = node;
  if (child === null || node.parentLayoutMode === null) {
    // 부모가 자동 배치가 아니면 부모 쪽에서 수동 배치로 막는다.
    return;
  }
  checkEnum(node, 'layoutSizingHorizontal', child.sizingHorizontal, add);
  checkEnum(node, 'layoutSizingVertical', child.sizingVertical, add);
  checkEnum(node, 'layoutAlign', child.layoutAlign, add);
  if (child.layoutGrow !== 0 && child.layoutGrow !== 1) {
    add(
      node,
      `layoutGrow ${String(child.layoutGrow)}는 지원하지 않는다`,
      '채우기(FILL)나 고정으로 둔다.',
    );
  }
  if (
    !checkEnum(node, 'layoutPositioning', child.positioning, add) ||
    child.positioning !== 'ABSOLUTE'
  ) {
    return;
  }
  if (!parityDecisions.d1.allowAbsoluteInAutoLayout) {
    add(node, '절대 위치는 막는다(D1)', '자동 배치 안의 흐름으로 바꾼다.');
    return;
  }
  for (const axis of ['horizontal', 'vertical'] as const) {
    const constraint = child.constraints[axis];
    const status = statusOf(valueTables.constraints, constraint);
    if (status === undefined || status === 'block') {
      add(
        node,
        `제약 ${constraint}는 막는다(D1)`,
        '제약을 왼쪽·오른쪽·양쪽·가운데 중 하나로 둔다.',
      );
      continue;
    }
    for (const distance of absoluteDistances(node, axis)) {
      if (insetToken(distance, context) === undefined) {
        add(
          node,
          `절대 위치 거리 ${String(distance)}가 숫자 이름 간격 토큰 하나로 정해지지 않는다(D1)`,
          '거리를 spacing/<숫자> 토큰 값 중 하나로 맞춘다.',
        );
      }
    }
  }
}

/**
 * 절대 위치 노드의 제약에 따라 코드 위치 클래스가 가질 거리를 계산한다.
 * CENTER는 가운데에서 벗어난 거리다.
 * @param node 절대 위치 노드
 * @param axis 축
 * @returns 거리 목록
 */
export function absoluteDistances(node: NodeData, axis: 'horizontal' | 'vertical'): number[] {
  const { child } = node;
  if (child === null) {
    return [];
  }
  const isHorizontal = axis === 'horizontal';
  const start = isHorizontal ? child.x : child.y;
  const size = isHorizontal ? node.width.value : node.height.value;
  const parentSize = isHorizontal ? child.parentWidth : child.parentHeight;
  const end = parentSize - start - size;
  switch (child.constraints[axis]) {
    case 'MIN':
      return [start];
    case 'MAX':
      return [end];
    case 'STRETCH':
      return [start, end];
    case 'CENTER':
      return [start + size / 2 - parentSize / 2];
    default:
      return [];
  }
}

/**
 * 거리 값에 맞는 숫자 이름 간격 토큰을 찾는다. 값이 같은 토큰이 여럿이면 정하지 않는다.
 * @param distance 거리(음수 가능)
 * @param context 파일 수준 정보
 * @returns 변수 이름, 없거나 여럿이면 undefined
 */
export function insetToken(distance: number, context: CheckContext): string | undefined {
  const rounded = Math.round(Math.abs(distance) * 1000) / 1000;
  const names = context.spacingScale.get(rounded) ?? [];
  return names.length === 1 ? names[0] : undefined;
}

/**
 * 고정 크기와 최소·최대 크기가 변수에 연결됐는지 검사한다(D8).
 * 절대 위치에서 양쪽 제약(STRETCH)인 축의 크기는 제약이 정하는 값이라 검사하지 않는다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param add 위반을 더하는 함수
 */
function checkSizes(node: NodeData, isRoot: boolean, add: Add): void {
  const { horizontal, vertical } = sizingOf(node, isRoot);
  const shouldRequire = isRoot
    ? parityDecisions.d8.requireBoundRootSize
    : parityDecisions.d8.requireBoundFixedSize;
  if (shouldRequire && horizontal === 'FIXED' && node.width.variable === undefined) {
    add(
      node,
      `고정 너비 ${String(node.width.value)}가 크기 변수에 연결되어 있지 않다(D8)`,
      '너비를 size 변수에 연결하거나 HUG·FILL로 바꾼다.',
    );
  }
  if (shouldRequire && vertical === 'FIXED' && node.height.variable === undefined) {
    add(
      node,
      `고정 높이 ${String(node.height.value)}가 크기 변수에 연결되어 있지 않다(D8)`,
      '높이를 size 변수에 연결하거나 HUG·FILL로 바꾼다.',
    );
  }
  for (const [label, bound] of [
    ['최소 너비', node.minWidth],
    ['최대 너비', node.maxWidth],
    ['최소 높이', node.minHeight],
    ['최대 높이', node.maxHeight],
  ] as const) {
    if (bound !== null && bound.variable === undefined) {
      add(
        node,
        `${label} ${String(bound.value)}가 변수에 연결되어 있지 않다`,
        `${label}를 size 변수에 연결한다.`,
      );
    }
  }
}

/**
 * 노드의 가로·세로 크기 방식을 정한다. 루트는 자동 배치 축 크기 방식, 자식은 layoutSizing, 글자는 자동 크기를 따른다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @returns 가로·세로 크기 방식(FIXED, HUG, FILL, DERIVED)
 */
export function sizingOf(
  node: NodeData,
  isRoot: boolean,
): { horizontal: string; vertical: string } {
  let horizontal = 'FIXED';
  let vertical = 'FIXED';
  if (isRoot) {
    if (node.layout !== null && node.layout.mode !== 'NONE') {
      const isRow = node.layout.mode === 'HORIZONTAL';
      const primary = node.layout.primarySizing === 'AUTO' ? 'HUG' : 'FIXED';
      const counter = node.layout.counterSizing === 'AUTO' ? 'HUG' : 'FIXED';
      horizontal = isRow ? primary : counter;
      vertical = isRow ? counter : primary;
    }
  } else if (node.child !== null && node.parentLayoutMode !== null) {
    horizontal = node.child.sizingHorizontal;
    vertical = node.child.sizingVertical;
    if (node.child.positioning === 'ABSOLUTE') {
      horizontal = node.child.constraints.horizontal === 'STRETCH' ? 'DERIVED' : 'FIXED';
      vertical = node.child.constraints.vertical === 'STRETCH' ? 'DERIVED' : 'FIXED';
    }
  }
  if (node.text !== null) {
    if (node.text.autoResize === 'WIDTH_AND_HEIGHT') {
      horizontal = 'HUG';
      vertical = 'HUG';
    } else if (node.text.autoResize === 'HEIGHT') {
      vertical = 'HUG';
    } else if (node.text.autoResize === 'NONE') {
      horizontal = 'FIXED';
      vertical = 'FIXED';
    }
  }
  return { horizontal, vertical };
}

/**
 * 글자 노드를 검사한다.
 * @param node 글자 노드
 * @param add 위반을 더하는 함수
 */
function checkText(node: NodeData, add: Add): void {
  const { text } = node;
  if (text === null) {
    return;
  }
  if (text.hasMissingFont) {
    add(node, '글꼴이 없어 대체 글꼴로 그려진다', '글꼴을 설치하거나 글자 스타일의 글꼴을 바꾼다.');
  }
  if (text.hangingPunctuation || text.hangingList) {
    add(node, '부호·목록 걸기는 지원하지 않는다', '부호 걸기와 목록 걸기를 끈다.');
  }
  checkEnum(node, 'textAutoResize', text.autoResize, add);
  checkEnum(node, 'textAlignHorizontal', text.alignHorizontal, add);
  checkEnum(node, 'textAlignVertical', text.alignVertical, add);
  checkEnum(node, 'textTruncation', text.truncation, add);
  checkEnum(node, 'leadingTrim', text.leadingTrim, add);
  if (text.truncation === 'ENDING' && text.maxLines === null) {
    add(node, '줄 수 없이 말줄임을 켰다', '최대 줄 수를 정한다.');
  }
  for (const segment of text.segments) {
    checkSegment(node, segment, add);
  }
}

/**
 * 글자 구간 하나를 검사한다.
 * @param node 글자 노드
 * @param segment 구간
 * @param add 위반을 더하는 함수
 */
function checkSegment(node: NodeData, segment: TextSegmentData, add: Add): void {
  const label = `"${segment.characters.slice(0, 12)}" 구간`;
  if (segment.textStyle === undefined || segment.styleFields === undefined) {
    add(node, `${label}에 글자 스타일이 없다`, '구간을 글자 스타일에 연결한다.');
  }
  if (segment.overrides.length > 0) {
    add(
      node,
      `${label}이 글자 스타일을 덮어썼다(${segment.overrides.join(', ')})`,
      '덮어쓴 값을 지우거나 새 글자 스타일을 만든다.',
    );
  }
  checkPaintList(node, `${label} 글자 칠`, segment.fills, segment.fillStyle, 'fills.type', add);
  checkEnum(node, 'textDecoration', segment.textDecoration, add);
  checkEnum(node, 'textCase', segment.textCase, add);
  if (segment.textWrapStyle !== undefined) {
    checkEnum(node, 'textWrapStyle', segment.textWrapStyle, add);
  }
  if (
    segment.paragraphIndent !== 0 ||
    segment.paragraphSpacing !== 0 ||
    segment.listSpacing !== 0 ||
    segment.indentation !== 0 ||
    segment.listType !== 'NONE'
  ) {
    add(
      node,
      `${label}에 문단 들여쓰기·간격·목록이 있다`,
      '문단은 글자 노드를 나눠 자동 배치 간격으로 표현한다.',
    );
  }
  if (segment.hasDecorationDetails) {
    add(node, `${label}의 밑줄 모양·위치·두께·색이 기본값이 아니다`, '기본 밑줄만 쓴다.');
  }
  if (segment.hasOpenTypeFeatures) {
    add(node, `${label}에 OpenType 기능이 켜져 있다`, 'OpenType 기능을 끈다.');
  }
}

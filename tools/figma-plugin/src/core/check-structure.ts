import {
  type BehaviorSpec,
  behaviorSpecOf,
  findStateWord,
  ON_OFF_VALUE_PAIRS,
  type RoleSelector,
  STATE_AXIS,
  stateWordsOf,
} from '../../../../packages/design-system/src/figma-contract';
import type { Bound, ComponentData, NodeData, PaintData, VariantData } from './node-data';

// 내보내기 전 구조 검사. 변형마다 검사하고, 어긋난 것이 하나라도 있으면 그 컴포넌트를 내보내지 않는다.
// 막는 것은 토큰 없는 값, CSS로 그릴 수 없는 기능, 모양 덮어쓰기 세 묶음과 읽을 수 없는 구조다([[디자인 시스템:구조 검사]]).
// 피그마 API를 쓰지 않는 순수 함수다. 동작 등록부는 인자로 받는다(테스트는 가짜 등록부를 넣는다).

/**
 * 위반 하나.
 * - where: 위치(컴포넌트 / 변형 / 레이어 키)
 * - reason: 이유
 * - fix: 고칠 방법
 * - nodeId: 고칠 레이어의 피그마 노드 ID. 플러그인 화면의 "피그마에서 보기"가 쓴다. 가리킬 노드가 없으면 null
 */
export type Violation = {
  where: string;
  reason: string;
  fix: string;
  nodeId: string | null;
};

/** 종류 이름으로 동작의 종류 규칙을 찾는 함수(동작 등록부). 없으면 undefined */
export type BehaviorLookup = (name: string) => BehaviorSpec | undefined;

type Add = (node: NodeData, reason: string, fix: string) => void;

// 반올림 오차로 본 값의 차이다.
const EPSILON = 1e-6;
// 자산이 아니면 막는 모양. 원·타원도 자산으로 둔다([[디자인 시스템:자산]]).
const shapeTypes: readonly string[] = [
  'VECTOR',
  'BOOLEAN_OPERATION',
  'STAR',
  'POLYGON',
  'LINE',
  'ELLIPSE',
];
// CSS로 그리는 노드 종류
const drawableTypes: readonly string[] = [
  'FRAME',
  'GROUP',
  'COMPONENT',
  'INSTANCE',
  'SLOT',
  'RECTANGLE',
  'TEXT',
];
// CSS로 그리는 칠 종류. 그라데이션과 이미지는 칠 스타일이나 이미지 자산으로만 쓴다(다이아몬드는 없다).
const fillTypes: readonly string[] = [
  'SOLID',
  'GRADIENT_LINEAR',
  'GRADIENT_RADIAL',
  'GRADIENT_ANGULAR',
  'IMAGE',
];
// CSS로 그리는 선 종류. 그라데이션 선은 칠 스타일로만 쓴다.
const strokeTypes: readonly string[] = ['SOLID', 'GRADIENT_LINEAR'];
// CSS로 그리는 효과 종류. 효과는 효과 스타일로만 쓴다.
const effectTypes: readonly string[] = [
  'DROP_SHADOW',
  'INNER_SHADOW',
  'LAYER_BLUR',
  'BACKGROUND_BLUR',
];
// CSS `object-fit`으로 옮기는 이미지 칠 맞춤 방식
const imageScaleModes: readonly string[] = ['FILL', 'FIT'];
const BIND_FIX = '변수에 연결한다.';

// 인스턴스에서 바꾸면 막는 모양 필드 → 메시지 이름
const appearanceLabels: Readonly<Record<string, string>> = {
  fills: '칠',
  strokes: '선',
  strokeWeight: '선 두께',
  stokeTopWeight: '선 두께',
  strokeTopWeight: '선 두께',
  strokeRightWeight: '선 두께',
  strokeBottomWeight: '선 두께',
  strokeLeftWeight: '선 두께',
  effects: '효과',
  opacity: '불투명도',
  fillStyleId: '칠 스타일',
  strokeStyleId: '선 스타일',
  effectStyleId: '효과 스타일',
};
// 자산 인스턴스와 그 안쪽에서 허용하는 색 필드
const assetColorFields: readonly string[] = [
  'fills',
  'strokes',
  'fillStyleId',
  'strokeStyleId',
  'boundVariables.fills',
  'boundVariables.strokes',
];
// 자산 인스턴스 자신에서 허용하는 불투명도 필드
const assetOpacityFields: readonly string[] = ['opacity', 'boundVariables.opacity'];

/**
 * 컴포넌트 하나를 검사한다. 한 대상의 위반은 모두 한 번에 돌려준다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param component 읽은 컴포넌트
 * @param lookupBehavior 동작 등록부. 기본은 디자인 시스템의 등록부다
 * @returns 위반 목록(모두)
 */
export function checkComponent(
  component: ComponentData,
  lookupBehavior: BehaviorLookup = behaviorSpecOf,
): Violation[] {
  const violations: Violation[] = [];
  if (component.sameNameCount > 1) {
    violations.push({
      where: component.name,
      reason: `이름이 같은 컴포넌트가 ${String(component.sameNameCount)}개 있다`,
      fix: 'Controls·Shell·Blog 페이지에서 컴포넌트 이름이 하나씩만 있게 바꾼다.',
      nodeId: component.nodeId,
    });
  }
  let spec: BehaviorSpec | undefined;
  if (component.behavior !== null) {
    spec = lookupBehavior(component.behavior);
    if (spec === undefined) {
      violations.push({
        where: component.name,
        reason: `적힌 동작의 종류 \`${component.behavior}\`가 동작 등록부에 없다`,
        fix: '있는 종류를 고르거나, 새 종류를 먼저 만들어 main에 넣은 뒤 내보낸다.',
        nodeId: component.nodeId,
      });
    }
  }
  for (const variant of component.variants) {
    const where = `${component.name} / ${variant.name}`;
    violations.push(...checkVariant(variant, where));
    violations.push(...checkStateWords(component, variant, where, spec));
    if (spec !== undefined) {
      violations.push(...checkRoles(component, variant, where, spec));
    }
  }
  return violations;
}

/**
 * 변형 하나의 구조를 검사한다. 변형에 바로 놓인 레이어는 숨긴 것도 보고, 품은 인스턴스 안쪽은 보이는 것만 본다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param variant 변형
 * @param where 위치 접두어(`Button / Variant=Accent, State=Rest`)
 * @returns 위반 목록
 */
export function checkVariant(variant: VariantData, where: string): Violation[] {
  const violations: Violation[] = [];
  /**
   * 위반을 더한다.
   * @param node 노드
   * @param reason 이유
   * @param fix 고칠 방법
   */
  function add(node: NodeData, reason: string, fix: string): void {
    violations.push({
      where: node.key === '' ? where : `${where} / ${node.key}`,
      reason,
      fix,
      nodeId: node.id,
    });
  }
  checkNode(variant.root, true, add);
  checkInstanceOverrides(variant.root, add);
  checkDuplicatedRoles(variant.root, add);
  for (const problem of variant.motionProblems) {
    violations.push({
      where: problem.layer === '' ? where : `${where} / ${problem.layer}`,
      reason: `${problem.property === '' ? '' : `${problem.property}: `}${problem.reason}`,
      fix: '키프레임은 투명도·배율·이동·회전·선 그리기 시작과 끝에만 숫자 값으로 건다.',
      nodeId: problem.nodeId,
    });
  }
  return violations;
}

/**
 * 노드 하나와 그 아래를 검사한다. 크기를 줄인 인스턴스(`scaleFactor`가 1이 아님)는 인스턴스 자체만 검사하고 안쪽은 건너뛴다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param add 위반을 더하는 함수
 */
function checkNode(node: NodeData, isRoot: boolean, add: Add): void {
  if (!node.isVisible && node.isInsideInstance) {
    return;
  }
  if (!isRoot && !checkType(node, add)) {
    return;
  }
  if (!node.isVisible && node.propertyRefs.visible === undefined) {
    add(
      node,
      '숨긴 레이어가 켜고 끄는 속성에 묶여 있지 않다',
      '불리언 속성에 묶거나, 상태에 따라 있고 없는 것이면 그 상태의 변형에만 그리고 숨긴 레이어를 지운다.',
    );
  }
  checkCommon(node, add);
  if (node.asset !== null) {
    for (const problem of node.asset.problems) {
      add(
        node,
        `자산 ${node.asset.group}/${node.asset.name}: ${problem}`,
        '한 가지 색 자산은 모든 칠·선을 같은 색 변수 하나에 연결한다. 여러 색이면 Illustrations 묶음에 둔다.',
      );
    }
    checkScaleMode(node, node.asset.scaleMode, add);
    return;
  }
  if (node.fills !== null && node.text === null) {
    if (node.fills === 'mixed') {
      add(node, '칠이 섞여 있다', '칠을 하나로 정한다.');
    } else {
      checkPaints(node, '칠', node.fills, node.fillStyle, fillTypes, add);
    }
  }
  checkStrokes(node, add);
  checkCorners(node, add);
  checkEffects(node, add);
  checkLayout(node, add);
  if (node.text !== null) {
    checkText(node, add);
  }
  if (node.instance !== null && Math.abs(node.instance.scaleFactor - 1) > EPSILON) {
    return;
  }
  for (const child of node.children) {
    checkNode(child, false, add);
  }
}

/**
 * 노드 종류를 검사한다. 자산이 아닌 원·타원·호·별·다각형·선·불리언·벡터와 CSS로 그리지 않는 노드 종류를 막는다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 * @returns 안쪽을 계속 검사하면 true
 */
function checkType(node: NodeData, add: Add): boolean {
  if (shapeTypes.includes(node.type)) {
    add(
      node,
      `${node.type}는 자산이 아닌 도형이라 CSS로 그릴 수 없다`,
      'Foundations 자산(Icons, Shapes, Illustrations, Images)의 컴포넌트로 만들고 인스턴스로 넣는다. 사각형은 그대로 쓸 수 있다.',
    );
    return false;
  }
  if (!drawableTypes.includes(node.type)) {
    add(node, `노드 종류 ${node.type}는 CSS로 그릴 수 없다`, '프레임·사각형·글자로 바꾼다.');
    return false;
  }
  return true;
}

/**
 * 회전과 마스크를 검사한다. 정지 회전은 90도 단위만 허용한다([[디자인 시스템:회전 구현]]).
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkCommon(node: NodeData, add: Add): void {
  const quarter = node.rotation / 90;
  if (Math.abs(quarter - Math.round(quarter)) > EPSILON) {
    add(node, `회전 ${String(node.rotation)}°는 90° 단위가 아니다`, '회전을 90° 단위로 둔다.');
  }
  if (node.isMask) {
    add(node, '마스크는 CSS로 그릴 수 없다', '자르기는 Clip content나 모서리 반경으로 표현한다.');
  }
}

/**
 * 이미지 칠의 맞춤 방식을 검사한다. `FILL`·`FIT`만 CSS `object-fit`으로 옮긴다.
 * @codocs [[디자인 시스템:자산]]
 * @param node 노드
 * @param scaleMode 맞춤 방식. 이미지가 아니면 null
 * @param add 위반을 더하는 함수
 */
function checkScaleMode(node: NodeData, scaleMode: string | null, add: Add): void {
  if (scaleMode !== null && !imageScaleModes.includes(scaleMode)) {
    add(
      node,
      `이미지 칠의 맞춤 방식 ${scaleMode}는 CSS로 옮길 수 없다`,
      '이미지 칠의 맞춤 방식을 Fill이나 Fit으로 바꾼다.',
    );
  }
}

/**
 * 칠·선 목록 하나를 검사한다. 스타일이 없으면 단색은 색 변수에, 그라데이션·여러 칠은 칠 스타일에 연결해야 한다.
 * 블렌드가 들어간 칠, CSS로 그리지 않는 칠 종류, 이름 있는 자산에 없는 이미지, `CROP`·`TILE` 이미지는 스타일 안에 있어도 막는다.
 * @param node 노드
 * @param label 메시지에 쓸 이름(칠·선)
 * @param paints 칠 목록
 * @param style 연결한 스타일 이름
 * @param types CSS로 그리는 칠 종류
 * @param add 위반을 더하는 함수
 */
function checkPaints(
  node: NodeData,
  label: string,
  paints: readonly PaintData[],
  style: string | undefined,
  types: readonly string[],
  add: Add,
): void {
  const visible = paints.filter((paint) => paint.isVisible);
  for (const paint of visible) {
    if (!types.includes(paint.type)) {
      add(
        node,
        `${label} 종류 ${paint.type}는 CSS로 그릴 수 없다`,
        `${label}을 단색이나 칠 스타일로 바꾼다.`,
      );
    }
    if (paint.blendMode !== 'NORMAL') {
      add(
        node,
        `${label}에 블렌드 ${paint.blendMode}가 들어 있다(CSS로 그릴 수 없다)`,
        `${label}의 블렌드를 일반(NORMAL)으로 둔다.`,
      );
    }
    if (paint.type === 'IMAGE') {
      if (paint.imageAsset == null) {
        add(
          node,
          `${label}의 이미지가 이름 있는 이미지 자산에 없다`,
          'Foundations Images 묶음에 이미지 자산 컴포넌트를 만들고, 그 인스턴스를 쓴다.',
        );
      }
      checkScaleMode(node, paint.scaleMode ?? null, add);
    }
  }
  if (style !== undefined) {
    return;
  }
  const [paint] = visible;
  if (visible.length > 1) {
    add(
      node,
      `${label}이 ${String(visible.length)}개인데 스타일에 연결되어 있지 않다`,
      `${label} 스타일로 묶는다.`,
    );
  } else if (paint !== undefined && paint.type !== 'SOLID' && paint.type !== 'IMAGE') {
    add(
      node,
      `${paint.type} ${label}이 스타일에 연결되어 있지 않다`,
      `그라데이션은 ${label} 스타일로만 쓴다.`,
    );
  } else if (paint?.type === 'SOLID' && paint.variable === undefined) {
    add(node, `단색 ${label}이 색 변수에 연결되어 있지 않다`, `${label} 색을 색 ${BIND_FIX}`);
  }
}

/**
 * 선을 검사한다. 선 종류·두께 연결과 점선·가변 두께·브러시 선을 본다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkStrokes(node: NodeData, add: Add): void {
  if (node.strokes === null || !node.strokes.some((paint) => paint.isVisible)) {
    return;
  }
  checkPaints(node, '선', node.strokes, node.strokeStyle, strokeTypes, add);
  if (node.dashPattern.length > 0) {
    add(node, '점선은 CSS로 같게 그릴 수 없다', '실선으로 바꾼다.');
  }
  if (node.hasVariableWidthStroke || node.hasComplexStroke) {
    add(node, '가변 두께·브러시 선은 CSS로 그릴 수 없다', '기본 선으로 바꾼다.');
  }
  for (const [side, weight] of Object.entries(node.strokeWeight ?? {})) {
    requireBound(node, `선 두께(${side})`, weight, 'stroke-width', add);
  }
}

/**
 * 모서리 반경과 모서리 스무딩을 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkCorners(node: NodeData, add: Add): void {
  for (const [corner, radius] of Object.entries(node.radius ?? {})) {
    requireBound(node, `반경(${corner})`, radius, 'radius', add);
  }
  if (node.cornerSmoothing > EPSILON) {
    add(node, '모서리 스무딩은 CSS로 그릴 수 없다', '모서리 스무딩을 0으로 둔다.');
  }
}

/**
 * 효과를 검사한다. 보이는 효과는 효과 스타일에 연결해야 하고, CSS로 그릴 수 없는 효과를 막는다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkEffects(node: NodeData, add: Add): void {
  const visible = (node.effects ?? []).filter((effect) => effect.isVisible);
  if (visible.length > 0 && node.effectStyle === undefined) {
    add(node, '효과가 효과 스타일에 연결되어 있지 않다', '효과를 효과 스타일로 묶는다.');
  }
  for (const effect of visible) {
    if (!effectTypes.includes(effect.type)) {
      add(node, `효과 ${effect.type}는 CSS로 그릴 수 없다`, '효과를 지운다.');
    }
    if (effect.blendMode !== 'NORMAL') {
      add(
        node,
        `효과에 블렌드 ${effect.blendMode}가 들어 있다(CSS로 그릴 수 없다)`,
        '효과 블렌드를 일반(NORMAL)으로 둔다.',
      );
    }
    if (effect.blurType !== undefined && effect.blurType !== 'NORMAL') {
      add(node, `흐림 ${effect.blurType}는 CSS로 그릴 수 없다`, '흐림 종류를 일반으로 둔다.');
    }
    if (effect.isShadowShownBehindNode === true) {
      add(
        node,
        '그림자 "투명한 부분 뒤에도 표시"는 CSS로 그릴 수 없다',
        '효과 스타일에서 이 옵션을 끈다.',
      );
    }
  }
}

/**
 * 자동 배치의 여백과 간격이 변수에 연결됐는지 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkLayout(node: NodeData, add: Add): void {
  const { layout } = node;
  if (layout === null) {
    return;
  }
  if (layout.primaryAlign === 'SPACE_EVENLY' || layout.primaryAlign === 'SPACE_AROUND') {
    add(
      node,
      `주축 정렬 ${layout.primaryAlign}는 스키마 꼴에 없어 내보낼 수 없다`,
      '주축 정렬을 왼쪽·가운데·오른쪽이나 Space between으로 둔다.',
    );
  }
  for (const [side, padding] of Object.entries(layout.padding)) {
    requireBound(node, `여백(${side})`, padding, 'spacing', add);
  }
  const flowChildren = node.children.filter(
    (child) => child.isVisible && child.placement?.positioning !== 'ABSOLUTE',
  );
  if (
    (node.type === 'SLOT' || flowChildren.length > 1) &&
    layout.primaryAlign !== 'SPACE_BETWEEN'
  ) {
    requireBound(node, '간격', layout.itemSpacing, 'spacing', add);
  }
  if (layout.wrap === 'WRAP' && layout.counterAxisSpacing !== null) {
    requireBound(node, '줄 간격', layout.counterAxisSpacing, 'spacing', add);
  }
}

/**
 * 글자 노드를 검사한다. 글자 스타일 연결과 덮어쓰기, 글자 스타일이 둘 이상 섞인 것, 글자 칠, OpenType 기능, 빠진 글꼴을 본다.
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
  const styles = new Set(text.segments.map((segment) => segment.textStyle ?? ''));
  if (styles.size > 1) {
    add(
      node,
      `글자 레이어 하나에 글자 스타일이 ${String(styles.size)}개 섞여 있다`,
      '글자 레이어 하나에는 글자 스타일 하나만 쓴다. 어느 낱말이 굵은지는 내용이 정한다.',
    );
  }
  for (const segment of text.segments) {
    const label = `"${segment.characters.slice(0, 12)}" 구간`;
    if (segment.textStyle === undefined) {
      add(node, `${label}에 글자 스타일이 없다`, '구간을 글자 스타일에 연결한다.');
    }
    if (segment.overrides.length > 0) {
      add(
        node,
        `${label}이 글자 스타일을 덮어썼다(${segment.overrides.join(', ')})`,
        '덮어쓴 값을 지우거나 새 글자 스타일을 만든다.',
      );
    }
    checkPaints(node, `${label} 글자 칠`, segment.fills, segment.fillStyle, fillTypes, add);
    if (segment.hasOpenTypeFeatures) {
      add(node, `${label}에 OpenType 기능이 켜져 있다`, 'OpenType 기능을 끈다.');
    }
  }
}

/**
 * 인스턴스 안 레이어의 칠·선·효과·불투명도가 원본과 값이 다른 덮어쓰기를 막는다(읽을 때 값이 같은 기록은 이미 뺐다).
 * 자산 인스턴스(와 그 안쪽)의 색, 자산 인스턴스 전체의 불투명도는 허용한다. 글자·아이콘 교체·불리언·변형 고르기는
 * 모양 필드가 아니라 여기 오지 않는다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param root 변형 루트
 * @param add 위반을 더하는 함수
 */
function checkInstanceOverrides(root: NodeData, add: Add): void {
  const nodes = [root, ...descendants(root)];
  const assets = nodes.filter((node) => node.asset !== null);
  for (const owner of nodes) {
    for (const override of owner.instance?.overrides ?? []) {
      const target = nodes.find((node) => node.id === override.id);
      const asset = assets.find(
        (node) => node.id === override.id || override.id.startsWith(`${node.id};`),
      );
      const isAssetItself = asset !== undefined && asset.id === override.id;
      const blocked = override.fields.filter(
        (field) =>
          !(asset !== undefined && assetColorFields.includes(field)) &&
          !(isAssetItself && assetOpacityFields.includes(field)),
      );
      if (blocked.length === 0) {
        continue;
      }
      const labels = [
        ...new Set(
          blocked.map(
            (field) => appearanceLabels[field.replace(/^boundVariables\./u, '')] ?? field,
          ),
        ),
      ];
      const list = labels.join('·');
      add(
        target ?? asset ?? owner,
        `인스턴스의 ${list}${objectParticle(list)} 원본과 다르게 바꿨다(${blocked.join(', ')})`,
        `덮어쓰기를 되돌리고, ${owner.instance?.component ?? '원본 컴포넌트'}에 변형이나 속성을 열어 그것을 고른다.`,
      );
    }
  }
}

/**
 * 입력이나 동작의 역할이 되는 레이어(컴포넌트 속성에 묶인 레이어)끼리 이름이 같은지 본다.
 * 그 밖의 레이어와 슬롯 안의 견본 내용은 이름이 겹쳐도 막지 않는다.
 * 동작의 종류가 이름으로 찾는 역할 레이어는 checkRoles가 함께 본다.
 * @codocs [[디자인 시스템:구조 검사]]
 * @param root 변형 루트
 * @param add 위반을 더하는 함수
 */
function checkDuplicatedRoles(root: NodeData, add: Add): void {
  reportDuplicates(
    ownLayers(root).filter((node) => Object.keys(node.propertyRefs).length > 0),
    add,
  );
}

/**
 * 역할 레이어 목록에서 이름이 겹치는 것을 알린다.
 * @param layers 역할 레이어
 * @param add 위반을 더하는 함수
 */
function reportDuplicates(layers: readonly NodeData[], add: Add): void {
  const byName = new Map<string, NodeData[]>();
  for (const layer of layers) {
    const list = byName.get(layer.name) ?? [];
    if (!list.some((item) => item.key === layer.key)) {
      list.push(layer);
    }
    byName.set(layer.name, list);
  }
  for (const [name, list] of byName) {
    const [, second] = list;
    if (second !== undefined) {
      add(
        second,
        `입력이나 동작의 역할이 되는 레이어 \`${name}\`가 ${String(list.length)}개다`,
        '역할 레이어의 이름을 서로 다르게 짓는다(클래스 이름은 레이어 자리로 짓는다).',
      );
    }
  }
}

/**
 * 변형의 상태 이름에 낱말 표에 없는 낱말이 있는지 본다. 동작의 종류가 없으면 낱말을 옮길 표가 없어 막는다.
 * @codocs [[디자인 시스템:상태]]
 * @codocs [[디자인 시스템:구조 검사]]
 * @param component 컴포넌트
 * @param variant 변형
 * @param where 위치
 * @param spec 동작의 종류. 적히지 않았거나 등록부에 없으면 undefined
 * @returns 위반 목록
 */
function checkStateWords(
  component: ComponentData,
  variant: VariantData,
  where: string,
  spec: BehaviorSpec | undefined,
): Violation[] {
  const state = variant.values[STATE_AXIS];
  if (state === undefined || (component.behavior !== null && spec === undefined)) {
    return [];
  }
  if (spec === undefined) {
    return [
      {
        where,
        reason: `${STATE_AXIS} 축이 있는데 동작의 종류가 적혀 있지 않아 상태 낱말을 옮길 표가 없다`,
        fix: '컴포넌트 세트에 Interaction 주석으로 동작의 종류를 적는다.',
        nodeId: variant.nodeId,
      },
    ];
  }
  return stateWordsOf(state)
    .filter((word) => findStateWord(spec, word) === undefined)
    .map(
      /**
       * 표에 없는 낱말 하나를 위반으로 옮긴다.
       * @param word 상태 낱말
       * @returns 위반
       */
      (word) => ({
        where,
        reason: `상태 낱말 \`${word}\`가 동작의 종류 \`${spec.name}\`의 낱말 표에 없다`,
        fix: '낱말 표에 있는 낱말로 상태 이름을 고치거나, 종류의 낱말 표에 낱말을 더한다.',
        nodeId: variant.nodeId,
      }),
    );
}

/**
 * 종류가 요구하는 역할 레이어가 변형에 있는지 보고, 이름으로 찾는 역할 레이어끼리 이름이 겹치는지 본다.
 * 표시 레이어(indicator)는 켜짐과 꺼짐 축이 켜진 변형에서, 꺼진 짝 변형에는 없는 레이어가 있어야 한다.
 * @codocs [[디자인 시스템:동작의 종류]]
 * @codocs [[디자인 시스템:구조 검사]]
 * @param component 컴포넌트
 * @param variant 변형
 * @param where 위치
 * @param spec 동작의 종류
 * @returns 위반 목록
 */
function checkRoles(
  component: ComponentData,
  variant: VariantData,
  where: string,
  spec: BehaviorSpec,
): Violation[] {
  const violations: Violation[] = [];
  const layers = ownLayers(variant.root);
  const named: NodeData[] = [];
  for (const role of spec.roles) {
    const found = layers.filter((node) => matchesSelector(node, role.selector));
    if (role.selector.kind === 'layer-name' || role.selector.kind === 'nested-behavior') {
      named.push(...found);
    }
    const isMissing =
      role.selector.kind === 'indicator'
        ? isIndicatorMissing(component, variant, layers)
        : role.selector.kind !== 'root' && found.length === 0;
    if (role.isRequired && isMissing) {
      violations.push({
        where,
        reason: `동작의 종류 \`${spec.name}\`가 요구하는 \`${role.role}\` 역할 레이어(${selectorText(role.selector)})가 없다`,
        fix: '종류가 요구하는 레이어를 변형에 그리거나, 맞는 종류를 고른다.',
        nodeId: variant.nodeId,
      });
    }
  }
  reportDuplicates(named, (node, reason, fix) => {
    violations.push({ where: `${where} / ${node.key}`, reason, fix, nodeId: node.id });
  });
  return violations;
}

/**
 * 레이어가 역할의 선택자에 맞는지 본다. 표시 레이어는 변형끼리 견줘야 해서 여기서는 맞지 않는다.
 * @param node 레이어
 * @param selector 역할의 선택자
 * @returns 맞으면 true
 */
function matchesSelector(node: NodeData, selector: RoleSelector): boolean {
  switch (selector.kind) {
    case 'root':
      return node.key === '';
    case 'text-property':
      return node.propertyRefs.characters !== undefined;
    case 'swap-property':
      return node.propertyRefs.mainComponent !== undefined;
    case 'layer-name':
      return selector.names.includes(node.name);
    case 'nested-behavior':
      return node.instance?.componentBehavior === selector.behavior;
    case 'indicator':
      return false;
  }
}

/**
 * 켜진 변형에 표시 레이어(꺼진 짝 변형에는 없는 레이어)가 없는지 본다. 켜진 변형이 아니거나 꺼진 짝이 없으면 보지 않는다.
 * @param component 컴포넌트
 * @param variant 변형
 * @param layers 변형에 바로 놓인 레이어
 * @returns 표시 레이어가 없으면 true
 */
function isIndicatorMissing(
  component: ComponentData,
  variant: VariantData,
  layers: readonly NodeData[],
): boolean {
  for (const [axis, value] of Object.entries(variant.values)) {
    const pair = ON_OFF_VALUE_PAIRS.find(([on]) => on.toLowerCase() === value.toLowerCase());
    if (pair === undefined) {
      continue;
    }
    const off = component.variants.find(
      /**
       * 켜짐 축만 꺼진 값이고 다른 축은 같은 변형인지 본다.
       * @param other 다른 변형
       * @returns 꺼진 짝이면 true
       */
      (other) =>
        Object.entries(variant.values).every(([name, own]) =>
          name === axis
            ? other.values[name]?.toLowerCase() === pair[1].toLowerCase()
            : other.values[name] === own,
        ),
    );
    if (off === undefined) {
      continue;
    }
    const offKeys = new Set(ownLayers(off.root).map((node) => node.key));
    return !layers.some((node) => !offKeys.has(node.key));
  }
  return false;
}

/**
 * 선택자를 메시지 글로 옮긴다.
 * @param selector 역할의 선택자
 * @returns 설명
 */
function selectorText(selector: RoleSelector): string {
  switch (selector.kind) {
    case 'root':
      return '변형 루트';
    case 'text-property':
      return '글자 속성에 묶인 글자';
    case 'swap-property':
      return '인스턴스 교체 속성에 묶인 레이어';
    case 'indicator':
      return '켜진 변형에만 있는 표시 레이어';
    case 'layer-name':
      return `이름 ${selector.names.map((name) => `\`${name}\``).join('·')}`;
    case 'nested-behavior':
      return `종류가 \`${selector.behavior}\`인 컴포넌트의 인스턴스`;
  }
}

/**
 * 변형에 바로 놓인 레이어를 모은다. 품은 인스턴스 안쪽과 슬롯 안의 견본 내용은 뺀다.
 * @param root 변형 루트
 * @returns 레이어(루트 포함)
 */
function ownLayers(root: NodeData): NodeData[] {
  const result: NodeData[] = [];
  /**
   * 레이어를 모은다.
   * @param node 노드
   */
  function walk(node: NodeData): void {
    result.push(node);
    if (node.instance !== null || node.type === 'SLOT') {
      return;
    }
    for (const child of node.children) {
      walk(child);
    }
  }
  walk(root);
  return result;
}

/**
 * 노드 아래 모든 노드를 모은다.
 * @param node 노드
 * @returns 자손 노드
 */
function descendants(node: NodeData): NodeData[] {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

/**
 * 기본값이 아닌 값이면 변수 연결을 요구한다.
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
      `${label}을 ${collection} ${BIND_FIX}`,
    );
  }
}

/**
 * 낱말 뒤에 붙는 목적격 조사(을/를)를 고른다.
 * @param word 낱말
 * @returns 받침이 있으면 '을', 없으면 '를'
 */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? '을' : '를';
}

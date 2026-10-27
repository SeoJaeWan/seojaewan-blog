import type { Bound, NodeData, PaintData } from './node-data';

// 내보내기 전 구조 검사. 컴포넌트·조립의 변형에서 세 가지만 막는다.
// 1. 변수·스타일에 연결되지 않은 시각 값(토큰 클래스로 쓸 수 없는 값 포함)
// 2. CSS로 그릴 수 없는 피그마 기능
// 3. 인스턴스 모양(칠·선·효과·불투명도)의 직접 덮어쓰기
// 5번(변형을 자르는 조상)은 변형 트리가 아니라 대상의 조상을 보므로 checkClippingAncestors가 대상마다 한 번 검사한다.
// 4번(모션 변수 값이 아닌 키프레임 시간·지연, 변수에 연결되지 않은 키프레임 이징)은 모션 견본을 보는 check-motion.ts에 있다.
// 나머지 작성 규칙은 리뷰와 캡처 표로 지킨다.

/** 위반 하나 */
export type Violation = {
  /** 컴포넌트·변형·레이어 경로 */
  where: string;
  /** 무엇이 문제인지 */
  reason: string;
  /** 어떻게 고치는지 */
  fix: string;
};

type Add = (node: NodeData, reason: string, fix: string) => void;

/** 검사에 쓰는 파일 정보 */
export type CheckContext = {
  /** 이름 있는 이미지 자산(Foundations `group/Images`)의 이미지 해시 */
  imageHashes: ReadonlySet<string>;
};

// 반올림 오차로 본 값의 차이다.
const EPSILON = 1e-6;
// 자산이 아니면 막는 모양(호가 아닌 완전한 원과 사각형만 CSS로 그린다)
const SHAPE_TYPES = ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'LINE', 'ELLIPSE'] as const;
// CSS로 그리는 노드 종류
const DRAWABLE_TYPES = [
  'FRAME',
  'GROUP',
  'COMPONENT',
  'INSTANCE',
  'SLOT',
  'RECTANGLE',
  'ELLIPSE',
  'TEXT',
] as const;
// CSS로 그리는 칠 종류. 그라데이션과 이미지는 칠 스타일로만 쓴다.
const FILL_TYPES = [
  'SOLID',
  'GRADIENT_LINEAR',
  'GRADIENT_RADIAL',
  'GRADIENT_ANGULAR',
  'IMAGE',
] as const;
// CSS로 그리는 선 종류. 그라데이션 선은 칠 스타일로만 쓴다.
const STROKE_TYPES = ['SOLID', 'GRADIENT_LINEAR'] as const;
// CSS로 그리는 효과 종류. 효과는 효과 스타일로만 쓴다.
const EFFECT_TYPES = ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'] as const;

// 한글 음절·자모(호환 자모·확장 자모 포함) 범위
const HANGUL_PATTERN = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF]/u;
// 한글을 그리는 글꼴
const HANGUL_FONT_FAMILY = 'Pretendard';

const BIND_FIX = '변수에 연결한다.';

/**
 * 변형 하나의 구조를 검사한다. 숨긴 노드는 이미 빠져 있다.
 * 막는 것은 변수·스타일에 연결되지 않은 시각 값, CSS로 그릴 수 없는 기능, 인스턴스 모양의 직접 덮어쓰기 세 가지다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param root 변형 루트 노드 데이터
 * @param where 위치 접두어(`Button / Style=Accent, State=Rest`)
 * @param context 이름 있는 이미지 자산
 * @returns 위반 목록(모두)
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
  checkInstanceOverrides(root, add);
  return violations;
}

/** 내보내는 변형의 조상 하나. 컴포넌트 세트의 변형이면 세트가 가장 가까운 조상이다 */
export type AncestorData = {
  name: string;
  /** 피그마 노드 종류(`FRAME`, `COMPONENT_SET` 등) */
  type: string;
  /** 내용 자르기(Clip content). 이 속성이 없는 노드(그룹·섹션)는 false */
  clipsContent: boolean;
};

// 메시지에 쓰는 조상 종류 이름
const ancestorKinds: Readonly<Record<string, string>> = {
  FRAME: '프레임',
  COMPONENT_SET: '컴포넌트 세트',
  COMPONENT: '컴포넌트',
  INSTANCE: '인스턴스',
};

/**
 * 내보내는 변형을 자르는 조상을 막는다. 피그마는 노드를 PNG로 내보낼 때 조상의 내용 자르기를 적용해,
 * 변형의 그림자와 변형 밖으로 나온 자식이 PNG에서 빠진다. 한 대상의 변형은 모두 같은 조상 아래에 있으므로
 * 변형마다가 아니라 대상마다 한 번, 자르는 조상마다 위반 하나를 낸다.
 * 페이지와 섹션은 자르지 않는다. 변형 자신의 자르기는 보지 않는다(자기 그림자는 자기 자르기에 잘리지 않는다).
 * @codocs [[피그마 연동:구조 검사]]
 * @param target 대상 이름(컴포넌트 세트, 단독 컴포넌트, 조립)
 * @param ancestors 변형의 조상(페이지 아래 가장 바깥부터 가장 가까운 것까지)
 * @returns 위반 목록(자르는 조상마다 하나)
 */
export function checkClippingAncestors(
  target: string,
  ancestors: readonly AncestorData[],
): Violation[] {
  const violations: Violation[] = [];
  for (const [index, ancestor] of ancestors.entries()) {
    if (!ancestor.clipsContent || ancestor.type === 'SECTION' || ancestor.type === 'PAGE') {
      continue;
    }
    const kind = ancestorKinds[ancestor.type] ?? ancestor.type;
    const path = ancestors
      .slice(0, index + 1)
      .map((item) => item.name)
      .join(' / ');
    violations.push({
      where: `${target} (모든 변형)`,
      reason: `조상 ${kind} \`${path}\`의 Clip content가 켜져 있어 PNG에서 변형의 그림자와 변형 밖으로 나온 자식이 잘린다`,
      fix: `${kind} \`${ancestor.name}\`의 Clip content를 끈다.`,
    });
  }
  return violations;
}

// 인스턴스에서 직접 덮어쓰면 막는 모양 필드(`NodeChangeProperty`) → 메시지 이름
const appearanceFields: Readonly<Record<string, string>> = {
  fills: '칠',
  strokes: '선',
  strokeWeight: '선 두께',
  // 피그마 타입 정의의 철자 그대로다(strokeTopWeight가 아니다).
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

// 변수 연결(`boundVariables`)을 바꿨을 때 막는 모양 필드 → 메시지 이름
const appearanceBindings: Readonly<Record<string, string>> = {
  fills: '칠 변수',
  strokes: '선 변수',
  strokeWeight: '선 두께 변수',
  strokeTopWeight: '선 두께 변수',
  strokeRightWeight: '선 두께 변수',
  strokeBottomWeight: '선 두께 변수',
  strokeLeftWeight: '선 두께 변수',
  effects: '효과 변수',
  opacity: '불투명도 변수',
};

// 자산 인스턴스에서 막지 않는 색 필드(`fields`와 `boundVariables.<필드>` 표기)
const assetColorFields: ReadonlySet<string> = new Set([
  'fills',
  'strokes',
  'fillStyleId',
  'strokeStyleId',
  'boundVariables.fills',
  'boundVariables.strokes',
]);

/**
 * 레이어 ID가 자산 인스턴스의 안쪽 레이어인지 확인한다(자산 ID 뒤에 `;`로 이어진다).
 * @param id 레이어 ID
 * @param assetIds 자산 인스턴스 ID
 * @returns 안쪽이면 true
 */
function isInsideAsset(id: string, assetIds: ReadonlySet<string>): boolean {
  for (const assetId of assetIds) {
    if (id.startsWith(`${assetId};`)) {
      return true;
    }
  }
  return false;
}

/** 덮어쓰기를 검사할 수 있는 레이어 */
type OverrideTarget = {
  node: NodeData;
  /** 이 레이어를 정의한 원본 컴포넌트(자신이나 가장 가까운 바깥 인스턴스의 원본) */
  component: string;
};

/**
 * 인스턴스 모양의 직접 덮어쓰기를 막는다. 변형 안 모든 인스턴스(중첩 포함)의 덮어쓰기를 모아,
 * 칠·선·선 두께·효과·불투명도와 그 스타일·변수 연결을 바꾼 레이어를 알린다.
 * 원본이 속성으로 연 것(글자, 표시 여부, 인스턴스 교체, 변형 선택)과 크기·배치는 막지 않는다.
 * 예외로 막지 않는 것:
 * - 자산 인스턴스의 색 덮어쓰기(어디에 놓였든). 자산 안쪽 레이어의 덮어쓰기는 모두, 자산 인스턴스 자체는 칠·선과 그 스타일·변수 연결만 허용한다.
 *   색은 쓰는 곳이 정하고, 토큰에 없는 색은 구조 검사 1번(자산의 색 변수 연결)이 막는다.
 * - 직접 놓은 인스턴스 전체의 불투명도(`opacity`와 그 변수 연결). 안쪽 레이어나 다른 인스턴스 안에 든 인스턴스의 불투명도는 막는다.
 * 숨긴 레이어와 줄인 인스턴스(`scaleFactor`가 1이 아님)의 안쪽은 보지 않는다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param root 변형 루트 노드 데이터
 * @param add 위반을 더하는 함수
 */
function checkInstanceOverrides(root: NodeData, add: Add): void {
  const targets = new Map<string, OverrideTarget>();
  const fieldsById = new Map<string, Set<string>>();
  // 자산 인스턴스 ID. 자산은 안쪽 레이어를 읽지 않으므로 ID 접두어(`<자산 ID>;`)로 안쪽 덮어쓰기를 알아본다.
  const assetIds = new Set<string>();
  /**
   * 레이어를 모으고 인스턴스의 덮어쓰기를 합친다. 같은 덮어쓰기를 바깥·안쪽 인스턴스가 함께 알려 줄 수 있어 합친다.
   * @param node 노드
   * @param component 바깥 인스턴스의 원본 컴포넌트, 없으면 null
   */
  function collect(node: NodeData, component: string | null): void {
    const { instance } = node;
    const owner = instance?.component ?? component;
    if (owner !== null) {
      targets.set(node.id, { node, component: owner });
    }
    if (node.asset !== null) {
      assetIds.add(node.id);
    }
    if (instance === null) {
      for (const child of node.children) {
        collect(child, component);
      }
      return;
    }
    const isScaled = Math.abs(instance.scaleFactor - 1) > EPSILON;
    for (const override of instance.overrides) {
      if (isScaled && override.id !== node.id) {
        continue;
      }
      // 직접 놓은 인스턴스 전체의 불투명도는 쓰는 곳이 정한다.
      const isOwnOpacity = override.id === node.id && component === null;
      const fields = fieldsById.get(override.id) ?? new Set<string>();
      for (const field of override.fields) {
        if (appearanceFields[field] !== undefined && !(isOwnOpacity && field === 'opacity')) {
          fields.add(field);
        }
      }
      for (const field of override.changedBindings) {
        if (appearanceBindings[field] !== undefined && !(isOwnOpacity && field === 'opacity')) {
          fields.add(`boundVariables.${field}`);
        }
      }
      fieldsById.set(override.id, fields);
    }
    if (!isScaled) {
      for (const child of node.children) {
        collect(child, instance.component);
      }
    }
  }
  collect(root, null);
  for (const [id, fields] of fieldsById) {
    const target = targets.get(id);
    if (target === undefined || fields.size === 0 || isInsideAsset(id, assetIds)) {
      continue;
    }
    if (assetIds.has(id)) {
      for (const field of [...fields]) {
        if (assetColorFields.has(field)) {
          fields.delete(field);
        }
      }
      if (fields.size === 0) {
        continue;
      }
    }
    const names = [...fields].sort();
    const labels = [
      ...new Set(
        names.map((field) =>
          field.startsWith('boundVariables.')
            ? appearanceBindings[field.slice('boundVariables.'.length)]
            : appearanceFields[field],
        ),
      ),
    ].filter((label) => label !== undefined);
    const list = labels.join('·');
    add(
      target.node,
      `인스턴스의 ${list}${objectParticle(list)} 직접 바꿨다(${names.join(', ')})`,
      `덮어쓰기를 되돌리고, ${target.component}에 변형이나 속성을 열어 그것을 고른다.`,
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

/**
 * 노드 하나와 그 아래를 검사한다. 줄인 인스턴스(`scaleFactor`가 1이 아님)의 안쪽은 건너뛴다.
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param context 이름 있는 이미지 자산
 * @param add 위반을 더하는 함수
 */
function checkNode(node: NodeData, isRoot: boolean, context: CheckContext, add: Add): void {
  if (!isRoot && !checkType(node, add)) {
    return;
  }
  checkCommon(node, add);
  checkSizes(node, isRoot, add);
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
  if (node.fills !== null && node.text === null) {
    if (node.fills === 'mixed') {
      add(node, '칠이 섞여 있다', '칠을 하나로 정한다.');
    } else {
      checkPaints(node, '칠', node.fills, node.fillStyle, FILL_TYPES, context, add);
    }
  }
  checkStrokes(node, context, add);
  checkCorners(node, add);
  checkEffects(node, add);
  checkLayout(node, add);
  if (node.text !== null) {
    checkText(node, context, add);
  }
  // 줄인 인스턴스는 자기만 검사한다. 안쪽은 따로 검사받는 조립이고, 줄인 값은 CSS `scale`로 만들어진다.
  if (node.instance !== null && Math.abs(node.instance.scaleFactor - 1) > EPSILON) {
    return;
  }
  for (const child of node.children) {
    checkNode(child, false, context, add);
  }
}

/**
 * 노드 종류를 검사한다. 자산이 아닌 호·별·다각형·선·불리언·벡터와 CSS로 그리지 않는 노드 종류를 막는다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 * @returns 안쪽을 계속 검사하면 true
 */
function checkType(node: NodeData, add: Add): boolean {
  if (
    isOneOf(SHAPE_TYPES, node.type) &&
    !(node.type === 'ELLIPSE' && node.isFullEllipse === true)
  ) {
    add(
      node,
      `${node.type === 'ELLIPSE' ? '호' : node.type}는 CSS로 그릴 수 없는 모양이다`,
      'Foundations 자산 묶음(Icons, Shapes, Illustrations, Images)의 컴포넌트로 만들고 인스턴스로 넣는다. 완전한 원과 사각형은 그대로 쓸 수 있다.',
    );
    return false;
  }
  if (!isOneOf(DRAWABLE_TYPES, node.type)) {
    add(node, `노드 종류 ${node.type}는 CSS로 그릴 수 없다`, '프레임·사각형·글자로 바꾼다.');
    return false;
  }
  return true;
}

/**
 * 불투명도·회전·제약·마스크를 검사한다.
 * @param node 노드
 * @param add 위반을 더하는 함수
 */
function checkCommon(node: NodeData, add: Add): void {
  requireBound(node, '불투명도', node.opacity, 'opacity', add, 1);
  const quarter = node.rotation / 90;
  if (Math.abs(quarter - Math.round(quarter)) > EPSILON) {
    add(
      node,
      `회전 ${String(node.rotation)}°는 90° 배수가 아니라 토큰 클래스로 쓸 수 없다`,
      '회전을 90° 배수로 둔다.',
    );
  }
  const { child } = node;
  const isConstrained =
    child !== null && (node.parentLayoutMode === null || child.positioning === 'ABSOLUTE');
  if (
    isConstrained &&
    (child.constraints.horizontal === 'SCALE' || child.constraints.vertical === 'SCALE')
  ) {
    add(
      node,
      '비례 제약(SCALE)은 토큰 클래스로 쓸 수 없다',
      '제약을 왼쪽·오른쪽·양쪽·가운데 중 하나로 둔다.',
    );
  }
  if (node.isMask) {
    add(node, '마스크는 CSS로 그릴 수 없다', '자르기는 clipsContent나 모서리 반경으로 표현한다.');
  }
}

/**
 * 칠·선 목록 하나를 검사한다. 스타일이 없으면 단색은 색 변수에, 그라데이션·이미지·여러 칠은 칠 스타일에 연결해야 한다.
 * 블렌드가 들어간 칠, CSS로 그리지 않는 칠 종류, 이름 있는 자산에 없는 이미지는 스타일 안에 있어도 막는다.
 * @param node 노드
 * @param label 메시지에 쓸 이름(칠·선)
 * @param paints 칠 목록
 * @param style 연결한 스타일 이름
 * @param types CSS로 그리는 칠 종류
 * @param context 이름 있는 이미지 자산
 * @param add 위반을 더하는 함수
 */
function checkPaints(
  node: NodeData,
  label: string,
  paints: readonly PaintData[],
  style: string | undefined,
  types: readonly string[],
  context: CheckContext,
  add: Add,
): void {
  const visible = paints.filter((paint) => paint.visible);
  for (const paint of visible) {
    if (!isOneOf(types, paint.type)) {
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
    if (paint.type === 'IMAGE' && !context.imageHashes.has(paint.imageHash ?? '')) {
      add(
        node,
        `${label}의 이미지가 이름 있는 이미지 자산에 없다`,
        'Foundations Images 묶음에 이미지 자산 컴포넌트를 만들고, 그 인스턴스나 같은 이미지의 칠 스타일을 쓴다.',
      );
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
  } else if (paint !== undefined && paint.type !== 'SOLID') {
    add(
      node,
      `${paint.type} ${label}이 스타일에 연결되어 있지 않다`,
      `그라데이션과 이미지는 ${label} 스타일로만 쓴다.`,
    );
  } else if (paint !== undefined && paint.variable === undefined) {
    add(node, `단색 ${label}이 색 변수에 연결되어 있지 않다`, `${label} 색을 색 ${BIND_FIX}`);
  }
}

/**
 * 선을 검사한다. 선 종류·두께 연결과 점선·가변 두께·브러시 선을 본다.
 * @param node 노드
 * @param context 이름 있는 이미지 자산
 * @param add 위반을 더하는 함수
 */
function checkStrokes(node: NodeData, context: CheckContext, add: Add): void {
  if (node.strokes === null || !node.strokes.some((paint) => paint.visible)) {
    return;
  }
  checkPaints(node, '선', node.strokes, node.strokeStyle, STROKE_TYPES, context, add);
  if (node.dashPattern.length > 0) {
    add(node, '점선은 CSS로 같게 그릴 수 없다', '실선으로 바꾼다.');
  }
  if (node.variableWidthStroke || node.complexStroke) {
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
  const visible = (node.effects ?? []).filter((effect) => effect.visible);
  if (visible.length > 0 && node.effectStyle === undefined) {
    add(node, '효과가 효과 스타일에 연결되어 있지 않다', '효과를 효과 스타일로 묶는다.');
  }
  for (const effect of visible) {
    if (!isOneOf(EFFECT_TYPES, effect.type)) {
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
    if (effect.showShadowBehindNode === true) {
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
  if (layout === null || layout.mode === 'NONE') {
    return;
  }
  for (const [side, padding] of Object.entries(layout.padding)) {
    requireBound(node, `여백(${side})`, padding, 'spacing', add);
  }
  const flowChildren = node.children.filter((child) => child.child?.positioning !== 'ABSOLUTE');
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
 * 고정 크기와 최소·최대 크기가 변수에 연결됐는지 검사한다.
 * 양쪽 제약(STRETCH)인 축의 크기는 제약이 정하는 값이라 검사하지 않는다.
 * 배율 인스턴스(`scaleFactor`가 1이 아님) 자체의 고정 너비·높이는 검사하지 않는다.
 * 배율이 고정일 수도 칸에 맞춘 값일 수도 있어 결과 크기가 토큰이 아닐 수 있고, 피그마는 배율 인스턴스의 크기를 변수에 연결하면 배율을 풀기 때문이다. 크기는 그것을 담는 칸이 변수로 지킨다.
 * @codocs [[피그마 연동:구조 검사]]
 * @param node 노드
 * @param isRoot 변형 루트인지
 * @param add 위반을 더하는 함수
 */
function checkSizes(node: NodeData, isRoot: boolean, add: Add): void {
  const { horizontal, vertical } = sizingOf(node, isRoot);
  if (node.instance === null || Math.abs(node.instance.scaleFactor - 1) <= EPSILON) {
    checkFixedSizes(node, horizontal, vertical, add);
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
        `${label}를 size ${BIND_FIX}`,
      );
    }
  }
}

/**
 * 배율이 1인 노드의 고정 너비·높이가 크기 변수에 연결됐는지 검사한다.
 * @param node 노드
 * @param horizontal 가로 크기 방식
 * @param vertical 세로 크기 방식
 * @param add 위반을 더하는 함수
 */
function checkFixedSizes(node: NodeData, horizontal: string, vertical: string, add: Add): void {
  if (horizontal === 'FIXED' && node.width.variable === undefined) {
    add(
      node,
      `고정 너비 ${String(node.width.value)}가 크기 변수에 연결되어 있지 않다`,
      '너비를 size 변수에 연결하거나 HUG·FILL로 바꾼다.',
    );
  }
  if (vertical === 'FIXED' && node.height.variable === undefined) {
    add(
      node,
      `고정 높이 ${String(node.height.value)}가 크기 변수에 연결되어 있지 않다`,
      '높이를 size 변수에 연결하거나 HUG·FILL로 바꾼다.',
    );
  }
}

/**
 * 노드 자신의 자동 배치가 정하는 가로·세로 크기 방식을 돌려준다. 자동 배치가 없으면 둘 다 FIXED다.
 * @param node 노드
 * @returns 가로·세로 크기 방식(FIXED, HUG)
 */
function ownSizing(node: NodeData): { horizontal: string; vertical: string } {
  if (node.layout === null || node.layout.mode === 'NONE') {
    return { horizontal: 'FIXED', vertical: 'FIXED' };
  }
  const isRow = node.layout.mode === 'HORIZONTAL';
  const primary = node.layout.primarySizing === 'AUTO' ? 'HUG' : 'FIXED';
  const counter = node.layout.counterSizing === 'AUTO' ? 'HUG' : 'FIXED';
  return { horizontal: isRow ? primary : counter, vertical: isRow ? counter : primary };
}

/**
 * 노드의 가로·세로 크기 방식을 정한다. 루트와 부모 자동 배치에서 크기를 받지 않는 노드는 자기 자동 배치 축 크기 방식, 자동 배치 안의 자식은 layoutSizing, 글자는 자동 크기를 따른다.
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
  const own = ownSizing(node);
  if (isRoot) {
    horizontal = own.horizontal;
    vertical = own.vertical;
  } else if (node.child !== null) {
    if (node.parentLayoutMode !== null && node.child.positioning !== 'ABSOLUTE') {
      horizontal = node.child.sizingHorizontal;
      vertical = node.child.sizingVertical;
    } else {
      // 부모 자동 배치에서 크기를 받지 않는 노드는 루트처럼 자기 자동 배치의 내용 맞춤 축을 HUG로 본다.
      // 양쪽 늘이기(STRETCH) 축은 내용 맞춤이어도 크기를 부모 제약이 정하므로 DERIVED가 먼저다.
      horizontal = node.child.constraints.horizontal === 'STRETCH' ? 'DERIVED' : own.horizontal;
      vertical = node.child.constraints.vertical === 'STRETCH' ? 'DERIVED' : own.vertical;
    }
  }
  if (node.text !== null) {
    if (node.text.autoResize === 'WIDTH_AND_HEIGHT') {
      horizontal = 'HUG';
      vertical = 'HUG';
    } else if (node.text.autoResize === 'HEIGHT') {
      vertical = 'HUG';
    }
  }
  return { horizontal, vertical };
}

/**
 * 글자 노드를 검사한다. 구간마다 글자 스타일 연결과 덮어쓰기, 글자 칠, OpenType 기능을 보고, 빠진 글꼴과 한글을 Pretendard가 아닌 글꼴로 그리는 구간을 막는다.
 * @param node 글자 노드
 * @param context 이름 있는 이미지 자산
 * @param add 위반을 더하는 함수
 */
function checkText(node: NodeData, context: CheckContext, add: Add): void {
  const { text } = node;
  if (text === null) {
    return;
  }
  if (text.hasMissingFont) {
    add(node, '글꼴이 없어 대체 글꼴로 그려진다', '글꼴을 설치하거나 글자 스타일의 글꼴을 바꾼다.');
  }
  for (const segment of text.segments) {
    const label = `"${segment.characters.slice(0, 12)}" 구간`;
    // hasMissingFont가 false여도 피그마가 한글을 알 수 없는 대체 글꼴로 그리는 경우가 있어 구간 글꼴로 막는다.
    if (HANGUL_PATTERN.test(segment.characters) && segment.fontFamily !== HANGUL_FONT_FAMILY) {
      add(
        node,
        `${label}에 한글이 있는데 글꼴이 ${segment.fontFamily ?? '알 수 없음'}라 대체 글꼴로 그려질 수 있다`,
        `한글 구간에 Hangul 글자 스타일(${HANGUL_FONT_FAMILY})을 입힌다.`,
      );
    }
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
    checkPaints(
      node,
      `${label} 글자 칠`,
      segment.fills,
      segment.fillStyle,
      FILL_TYPES,
      context,
      add,
    );
    if (segment.hasOpenTypeFeatures) {
      add(node, `${label}에 OpenType 기능이 켜져 있다`, 'OpenType 기능을 끈다.');
    }
  }
}

/**
 * 기본값이 아닌 값이면 변수 연결을 요구한다.
 * @param node 노드
 * @param label 메시지에 쓸 이름
 * @param bound 값과 변수
 * @param collection 연결할 변수 종류(메시지용)
 * @param add 위반을 더하는 함수
 * @param neutral 연결하지 않아도 되는 기본값
 */
function requireBound(
  node: NodeData,
  label: string,
  bound: Bound,
  collection: string,
  add: Add,
  neutral = 0,
): void {
  if (Math.abs(bound.value - neutral) > EPSILON && bound.variable === undefined) {
    add(
      node,
      `${label} ${String(bound.value)}가 변수에 연결되어 있지 않다`,
      `${label}을 ${collection} ${BIND_FIX}`,
    );
  }
}

/**
 * 값이 목록에 있는지 확인한다.
 * @param list 목록
 * @param value 값
 * @returns 있으면 true
 */
function isOneOf(list: readonly string[], value: string): boolean {
  return list.includes(value);
}

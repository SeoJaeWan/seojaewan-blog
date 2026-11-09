import type { AnnotationData, Bound, NodeData, PaintData } from './node-data';

// 조립 보고를 만든다. 조립은 구조 검사를 받지 않고, 내보내기가 막지 않고 보고만 한다([[피그마 연동:피그마 플러그인]]).
// 피그마 API를 쓰지 않는 순수 함수다. 플러그인 화면(ui)과 PR 본문이 같은 글을 쓴다.

/** 색 값(0~1). a는 칠 불투명도다 */
export type ColorValue = { r: number; g: number; b: number; a: number };

/**
 * Foundations 변수 하나의 값. 가까운 토큰을 찾는 데 쓴다.
 * - value: 숫자 변수는 기본 모드 값(별칭을 푼 값), 색 변수는 색
 */
export type TokenValue =
  | { name: string; kind: 'number'; value: number }
  | { name: string; kind: 'color'; value: ColorValue };

/**
 * 조립이 쓴 컴포넌트 하나(같은 컴포넌트·속성끼리 묶는다).
 * - component: 컴포넌트(세트) 이름이나 자산 이름
 * - properties: 변형 속성과 컴포넌트 속성
 * - paths: 놓인 레이어 경로
 */
export type UsedComponent = {
  component: string;
  properties: Record<string, string | boolean>;
  paths: string[];
};

/**
 * 보고 줄 하나.
 * - path: 변형 기준 레이어 경로. 루트는 빈 문자열
 * - nodeId: 피그마 노드 ID("피그마에서 보기")
 * - text: 무엇인지
 */
export type ReportItem = { path: string; nodeId: string; text: string };

/**
 * 변형 하나의 조립 보고.
 * - components: 쓴 컴포넌트와 그 변형·속성
 * - drawn: 컴포넌트 밖에서 그린 것(바탕, 덧칠, 구분선, 글자 등)
 * - offToken: Foundations에 없는 값과 가까운 토큰
 * - displayOnly: Development 주석으로 "표시용"이라고 적은 것. 이 레이어 아래는 다른 항목에 넣지 않는다
 * - motion: 키프레임이 걸린 레이어와 항목
 */
export type PatternReport = {
  components: UsedComponent[];
  drawn: ReportItem[];
  offToken: ReportItem[];
  displayOnly: ReportItem[];
  motion: ReportItem[];
};

/** 키프레임이 걸린 레이어. properties: 키프레임 항목(`OPACITY`, `SCALE_XY` 등) */
export type AnimatedLayer = { path: string; nodeId: string; properties: string[] };

/** "표시용" 주석을 찾는 카테고리와 글 */
const DISPLAY_ONLY_CATEGORY = 'Development';
const DISPLAY_ONLY_TEXT = '표시용';
// 자산이 아닌 그린 모양(사각형·원·벡터 등)
const shapeTypes: readonly string[] = [
  'RECTANGLE',
  'ELLIPSE',
  'VECTOR',
  'LINE',
  'STAR',
  'POLYGON',
  'BOOLEAN_OPERATION',
];
const EPSILON = 1e-6;
// 피그마 불투명도(0~1)를 opacity 변수 값(%)과 비교한다.
const PERCENT = 100;

/**
 * 변형 하나의 조립 보고를 만든다. 인스턴스 안쪽은 컴포넌트의 것이라 보지 않고, 슬롯 안은 조립이 채운 내용이라 본다.
 * 크기(루트, 프레임, 인스턴스에서 덮어쓴 크기)는 조립에서 변수 없는 숫자로 둘 수 있어 보지 않는다([[디자인 시스템:조립]]).
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @codocs [[디자인 시스템:조립]]
 * @param root 변형 루트 노드 데이터
 * @param tokens Foundations 변수 값
 * @param animated 키프레임이 걸린 레이어
 * @returns 조립 보고
 */
export function patternReport(
  root: NodeData,
  tokens: readonly TokenValue[],
  animated: readonly AnimatedLayer[],
): PatternReport {
  const report: PatternReport = {
    components: [],
    drawn: [],
    offToken: [],
    displayOnly: [],
    motion: animated.map(
      /**
       * 키프레임이 걸린 레이어를 보고 줄로 옮긴다.
       * @param layer 키프레임이 걸린 레이어
       */
      (layer) => ({
        path: layer.path,
        nodeId: layer.nodeId,
        text: layer.properties.join(', '),
      }),
    ),
  };
  visit(root, false, tokens, report);
  return report;
}

/**
 * 노드 하나와 그 아래를 보고에 더한다.
 * @param node 노드
 * @param isInsideInstance 인스턴스 안쪽(슬롯 밖)인지
 * @param tokens Foundations 변수 값
 * @param report 보고
 */
function visit(
  node: NodeData,
  isInsideInstance: boolean,
  tokens: readonly TokenValue[],
  report: PatternReport,
): void {
  const displayOnly = displayOnlyNote(node.annotations);
  if (displayOnly !== null) {
    report.displayOnly.push({ path: node.path, nodeId: node.id, text: displayOnly });
    return;
  }
  if (node.instance !== null && !isInsideInstance) {
    addComponent(report.components, node);
  }
  if (!isInsideInstance && node.instance === null && node.type !== 'SLOT') {
    const drawn = drawnParts(node);
    if (drawn.length > 0) {
      report.drawn.push({ path: node.path, nodeId: node.id, text: drawn.join('·') });
    }
    for (const text of offTokenValues(node, tokens)) {
      report.offToken.push({ path: node.path, nodeId: node.id, text });
    }
  }
  if (node.asset !== null) {
    return;
  }
  const isInside = node.type === 'SLOT' ? false : isInsideInstance || node.instance !== null;
  for (const child of node.children) {
    visit(child, isInside, tokens, report);
  }
}

/**
 * Development 주석의 "표시용" 글을 찾는다.
 * @codocs [[디자인 시스템:조립]]
 * @param annotations 레이어 주석
 * @returns 주석 글, 없으면 null
 */
function displayOnlyNote(annotations: readonly AnnotationData[]): string | null {
  const found = annotations.find(
    (annotation) =>
      annotation.category === DISPLAY_ONLY_CATEGORY && annotation.text.includes(DISPLAY_ONLY_TEXT),
  );
  return found?.text ?? null;
}

/**
 * 쓴 컴포넌트를 더한다. 같은 컴포넌트·속성이면 경로만 더한다.
 * @param list 쓴 컴포넌트 목록
 * @param node 인스턴스
 */
function addComponent(list: UsedComponent[], node: NodeData): void {
  const { instance } = node;
  if (instance === null) {
    return;
  }
  const properties = { ...instance.properties };
  const key = JSON.stringify(Object.entries(properties).sort(([a], [b]) => a.localeCompare(b)));
  const known = list.find(
    (item) =>
      item.component === instance.component &&
      JSON.stringify(Object.entries(item.properties).sort(([a], [b]) => a.localeCompare(b))) ===
        key,
  );
  if (known === undefined) {
    list.push({ component: instance.component, properties, paths: [node.path] });
  } else {
    known.paths.push(node.path);
  }
}

/**
 * 컴포넌트 밖에서 그린 부분을 구한다.
 * @param node 노드
 * @returns `칠`, `선`, `효과`, `글자`, `모양`
 */
function drawnParts(node: NodeData): string[] {
  const parts: string[] = [];
  if (node.text !== null) {
    parts.push('글자');
  } else if (hasVisiblePaint(node.fills)) {
    parts.push('칠');
  }
  if (hasVisiblePaint(node.strokes)) {
    parts.push('선');
  }
  if ((node.effects ?? []).some((effect) => effect.isVisible)) {
    parts.push('효과');
  }
  if (shapeTypes.includes(node.type)) {
    parts.push('모양');
  }
  return parts;
}

/**
 * 보이는 칠(또는 선)이 있는지 본다. 섞인 칠은 있는 것으로 본다.
 * @param paints 칠이나 선
 * @returns 보이는 것이 있으면 true
 */
function hasVisiblePaint(paints: readonly PaintData[] | 'mixed' | null): boolean {
  return paints === 'mixed' || (paints ?? []).some((paint) => paint.isVisible);
}

/**
 * 변수·스타일에 연결되지 않은 값을 찾아 가까운 토큰과 함께 적는다. 크기는 보지 않는다.
 * @codocs [[디자인 시스템:조립]]
 * @param node 노드
 * @param tokens Foundations 변수 값
 * @returns 보고 글
 */
function offTokenValues(node: NodeData, tokens: readonly TokenValue[]): string[] {
  const lines: string[] = [];
  if (node.text === null && Array.isArray(node.fills) && node.fillStyle === undefined) {
    lines.push(...paintLines('칠', node.fills, tokens));
  }
  if (Array.isArray(node.strokes) && node.strokeStyle === undefined) {
    lines.push(...paintLines('선', node.strokes, tokens));
  }
  if (hasVisiblePaint(node.strokes) && node.strokeWeight !== undefined) {
    for (const [side, bound] of Object.entries(node.strokeWeight)) {
      lines.push(...numberLine(`선 두께(${side})`, bound, 'stroke-width/', tokens));
    }
  }
  if (node.radius !== undefined) {
    for (const [corner, bound] of Object.entries(node.radius)) {
      lines.push(...numberLine(`반경(${corner})`, bound, 'radius/', tokens));
    }
  }
  if (node.layout !== null && node.layout.mode !== 'NONE') {
    for (const [side, bound] of Object.entries(node.layout.padding)) {
      lines.push(...numberLine(`여백(${side})`, bound, 'spacing/', tokens));
    }
    lines.push(...numberLine('간격', node.layout.itemSpacing, 'spacing/', tokens));
    if (node.layout.counterAxisSpacing !== null) {
      lines.push(...numberLine('줄 간격', node.layout.counterAxisSpacing, 'spacing/', tokens));
    }
  }
  if (node.opacity.variable === undefined && Math.abs(node.opacity.value - 1) > EPSILON) {
    const percent = node.opacity.value * PERCENT;
    lines.push(
      `불투명도 ${formatNumber(percent)}%${nearestText(nearestNumber(percent, 'opacity/', tokens))}`,
    );
  }
  if ((node.effects ?? []).some((effect) => effect.isVisible) && node.effectStyle === undefined) {
    lines.push('효과가 효과 스타일에 연결되어 있지 않다');
  }
  for (const segment of node.text?.segments ?? []) {
    const label = `글자 "${shorten(segment.characters)}"`;
    if (segment.textStyle === undefined) {
      lines.push(`${label}: 글자 스타일이 없다`);
    }
    if (segment.fillStyle === undefined) {
      lines.push(...paintLines(`${label} 색`, segment.fills, tokens));
    }
  }
  return lines;
}

/**
 * 변수에 연결되지 않은 칠을 적는다. 단색은 가까운 색 토큰을, 그라데이션·이미지는 칠 스타일이 없다고 적는다.
 * @param label 무엇의 칠인지
 * @param paints 칠
 * @param tokens Foundations 변수 값
 * @returns 보고 글
 */
function paintLines(
  label: string,
  paints: readonly PaintData[],
  tokens: readonly TokenValue[],
): string[] {
  const lines: string[] = [];
  for (const paint of paints) {
    if (!paint.isVisible || paint.variable !== undefined) {
      continue;
    }
    if (paint.type === 'SOLID' && paint.color !== undefined) {
      lines.push(
        `${label} ${colorText(paint.color)}${nearestText(nearestColor(paint.color, tokens))}`,
      );
    } else if (paint.type !== 'SOLID') {
      lines.push(`${label} ${paint.type}이 칠 스타일에 연결되어 있지 않다`);
    }
  }
  return lines;
}

/**
 * 변수에 연결되지 않은 0이 아닌 숫자를 가까운 토큰과 함께 적는다.
 * @param label 무엇인지
 * @param bound 값과 변수
 * @param prefix 찾을 변수 이름 앞부분
 * @param tokens Foundations 변수 값
 * @returns 보고 글(없으면 빈 목록)
 */
function numberLine(
  label: string,
  bound: Bound,
  prefix: string,
  tokens: readonly TokenValue[],
): string[] {
  if (bound.variable !== undefined || Math.abs(bound.value) <= EPSILON) {
    return [];
  }
  return [
    `${label} ${formatNumber(bound.value)}${nearestText(nearestNumber(bound.value, prefix, tokens))}`,
  ];
}

/**
 * 이름이 앞부분으로 시작하는 숫자 변수 가운데 값이 가장 가까운 변수를 찾는다.
 * @param value 값
 * @param prefix 변수 이름 앞부분
 * @param tokens Foundations 변수 값
 * @returns 변수 이름과 값, 없으면 null
 */
export function nearestNumber(
  value: number,
  prefix: string,
  tokens: readonly TokenValue[],
): { name: string; shown: string } | null {
  let best: { name: string; shown: string; distance: number } | null = null;
  for (const token of tokens) {
    if (token.kind !== 'number' || !token.name.startsWith(prefix)) {
      continue;
    }
    const distance = Math.abs(token.value - value);
    if (best === null || distance < best.distance) {
      best = { name: token.name, shown: formatNumber(token.value), distance };
    }
  }
  return best;
}

/**
 * 색 변수 가운데 RGBA가 가장 가까운 변수를 찾는다.
 * @param color 색
 * @param tokens Foundations 변수 값
 * @returns 변수 이름과 값, 없으면 null
 */
export function nearestColor(
  color: ColorValue,
  tokens: readonly TokenValue[],
): { name: string; shown: string } | null {
  let best: { name: string; shown: string; distance: number } | null = null;
  for (const token of tokens) {
    if (token.kind !== 'color') {
      continue;
    }
    const { r, g, b, a } = token.value;
    const distance = Math.hypot(r - color.r, g - color.g, b - color.b, a - color.a);
    if (best === null || distance < best.distance) {
      best = { name: token.name, shown: colorText(token.value), distance };
    }
  }
  return best;
}

/**
 * 가까운 토큰 글을 만든다.
 * @param nearest 가까운 토큰
 * @returns ` → 가까운 토큰 \`spacing/sm\`(8)` 꼴, 없으면 ` (가까운 토큰 없음)`
 */
function nearestText(nearest: { name: string; shown: string } | null): string {
  return nearest === null
    ? ' (가까운 토큰 없음)'
    : ` → 가까운 토큰 \`${nearest.name}\`(${nearest.shown})`;
}

/**
 * 색을 `#rrggbbaa` 꼴로 쓴다. 불투명이면 `#rrggbb`다.
 * @param color 색
 * @returns 색 글
 */
export function colorText(color: ColorValue): string {
  const hex = [color.r, color.g, color.b, ...(color.a < 1 - EPSILON ? [color.a] : [])]
    .map((channel) =>
      Math.round(Math.min(1, Math.max(0, channel)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
  return `#${hex}`;
}

/**
 * 숫자를 소수 둘째 자리까지 쓴다.
 * @param value 숫자
 * @returns 글
 */
function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100 + 0);
}

/**
 * 글자를 보고에 쓸 만큼 줄인다.
 * @param text 글자
 * @returns 20자까지(넘으면 `…`)
 */
function shorten(text: string): string {
  const flat = text.replace(/\s+/gu, ' ').trim();
  return flat.length > 20 ? `${flat.slice(0, 20)}…` : flat;
}

/** 보고 묶음 하나(화면과 PR 본문이 같은 순서·제목으로 보인다). lines: 줄과 피그마 노드 ID */
export type ReportSection = {
  title: string;
  lines: { text: string; nodeId: string | null }[];
};

/**
 * 조립 보고를 화면·PR 본문에 쓸 묶음으로 바꾼다. 비어 있는 묶음은 "없음" 한 줄이다.
 * @codocs [[피그마 연동:피그마 플러그인]]
 * @param report 변형 하나의 조립 보고
 * @returns 묶음
 */
export function reportSections(report: PatternReport): ReportSection[] {
  /**
   * 경로가 있는 줄을 만든다.
   * @param item 보고 줄
   * @returns 화면 줄
   */
  function line(item: ReportItem): { text: string; nodeId: string | null } {
    return {
      text: `${item.path === '' ? '(루트)' : item.path}: ${item.text}`,
      nodeId: item.nodeId,
    };
  }
  const sections: ReportSection[] = [
    {
      title: '사용한 컴포넌트',
      lines: report.components.map((item) => ({
        text: `${item.component}${propertiesText(item.properties)} ×${String(item.paths.length)}`,
        nodeId: null,
      })),
    },
    { title: '컴포넌트 밖에서 그린 것', lines: report.drawn.map(line) },
    { title: 'Foundations에 없는 값', lines: report.offToken.map(line) },
    { title: '표시용(Development 주석)', lines: report.displayOnly.map(line) },
    { title: '움직임', lines: report.motion.map(line) },
  ];
  return sections.map((section) =>
    section.lines.length === 0 ? { ...section, lines: [{ text: '없음', nodeId: null }] } : section,
  );
}

/**
 * 컴포넌트 속성을 글로 쓴다.
 * @param properties 속성
 * @returns ` (State=Rest, Label=열기)` 꼴, 없으면 빈 문자열
 */
function propertiesText(properties: Record<string, string | boolean>): string {
  const entries = Object.entries(properties);
  return entries.length === 0
    ? ''
    : ` (${entries.map(([key, value]) => `${key}=${String(value)}`).join(', ')})`;
}

import type { CSSProperties } from 'react';

/** 피그마 크기 방식(export.json의 `sizing`). 플러그인은 레이아웃 크기 방식을 그대로 적는다 */
type FigmaSizing = 'FIXED' | 'HUG' | 'FILL';

/** export.json 트리 노드 가운데 FigmaFrame이 읽는 칸 */
export type FigmaNode = {
  name: string;
  sizing?: { h: FigmaSizing; v: FigmaSizing };
  /** 너비에 연결한 피그마 변수 경로(`size/list-item/width`) */
  width?: string;
  /** 높이에 연결한 피그마 변수 경로 */
  height?: string;
  layout?: { mode?: string };
  children?: readonly FigmaNode[];
};

/** 피그마 플러그인이 내보낸 export.json 가운데 FigmaFrame이 읽는 칸 */
export type FigmaExport = {
  name: string;
  variants: Readonly<
    Record<string, { properties: Readonly<Record<string, string>>; tree: FigmaNode }>
  >;
};

/** 노드 하나의 크기와 그 노드를 담은 부모의 방향 */
type NodeSizing = {
  node: FigmaNode;
  parentMode: string | undefined;
};

/**
 * 피그마 이름을 정규화한다. 캡처 도구가 변형과 스토리 args를 짝짓는 규칙과 같다(소문자, `[a-z0-9-]` 밖은 `-`).
 * @param value 피그마 속성 이름이나 값
 * @returns 정규화한 이름
 */
function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/-+/gu, '-')
    .replace(/^-|-$/gu, '');
}

/**
 * 피그마 속성 이름을 스토리 arg 이름으로 바꾼다(`Show Icon` → `showIcon`).
 * @param name 피그마 속성 이름
 * @returns camelCase arg 이름
 */
function argName(name: string): string {
  const [first = '', ...rest] = normalizeName(name).split('-');
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

/**
 * 피그마 변형 값을 스토리 arg 값으로 바꾼다(`Two-line` → `two-line`, `True` → true).
 * @param value 피그마 변형 값
 * @returns arg 값
 */
function argValue(value: string): string | boolean {
  const normalized = normalizeName(value);
  return normalized === 'true' ? true : normalized === 'false' ? false : normalized;
}

/**
 * 피그마 변수 경로를 CSS 사용자 속성 이름으로 바꾼다(`size/list-item/width` → `--size-list-item-width`).
 * 토큰 생성 스크립트의 이름 규칙과 같다.
 * @param path 피그마 변수 경로
 * @returns CSS 사용자 속성 이름
 */
export function cssVariableName(path: string): string {
  return `--${path.split('/').map(kebabSegment).join('-')}`;
}

/**
 * 경로 조각 하나를 소문자 kebab-case로 바꾼다. 공백은 `-`가 되고 괄호는 빠진다.
 * @param segment 경로 조각(`Flyout (Acrylic)`)
 * @returns kebab-case 조각(`flyout-acrylic`)
 */
function kebabSegment(segment: string): string {
  return normalizeName(segment.replace(/[()]/gu, '').trim());
}

/**
 * 경로(`Content/ProfileButton`)의 노드와 그 부모의 방향을 찾는다. 경로가 없으면 루트다.
 * @param root 변형의 루트 노드
 * @param node `/`로 나눈 노드 이름 경로
 * @returns 노드와 부모의 방향
 */
function findNode(root: FigmaNode, node: string | undefined): NodeSizing | undefined {
  if (node === undefined) {
    return { node: root, parentMode: undefined };
  }
  let parent: FigmaNode | undefined;
  let current: FigmaNode | undefined = root;
  for (const name of node.split('/')) {
    parent = current;
    current = current?.children?.find((child) => child.name === name);
  }
  return current === undefined ? undefined : { node: current, parentMode: parent?.layout?.mode };
}

/**
 * 노드의 크기 방식을 감싸는 요소의 style로 바꾼다.
 * - HUG: 크기를 주지 않는다(감싼 요소가 내용에 맞춘다).
 * - FIXED: 피그마가 연결한 크기 변수를 주고 줄어들지 않게 한다.
 * - FILL: 부모 방향을 따라 남는 공간을 채운다(주축은 늘리고, 교차축은 늘여 맞춘다).
 * @param sizing 노드와 부모의 방향
 * @param label 오류 문구에 쓸 이름
 * @returns 감싸는 요소의 style
 */
function sizingStyle(sizing: NodeSizing, label: string): CSSProperties {
  const { node, parentMode } = sizing;
  if (node.sizing === undefined) {
    throw new Error(`${label}: export.json에 크기 방식(sizing)이 없다`);
  }
  const style: CSSProperties = {};
  const axes = [
    { sizing: node.sizing.h, variable: node.width, size: 'width', main: 'HORIZONTAL' },
    { sizing: node.sizing.v, variable: node.height, size: 'height', main: 'VERTICAL' },
  ] as const;
  for (const axis of axes) {
    if (axis.sizing === 'FIXED') {
      if (axis.variable === undefined) {
        throw new Error(`${label}: 고정 ${axis.size}에 연결한 크기 변수가 없다`);
      }
      style[axis.size] = `var(${cssVariableName(axis.variable)})`;
      style.flexShrink = 0;
    } else if (axis.sizing === 'FILL') {
      if (parentMode === axis.main) {
        style.flex = '1 1 0';
        style[axis.size === 'width' ? 'minWidth' : 'minHeight'] = 0;
      } else if (parentMode === 'HORIZONTAL' || parentMode === 'VERTICAL') {
        // 감싸는 요소는 내용 너비(w-fit)라, 크기를 auto로 돌려야 교차축으로 늘어난다.
        style.alignSelf = 'stretch';
        style[axis.size] = 'auto';
      } else {
        throw new Error(`${label}: 채움(FILL) 노드의 부모가 가로·세로 자동 배치가 아니다`);
      }
    }
  }
  return style;
}

/**
 * 스토리 args에 맞는 피그마 변형들에서 노드의 크기를 감싸는 요소의 style로 구한다.
 * args에 없는 변형 속성은 아무 값이나 맞는 것으로 보고, 맞는 변형끼리 크기가 다르면 오류를 낸다.
 * @codocs [[피그마 연동:스토리 규칙]]
 * @param source 컴포넌트·조립의 export.json
 * @param args 스토리 args(변형 속성)
 * @param node 루트가 아닌 안쪽 노드를 감쌀 때 `/`로 나눈 노드 이름 경로
 * @returns 감싸는 요소의 style
 */
export function figmaFrameStyle(
  source: FigmaExport,
  args: Readonly<Record<string, unknown>>,
  node?: string,
): CSSProperties {
  const label = node === undefined ? source.name : `${source.name} ${node}`;
  const matched = Object.values(source.variants).filter((variant) => matchesArgs(variant, args));
  if (matched.length === 0) {
    throw new Error(`${label}: args에 맞는 피그마 변형이 없다`);
  }
  const styles = matched.map((variant) => variantStyle(variant, node, label));
  const [first] = styles;
  if (styles.some((style) => JSON.stringify(style) !== JSON.stringify(first))) {
    throw new Error(
      `${label}: args에 맞는 변형끼리 크기가 다르다. 크기를 가르는 변형 속성을 args로 준다`,
    );
  }
  return first ?? {};
}

/**
 * 변형이 스토리 args와 맞는지 본다. args에 없는 변형 속성은 아무 값이나 맞는다.
 * @param variant 피그마 변형
 * @param args 스토리 args
 * @returns 맞으면 true
 */
function matchesArgs(
  variant: FigmaExport['variants'][string],
  args: Readonly<Record<string, unknown>>,
): boolean {
  return Object.entries(variant.properties).every(([name, value]) => {
    const arg = args[argName(name)];
    return arg === undefined || arg === argValue(value);
  });
}

/**
 * 변형 하나에서 노드의 크기를 감싸는 요소의 style로 바꾼다.
 * @param variant 피그마 변형
 * @param node 노드 이름 경로
 * @param label 오류 문구에 쓸 이름
 * @returns 감싸는 요소의 style
 */
function variantStyle(
  variant: FigmaExport['variants'][string],
  node: string | undefined,
  label: string,
): CSSProperties {
  const sizing = findNode(variant.tree, node);
  if (sizing === undefined) {
    throw new Error(`${label}: 피그마 변형에 이 노드가 없다`);
  }
  return sizingStyle(sizing, label);
}

import type { Bound, NodeData, PaintData, Sides, TextSegmentData } from './node-data';

// 구조 검사 테스트용 노드 데이터. 피그마 Button 변형을 본뜬 정상 구조다.

/**
 * 네 변이 같은 값을 만든다.
 * @param value 값
 * @returns 네 변
 */
export function sides(value: Bound): Sides<Bound> {
  return { top: value, right: value, bottom: value, left: value };
}

/**
 * 색 변수에 연결한 단색 칠을 만든다.
 * @param variable 색 변수 이름. 없으면 연결하지 않은 칠
 * @returns 칠
 */
export function solid(variable?: string): PaintData {
  return { type: 'SOLID', visible: true, blendMode: 'NORMAL', variable };
}

/**
 * 기본값을 채운 노드 데이터를 만든다.
 * @param overrides 바꿀 값
 * @returns 노드 데이터
 */
export function node(overrides: Partial<NodeData> & Pick<NodeData, 'path' | 'type'>): NodeData {
  return {
    id: overrides.path,
    name: overrides.path.split('/').at(-1) ?? '',
    parentLayoutMode: 'HORIZONTAL',
    opacity: { value: 1 },
    rotation: 0,
    isMask: false,
    width: { value: 16 },
    height: { value: 16 },
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    fills: [],
    strokes: [],
    dashPattern: [],
    variableWidthStroke: false,
    complexStroke: false,
    cornerSmoothing: 0,
    effects: [],
    layout: null,
    child: {
      sizingHorizontal: 'HUG',
      sizingVertical: 'HUG',
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    },
    text: null,
    asset: null,
    isFullEllipse: null,
    children: [],
    ...overrides,
  };
}

/**
 * 글자 구간을 만든다.
 * @param overrides 바꿀 값
 * @returns 구간
 */
export function segment(overrides: Partial<TextSegmentData> = {}): TextSegmentData {
  return {
    characters: '버튼',
    textStyle: 'Hangul/Body',
    overrides: [],
    fills: [solid('text-on-accent-fill/primary')],
    hasOpenTypeFeatures: false,
    ...overrides,
  };
}

/**
 * Button 변형 하나를 본뜬 정상 루트를 만든다.
 * @returns 루트 노드 데이터
 */
export function buttonRoot(): NodeData {
  const label = node({
    path: 'label',
    type: 'TEXT',
    fills: 'mixed',
    text: { autoResize: 'WIDTH_AND_HEIGHT', hasMissingFont: false, segments: [segment()] },
  });
  return node({
    path: '',
    type: 'COMPONENT',
    parentLayoutMode: null,
    child: null,
    width: { value: 120 },
    height: { value: 32 },
    minWidth: { value: 120, variable: 'size/button/min-width' },
    fills: [solid('accent-fill/default')],
    strokes: [{ type: 'GRADIENT_LINEAR', visible: true, blendMode: 'NORMAL' }],
    strokeStyle: 'Elevation/Accent Control Border',
    strokeWeight: sides({ value: 1, variable: 'stroke-width/default' }),
    radius: {
      topLeft: { value: 4, variable: 'radius/control' },
      topRight: { value: 4, variable: 'radius/control' },
      bottomRight: { value: 4, variable: 'radius/control' },
      bottomLeft: { value: 4, variable: 'radius/control' },
    },
    layout: {
      mode: 'HORIZONTAL',
      wrap: 'NO_WRAP',
      primaryAlign: 'CENTER',
      primarySizing: 'AUTO',
      counterSizing: 'AUTO',
      padding: {
        top: { value: 6, variable: 'spacing/6' },
        right: { value: 12, variable: 'spacing/12' },
        bottom: { value: 6, variable: 'spacing/6' },
        left: { value: 12, variable: 'spacing/12' },
      },
      itemSpacing: { value: 8, variable: 'spacing/8' },
      counterAxisSpacing: null,
    },
    children: [label],
  });
}

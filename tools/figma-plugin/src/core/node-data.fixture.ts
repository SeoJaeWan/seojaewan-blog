import type { Bound, NodeData, Sides, TextSegmentData } from './node-data';

// 구조 검사·레이어 만들기 테스트용 노드 데이터. 피그마 Button 변형을 본뜬 정상 구조다.

/**
 * 네 변이 같은 값을 만든다.
 * @param value 값
 * @returns 네 변
 */
export function sides(value: Bound): Sides<Bound> {
  return { top: value, right: value, bottom: value, left: value };
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
    blendMode: 'PASS_THROUGH',
    rotation: 0,
    hasSkewOrFlip: false,
    isMask: false,
    explicitModeCount: 0,
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
    clipsContent: false,
    layout: null,
    child: {
      sizingHorizontal: 'HUG',
      sizingVertical: 'HUG',
      layoutAlign: 'INHERIT',
      layoutGrow: 0,
      positioning: 'AUTO',
      constraints: { horizontal: 'MIN', vertical: 'MIN' },
    },
    text: null,
    asset: null,
    isFullEllipse: null,
    children: [],
    hiddenChildren: [],
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
    start: 0,
    end: 2,
    fontFamily: 'Pretendard',
    fontStyle: 'Regular',
    textStyle: 'Hangul/Body',
    styleFields: {
      fontSize: { value: 14, variable: 'font/size/body' },
      lineHeight: { value: '20px', variable: 'font/line-height/body' },
      fontWeight: { value: 'Regular', variable: 'font/weight/regular' },
      letterSpacing: { value: '0%' },
    },
    overrides: [],
    fills: [
      {
        type: 'SOLID',
        visible: true,
        blendMode: 'NORMAL',
        opacity: 1,
        variable: 'text-on-accent-fill/primary',
      },
    ],
    textDecoration: 'NONE',
    textCase: 'ORIGINAL',
    textWrapStyle: 'AUTO',
    paragraphIndent: 0,
    paragraphSpacing: 0,
    listSpacing: 0,
    indentation: 0,
    listType: 'NONE',
    hasOpenTypeFeatures: false,
    hasDecorationDetails: false,
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
    text: {
      characters: '버튼',
      autoResize: 'WIDTH_AND_HEIGHT',
      alignHorizontal: 'LEFT',
      alignVertical: 'TOP',
      truncation: 'DISABLED',
      maxLines: null,
      leadingTrim: 'NONE',
      hasMissingFont: false,
      hangingPunctuation: false,
      hangingList: false,
      segments: [segment()],
    },
  });
  return node({
    path: '',
    type: 'COMPONENT',
    parentLayoutMode: null,
    child: null,
    width: { value: 120 },
    height: { value: 32 },
    minWidth: { value: 120, variable: 'size/button/min-width' },
    fills: [
      {
        type: 'SOLID',
        visible: true,
        blendMode: 'NORMAL',
        opacity: 1,
        variable: 'accent-fill/default',
      },
    ],
    strokes: [{ type: 'GRADIENT_LINEAR', visible: true, blendMode: 'NORMAL', opacity: 1 }],
    strokeStyle: 'Elevation/Accent Control Border',
    strokeAlign: 'INSIDE',
    strokeWeight: sides({ value: 1, variable: 'stroke-width/default' }),
    strokeJoin: 'MITER',
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
      counterAlign: 'CENTER',
      alignContent: 'AUTO',
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
      itemReverseZIndex: false,
      strokesIncludedInLayout: false,
    },
    children: [label],
    hiddenChildren: [{ path: 'icon', visibleProperty: 'Show icon#13:0' }],
  });
}

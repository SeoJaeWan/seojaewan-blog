// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { compareVariantValues } from './compare-values.ts';
import { parseColor, parseGradientStops, parseShadows } from './css-values.ts';
import type { FigmaLayer } from './figma-layers.ts';
import type { MeasuredElement, MeasuredStyle } from './measured-element.ts';

const colors = new Map([
  ['accent-fill/default', '#005fb8'],
  ['text-fill/primary', '#000000e4'],
  ['control-stroke/default', '#0000000f'],
  ['control-stroke/secondary', '#00000029'],
]);

const rootLayer: FigmaLayer = {
  path: '',
  kind: 'frame',
  type: 'COMPONENT',
  x: 0,
  y: 0,
  width: 120,
  height: 32,
  layoutMode: 'HORIZONTAL',
  padding: { top: 6, right: 12, bottom: 6, left: 12 },
  itemSpacing: 8,
  cornerRadius: 4,
  fills: [{ type: 'SOLID', color: '#005fb8', token: '{accent-fill.default}' }],
  strokes: [
    {
      type: 'GRADIENT_LINEAR',
      stops: [
        { position: 0.9058, color: '#0000000f', token: '{control-stroke.default}' },
        { position: 1, color: '#00000029', token: '{control-stroke.secondary}' },
      ],
    },
  ],
  strokeWeight: 1,
  strokeAlign: 'INSIDE',
};

const labelLayer: FigmaLayer = {
  path: 'label',
  kind: 'text',
  type: 'TEXT',
  x: 12,
  y: 6,
  width: 96,
  height: 20,
  fills: [{ type: 'SOLID', color: '#000000e4', token: '{text-fill.primary}' }],
  text: {
    characters: '버튼',
    autoResize: 'HEIGHT',
    alignHorizontal: 'LEFT',
    fontFamily: ['Pretendard'],
    fontWeight: 400,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    textStyle: ['Hangul/Body'],
    ink: { x: 13, y: 10, width: 22.7, height: 12.2 },
  },
};

/**
 * 측정값을 만든다. 지정하지 않은 스타일은 아무것도 그리지 않는 값이다.
 * @param path data-figma 값
 * @param box 루트 기준 상자
 * @param style 계산된 스타일
 * @param overrides 바꿀 측정값
 * @returns 측정값
 */
function element(
  path: string,
  box: MeasuredElement['box'],
  style: MeasuredStyle = {},
  overrides: Partial<MeasuredElement> = {},
): MeasuredElement {
  return {
    path,
    tag: 'span',
    visible: true,
    box,
    style: {
      opacity: '1',
      'background-color': 'rgba(0, 0, 0, 0)',
      'background-image': 'none',
      'border-top-width': '0px',
      'border-right-width': '0px',
      'border-bottom-width': '0px',
      'border-left-width': '0px',
      'box-shadow': 'none',
      'text-shadow': 'none',
      ...style,
    },
    before: null,
    after: null,
    strokeSvg: null,
    shapeFills: [],
    images: [],
    text: null,
    ...overrides,
  };
}

const goodRoot = element(
  '',
  { x: 0, y: 0, width: 120, height: 32 },
  {
    'background-color': 'rgb(0, 95, 184)',
    'padding-top': '6px',
    'padding-right': '12px',
    'padding-bottom': '6px',
    'padding-left': '12px',
    'column-gap': '8px',
    'border-top-left-radius': '4px',
    'border-top-right-radius': '4px',
    'border-bottom-right-radius': '4px',
    'border-bottom-left-radius': '4px',
  },
  {
    before: {
      content: '""',
      position: 'absolute',
      'mask-image': 'linear-gradient(rgb(0, 0, 0), rgb(0, 0, 0))',
      'padding-top': '1px',
      'background-color': 'rgba(0, 0, 0, 0)',
      'background-image':
        'linear-gradient(rgba(0, 0, 0, 0.06) 90.58%, rgba(0, 0, 0, 0.1) 95%, rgba(0, 0, 0, 0.16) 100%)',
    },
  },
);

const goodLabel = element(
  'label',
  { x: 12, y: 6, width: 96, height: 20 },
  {
    'font-size': '14px',
    'font-weight': '400',
    'line-height': '20px',
    'letter-spacing': 'normal',
    'font-family': '"Open Sans", Pretendard',
  },
  {
    text: {
      content: '버튼',
      color: 'rgba(0, 0, 0, 0.894)',
      ink: { x: 13.2, y: 10.4, width: 22.6, height: 12.1 },
      platformFonts: ['Pretendard'],
    },
  },
);

/**
 * 루트와 label을 비교하고 실패 메시지만 돌려준다.
 * @param root 루트 측정값
 * @param elements data-figma 요소 측정값
 * @param layers 피그마 레이어
 * @returns 실패 메시지
 */
function messages(
  root: MeasuredElement = goodRoot,
  elements: MeasuredElement[] = [goodLabel],
  layers: FigmaLayer[] = [rootLayer, labelLayer],
): string[] {
  return compareVariantValues(layers, { root, elements }, colors).failures.map(
    (failure) => failure.message,
  );
}

// @codocs [[피그마 일치 검사:값 비교]]
describe('값 비교', () => {
  it('피그마 값과 같은 컴포넌트는 통과한다', () => {
    expect(messages()).toEqual([]);
  });

  it('반경과 안쪽 여백이 다르면 고칠 값을 피그마 값 → 코드 값으로 알려 준다', () => {
    const root = {
      ...goodRoot,
      style: {
        ...goodRoot.style,
        'padding-left': '13px',
        'border-top-left-radius': '5px',
        'border-top-right-radius': '5px',
        'border-bottom-right-radius': '5px',
        'border-bottom-left-radius': '5px',
      },
    };
    expect(messages(root)).toEqual(['root 안쪽 여백 왼쪽 12 → 13', 'root 반경 4 → 5']);
  });

  it('채우기 색은 토큰 값으로 풀어 RGBA가 같아야 하고, 틀리면 기대한 토큰을 알려 준다', () => {
    const root = {
      ...goodRoot,
      style: { ...goodRoot.style, 'background-color': 'rgb(0, 96, 185)' },
    };
    expect(messages(root)).toEqual(['root 채우기 accent-fill.default #005fb8 → #0060b9']);
  });

  it('그라데이션 선은 양 끝 색과 위치를 비교한다', () => {
    const root = {
      ...goodRoot,
      before: {
        ...goodRoot.before,
        'background-image': 'linear-gradient(rgba(0, 0, 0, 0.06) 90%, rgba(0, 0, 0, 0.16) 100%)',
      },
    };
    expect(messages(root)).toEqual(['root 선 그라데이션 시작 위치 90.58% → 90%']);
  });

  it('위치와 크기는 ±0.5px까지 허용한다', () => {
    const near = { ...goodLabel, box: { ...goodLabel.box, x: 12.4 } };
    expect(messages(goodRoot, [near])).toEqual([]);
    const far = { ...goodLabel, box: { ...goodLabel.box, x: 13 } };
    expect(messages(goodRoot, [far])).toEqual(['label x 12 → 13 (±0.5)']);
  });

  it('글자 내용은 줄바꿈 표기만 맞추고 그대로 같아야 한다', () => {
    const longer = {
      ...goodLabel,
      text: {
        ...goodLabel.text,
        content: '버튼이다',
        color: 'rgba(0, 0, 0, 0.894)',
        ink: goodLabel.text?.ink ?? null,
        platformFonts: ['Pretendard'],
      },
    };
    expect(messages(goodRoot, [longer])).toEqual(["label 글자 '버튼' → '버튼이다'"]);
  });

  it('고정 너비 글자도 잉크 영역으로 글자 길이와 정렬 차이를 잡는다', () => {
    const shifted = {
      ...goodLabel,
      text: {
        content: '버튼',
        color: 'rgba(0, 0, 0, 0.894)',
        ink: { x: 50, y: 10.4, width: 22.6, height: 12.1 },
        platformFonts: ['Pretendard'],
      },
    };
    expect(messages(goodRoot, [shifted])).toEqual(['label 잉크 x 13 → 50 (±0.5)']);
  });

  it('실제로 글자를 그린 서체가 피그마 서체와 달라야 실패한다', () => {
    const wrong = {
      ...goodLabel,
      text: {
        content: '버튼',
        color: 'rgba(0, 0, 0, 0.894)',
        ink: goodLabel.text?.ink ?? null,
        platformFonts: ['Cascadia Mono'],
      },
    };
    expect(messages(goodRoot, [wrong])).toEqual(['label 서체 Pretendard → Cascadia Mono']);
  });

  it('짝이 없는 레이어는 실패하지만, 칠·선·효과 없는 구조용 frame은 짝이 없어도 된다', () => {
    const container: FigmaLayer = {
      path: 'content',
      kind: 'frame',
      type: 'FRAME',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };
    expect(messages(goodRoot, [], [rootLayer, labelLayer, container])).toEqual([
      'label 짝이 되는 data-figma="label" 요소가 없다',
    ]);
  });

  it('피그마 변형에 없는 레이어 이름의 요소가 보이면 실패한다', () => {
    const extra = element('focus rect', { x: -3, y: -3, width: 126, height: 38 });
    expect(messages(goodRoot, [goodLabel, extra])).toEqual([
      'focus rect 피그마 변형에 없는(숨긴) 레이어가 화면에 보인다',
    ]);
    expect(messages(goodRoot, [goodLabel, { ...extra, visible: false }])).toEqual([]);
  });

  it('그림자는 오프셋·블러·퍼짐·색이 같은 그림자가 있어야 한다', () => {
    const shadowed: FigmaLayer = {
      ...rootLayer,
      effects: [
        { type: 'DROP_SHADOW', color: '#00000024', offsetX: 0, offsetY: 8, radius: 16, spread: 0 },
      ],
    };
    expect(messages(goodRoot, [goodLabel], [shadowed, labelLayer])).toEqual([
      'root 그림자 0 8 16 0 #00000024 → 없음',
    ]);
    const root = {
      ...goodRoot,
      style: { ...goodRoot.style, 'box-shadow': 'rgba(0, 0, 0, 0.14) 0px 8px 16px 0px' },
    };
    expect(messages(root, [goodLabel], [shadowed, labelLayer])).toEqual([]);
  });

  it('이미지 칠은 브라우저가 받은 이미지의 SHA-1이 피그마 imageHash와 같아야 한다', () => {
    const image: FigmaLayer = {
      path: 'photo',
      kind: 'image',
      type: 'RECTANGLE',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      fills: [{ type: 'IMAGE', imageHash: 'abc', scaleMode: 'FILL', opacity: 1 }],
    };
    const measured = element(
      'photo',
      { x: 0, y: 0, width: 10, height: 10 },
      {},
      {
        tag: 'img',
        images: [
          {
            source: 'img',
            url: 'a.png',
            sha1: 'def',
            opacity: 1,
            repeat: 'no-repeat',
            size: 'cover',
          },
        ],
      },
    );
    expect(messages(goodRoot, [goodLabel, measured], [rootLayer, labelLayer, image])).toEqual([
      'photo 이미지 다른 이미지 abc → def',
    ]);
  });

  it('높이가 테두리 두께뿐인 요소는 테두리 색으로 칠한 사각형으로 본다', () => {
    const line: FigmaLayer = {
      path: 'bottom border',
      kind: 'frame',
      type: 'RECTANGLE',
      x: 0,
      y: 30,
      width: 120,
      height: 2,
      cornerRadius: 0,
      fills: [{ type: 'SOLID', color: '#005fb8', token: '{accent-fill.default}' }],
    };
    const measured = element(
      'bottom border',
      { x: 0, y: 30, width: 120, height: 2 },
      {
        'border-bottom-width': '2px',
        'border-bottom-color': 'rgb(0, 95, 184)',
      },
    );
    expect(messages(goodRoot, [goodLabel, measured], [rootLayer, labelLayer, line])).toEqual([]);
  });

  it('토큰을 tokens.json에서 찾을 수 없으면 실패한다', () => {
    const unknown: FigmaLayer = {
      ...rootLayer,
      fills: [{ type: 'SOLID', color: '#ffffff', token: '{missing.token}' }],
    };
    expect(messages(goodRoot, [goodLabel], [unknown, labelLayer])).toEqual([
      'root 채우기 토큰 missing.token을 tokens.json에서 찾을 수 없다',
    ]);
  });

  it('vector 레이어 모양 비교가 실패하면 그 결과를 이미지와 함께 실패로 남긴다', () => {
    const icon: FigmaLayer = {
      path: 'icon',
      kind: 'vector',
      type: 'INSTANCE',
      x: 0,
      y: 0,
      width: 16,
      height: 16,
    };
    const failures = compareVariantValues(
      [rootLayer, labelLayer, icon],
      {
        root: goodRoot,
        elements: [goodLabel, element('icon', { x: 0, y: 0, width: 16, height: 16 })],
      },
      colors,
      new Map([['icon', { ok: false, message: '모양 다름' }]]),
    ).failures;
    expect(failures).toEqual([{ layer: 'icon', message: 'icon 모양 다름', hasImage: true }]);
  });
});

// @codocs [[피그마 일치 검사:값 비교]]
describe('계산된 스타일 해석', () => {
  it('rgb·rgba·color(srgb) 색을 0~255 RGBA로 읽는다', () => {
    expect(parseColor('rgb(0, 95, 184)')).toEqual([0, 95, 184, 255]);
    expect(parseColor('rgba(0, 0, 0, 0.894)')).toEqual([0, 0, 0, 228]);
    expect(parseColor('color(srgb 1 1 1 / 0.7)')).toEqual([255, 255, 255, 179]);
  });

  it('그림자 목록과 그라데이션 색 지점을 읽는다', () => {
    expect(
      parseShadows('rgba(0, 0, 0, 0.14) 0px 8px 16px 0px, rgb(0, 0, 0) 1px 2px 3px 4px inset'),
    ).toEqual([
      { color: [0, 0, 0, 36], offsetX: 0, offsetY: 8, blur: 16, spread: 0, inset: false },
      { color: [0, 0, 0, 255], offsetX: 1, offsetY: 2, blur: 3, spread: 4, inset: true },
    ]);
    expect(
      parseGradientStops('linear-gradient(rgb(255, 255, 255) 10%, rgba(0, 0, 0, 0.4) 100%)'),
    ).toEqual([
      { color: [255, 255, 255, 255], position: 10 },
      { color: [0, 0, 0, 102], position: 100 },
    ]);
  });
});

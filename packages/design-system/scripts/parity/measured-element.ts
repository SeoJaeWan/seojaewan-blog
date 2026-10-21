/**
 * 브라우저에서 잰 요소 값(측정 결과)의 모양. 측정은 measure-story.ts가 하고, 비교는 compare-values.ts가 한다.
 * 계산된 스타일은 getComputedStyle 문자열 그대로 담고 비교할 때 해석한다.
 */

import type { Box } from './figma-layers.ts';

/** getComputedStyle에서 읽는 속성 */
export const MEASURED_STYLE_PROPERTIES = [
  'display',
  'position',
  'content',
  'opacity',
  'background-color',
  'background-image',
  'background-repeat',
  'background-size',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'row-gap',
  'column-gap',
  'box-shadow',
  'text-shadow',
  'backdrop-filter',
  'filter',
  'mask-image',
  'color',
  'fill',
  'stroke',
  'stroke-width',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
] as const;

export type MeasuredStyle = Partial<Record<(typeof MEASURED_STYLE_PROPERTIES)[number], string>>;

/** 요소나 의사 요소가 그리는 이미지 */
export type MeasuredImage = {
  /** 어디서 그리는지: `img`, `background`, `::before`, `::after` */
  source: string;
  url: string;
  /** 브라우저가 받은 바이트의 SHA-1(16진수). 받지 못하면 null */
  sha1: string | null;
  /** 그 이미지를 그리는 요소·의사 요소의 불투명도 */
  opacity: number;
  repeat: string;
  size: string;
};

export type MeasuredText = {
  /** 화면에 보이는 글자. 입력창은 값, 값이 없으면 placeholder */
  content: string;
  /** 글자 색(placeholder를 보이면 ::placeholder 색) */
  color: string;
  /** 글리프 잉크 영역(루트 기준). 잴 수 없으면 null */
  ink: Box | null;
  /** 실제로 글자를 그린 서체 이름(Chromium CSS.getPlatformFontsForNode). 잴 수 없으면 null */
  platformFonts: string[] | null;
};

export type MeasuredElement = {
  /** data-figma 값. 루트는 빈 문자열 */
  path: string;
  tag: string;
  /** 화면에 보이는지(크기 0이거나 숨김이면 false) */
  visible: boolean;
  /** 루트 기준 상자 */
  box: Box;
  style: MeasuredStyle;
  before: MeasuredStyle | null;
  after: MeasuredStyle | null;
  /** data-figma-stroke로 선을 그리는 SVG의 stroke·stroke-width */
  strokeSvg: MeasuredStyle | null;
  /** 요소 안 SVG 도형(path 등)의 계산된 fill 값 목록(none 제외) */
  shapeFills: string[];
  images: MeasuredImage[];
  text: MeasuredText | null;
};

/** 변형 하나를 잰 결과 */
export type VariantMeasurement = {
  /** 루트(data-figma-root 또는 비교 요소) */
  root: MeasuredElement;
  /** data-figma 요소. 같은 이름이 여럿이면 모두 담는다 */
  elements: MeasuredElement[];
};

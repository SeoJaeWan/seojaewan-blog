// 이 파일은 scripts/assets/generate-assets.ts가 figma/assets/에서 만든다. 손으로 고치지 않는다.
// 다시 만들기: pnpm --filter @seojaewan/design-system generate:assets

/** SVG 요소(그라데이션은 자식 요소를 가진다) */
export type SvgAssetElement = {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children?: readonly SvgAssetElement[];
};

/** 피그마 자산 파일 경로(figma/assets/ 기준) → SVG 요소 */
export const svgAssets = {
  'icons/ic_fluent_add_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M10 2.5C10.28 2.5 10.5 2.72 10.5 3V9.5H17C17.28 9.5 17.5 9.72 17.5 10C17.5 10.28 17.28 10.5 17 10.5H10.5V17C10.5 17.28 10.28 17.5 10 17.5C9.72 17.5 9.5 17.28 9.5 17V10.5H3C2.72 10.5 2.5 10.28 2.5 10C2.5 9.72 2.72 9.5 3 9.5H9.5V3C9.5 2.72 9.72 2.5 10 2.5Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_checkmark_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M3.37 10.17C3.19 9.96 2.87 9.94 2.67 10.13C2.46 10.31 2.44 10.63 2.63 10.83L6.63 15.33C6.82 15.55 7.15 15.56 7.35 15.35L17.85 4.85C18.05 4.66 18.05 4.34 17.85 4.15C17.66 3.95 17.34 3.95 17.15 4.15L7.02 14.27L3.37 10.17Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_chevron_right_16_regular.svg': {
    viewBox: '0 0 16 16',
    elements: [
      { tag: 'path', attributes: { d: 'M5.65 3.15C5.45 3.34 5.45 3.66 5.65 3.85L9.79 8L5.65 12.15C5.45 12.34 5.45 12.66 5.65 12.85C5.84 13.05 6.16 13.05 6.35 12.85L10.85 8.35C11.05 8.16 11.05 7.84 10.85 7.65L6.35 3.15C6.16 2.95 5.84 2.95 5.65 3.15Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_delete_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M8.5 4H11.5C11.5 3.17 10.83 2.5 10 2.5C9.17 2.5 8.5 3.17 8.5 4ZM7.5 4C7.5 2.62 8.62 1.5 10 1.5C11.38 1.5 12.5 2.62 12.5 4H17.5C17.78 4 18 4.22 18 4.5C18 4.78 17.78 5 17.5 5H16.45L15.25 15.34C15.08 16.86 13.8 18 12.27 18H7.73C6.2 18 4.92 16.86 4.75 15.34L3.55 5H2.5C2.22 5 2 4.78 2 4.5C2 4.22 2.22 4 2.5 4H7.5ZM5.74 15.23C5.86 16.24 6.71 17 7.73 17H12.27C13.29 17 14.14 16.24 14.26 15.23L15.44 5H4.56L5.74 15.23ZM8.5 7.5C8.78 7.5 9 7.72 9 8V14C9 14.28 8.78 14.5 8.5 14.5C8.22 14.5 8 14.28 8 14V8C8 7.72 8.22 7.5 8.5 7.5ZM12 8C12 7.72 11.78 7.5 11.5 7.5C11.22 7.5 11 7.72 11 8V14C11 14.28 11.22 14.5 11.5 14.5C11.78 14.5 12 14.28 12 14V8Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_open_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M6 4C4.9 4 4 4.9 4 6V14C4 15.1 4.9 16 6 16H14C15.1 16 16 15.1 16 14V11.5C16 11.22 16.22 11 16.5 11C16.78 11 17 11.22 17 11.5V14C17 15.66 15.66 17 14 17H6C4.34 17 3 15.66 3 14V6C3 4.34 4.34 3 6 3H8.5C8.78 3 9 3.22 9 3.5C9 3.78 8.78 4 8.5 4H6ZM11 3.5C11 3.22 11.22 3 11.5 3H16.5C16.78 3 17 3.22 17 3.5V8.5C17 8.78 16.78 9 16.5 9C16.22 9 16 8.78 16 8.5V4.71L11.85 8.85C11.66 9.05 11.34 9.05 11.15 8.85C10.95 8.66 10.95 8.34 11.15 8.15L15.29 4H11.5C11.22 4 11 3.78 11 3.5Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_pin_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M10.12 3.13998C10.73 1.91998 12.36 1.64998 13.33 2.61998L17.38 6.66998C18.35 7.63998 18.08 9.26998 16.86 9.87998L13.4 11.61C13.08 11.77 12.82 12.05 12.68 12.39L11.25 15.98C10.98 16.65 10.12 16.82 9.61 16.32L7 13.71L3.71 17H3V16.29L6.29 13L3.68 10.39C3.17 9.87998 3.35 9.01998 4.02 8.74998L7.61 7.31998C7.95 7.17998 8.23 6.91998 8.39 6.59998L10.12 3.13998ZM12.62 3.31998C12.14 2.83998 11.32 2.96998 11.02 3.57998L9.29 7.03998C9.01 7.58998 8.55 8.01998 7.98 8.24998L4.39 9.67998L10.32 15.61L11.75 12.02C11.98 11.45 12.41 10.99 12.96 10.71L16.41 8.97998C17.03 8.67998 17.16 7.85998 16.67 7.37998L12.62 3.31998Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_rename_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M11.5 2C11.78 2 12 2.22 12 2.5C12 2.78 11.78 3 11.5 3H10.5V17H11.5C11.78 17 12 17.22 12 17.5C12 17.78 11.78 18 11.5 18H8.5C8.22 18 8 17.78 8 17.5C8 17.22 8.22 17 8.5 17H9.5V3H8.5C8.22 3 8 2.78 8 2.5C8 2.22 8.22 2 8.5 2H11.5ZM8.5 5H5C3.9 5 3 5.9 3 7V13C3 14.1 3.9 15 5 15H8.5V16H5C3.34 16 2 14.66 2 13V7C2 5.34 3.34 4 5 4H8.5V5ZM15 4C16.66 4 18 5.34 18 7V13C18 14.66 16.66 16 15 16H11.5V15H15C16.1 15 17 14.1 17 13V7C17 5.9 16.1 5 15 5H11.5V4H15Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_search_16_regular.svg': {
    viewBox: '0 0 16 16',
    elements: [
      { tag: 'path', attributes: { d: 'M11.02 11.73C10.07 12.52 8.84 13 7.5 13C4.46 13 2 10.54 2 7.5C2 4.46 4.46 2 7.5 2C10.54 2 13 4.46 13 7.5C13 8.84 12.52 10.07 11.73 11.02L14.85 14.15C15.05 14.34 15.05 14.66 14.85 14.85C14.66 15.05 14.34 15.05 14.15 14.85L11.02 11.73ZM12 7.5C12 5.01 9.99 3 7.5 3C5.01 3 3 5.01 3 7.5C3 9.99 5.01 12 7.5 12C9.99 12 12 9.99 12 7.5Z', fill: 'currentColor' } },
    ],
  },
  'icons/ic_fluent_window_20_regular.svg': {
    viewBox: '0 0 20 20',
    elements: [
      { tag: 'path', attributes: { d: 'M6 3C4.34 3 3 4.34 3 6V14C3 15.66 4.34 17 6 17H14C15.66 17 17 15.66 17 14V6C17 4.34 15.66 3 14 3H6ZM4 6C4 4.9 4.9 4 6 4H14C15.1 4 16 4.9 16 6H4ZM4 7H16V14C16 15.1 15.1 16 14 16H6C4.9 16 4 15.1 4 14V7Z', fill: 'currentColor' } },
    ],
  },
  'illustrations/icon-color-search.svg': {
    viewBox: '0 0 16 16',
    elements: [
      { tag: 'path', attributes: { d: 'M11.02 11.73C10.07 12.52 8.84 13 7.5 13C4.46 13 2 10.54 2 7.5C2 4.46 4.46 2 7.5 2C10.54 2 13 4.46 13 7.5C13 8.84 12.52 10.07 11.73 11.02L14.85 14.15C15.05 14.34 15.05 14.66 14.85 14.85C14.66 15.05 14.34 15.05 14.15 14.85L11.02 11.73ZM12 7.5C12 5.01 9.99 3 7.5 3C5.01 3 3 5.01 3 7.5C3 9.99 5.01 12 7.5 12C9.99 12 12 9.99 12 7.5Z', fill: 'url(#s1)' } },
      { tag: 'defs', attributes: {  }, children: [{ tag: 'linearGradient', attributes: { id: 's1', x1: '8.5', y1: '21.5', x2: '21.5', y2: '8.5', gradientUnits: 'userSpaceOnUse' }, children: [{ tag: 'stop', attributes: { stopColor: '#005FB8' } }, { tag: 'stop', attributes: { offset: '0.55', stopColor: '#005FB8' } }, { tag: 'stop', attributes: { offset: '0.9', stopColor: '#78BF91' } }, { tag: 'stop', attributes: { offset: '1', stopColor: '#78BF91' } }] }] },
    ],
  },
} as const satisfies Record<
  string,
  { viewBox: string; elements: readonly SvgAssetElement[] }
>;

/** SVG 자산 이름 */
export type SvgAssetName = keyof typeof svgAssets;

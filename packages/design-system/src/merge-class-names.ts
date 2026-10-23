import { extendTailwindMerge } from 'tailwind-merge';

/*
 * @codocs [[기술 스택:스타일링]]
 * tailwind-merge가 디자인 토큰 이름을 알게 한다. 기본 설정은 Tailwind 기본 테마 이름(`text-sm`, `border-2`)만 알아서,
 * `border-focus-outer`(두께)와 `border-focus-stroke-outer`(색)를 같은 색 클래스로 보고 앞의 것을 지운다.
 * 이름 목록은 tokens.css와 같아야 하며 merge-class-names.test.ts가 확인한다.
 */
export const TOKEN_NAMES = {
  spacing: ['0', '10', '12', '16', '2', '20', '24', '32', '4', '40', '48', '6', '8'],
  size: [
    'boot-screen-gap',
    'boot-screen-gap-mobile',
    'breadcrumb-item-max-width',
    'button-min-width',
    'caption-button-width',
    'control-height',
    'control-height-large',
    'control-height-small',
    'flyout-width',
    'icon-12',
    'icon-16',
    'icon-20',
    'icon-24',
    'icon-32',
    'icon-48',
    'menu-item-bullet',
    'menu-item-height',
    'menu-item-width',
    'menu-width-view-options',
    'pinned-tile-width',
    'pinned-tile-width-mobile',
    'progress-ring-size',
    'progress-ring-stroke',
    'scroll-area-height',
    'scroll-area-width',
    'scrollbar-thumb-hover',
    'scrollbar-thumb-rest',
    'search-box-height-pill',
    'search-box-width',
    'search-box-width-pill',
    'search-box-width-taskbar',
    'search-panel-height',
    'search-panel-height-mobile',
    'search-panel-preview-icon',
    'search-panel-result-list-width',
    'search-panel-width',
    'search-panel-width-mobile',
    'search-results-height',
    'search-results-height-mobile',
    'search-results-width',
    'search-results-width-mobile',
    'start-menu-height',
    'start-menu-height-mobile',
    'start-menu-width',
    'start-menu-width-mobile',
    'taskbar-button-size',
    'taskbar-height',
    'taskbar-preview-thumbnail-height',
    'taskbar-preview-width',
    'taskbar-width',
    'title-bar-height',
    'title-bar-height-tabbed',
  ],
  radius: ['circular', 'control', 'none', 'overlay', 'small'],
  strokeWidth: ['default', 'focus-outer', 'indicator'],
} as const;

/**
 * 클래스 이름을 합치고, 같은 속성을 정하는 클래스가 겹치면 뒤의 것만 남긴다.
 * 컴포넌트는 기본 클래스 뒤에 사용처의 `className`을 넘겨 사용처가 덮어쓸 수 있게 한다.
 * @codocs [[기술 스택:스타일링]]
 */
export const mergeClassNames = extendTailwindMerge({
  override: {
    theme: {
      // 크기 유틸리티(`w-*`, `h-*`, `size-*`)는 간격과 크기 토큰을 모두 읽는다.
      spacing: [...TOKEN_NAMES.spacing, ...TOKEN_NAMES.size],
      radius: [...TOKEN_NAMES.radius],
    },
  },
  extend: {
    classGroups: {
      'border-w': [{ border: [...TOKEN_NAMES.strokeWidth] }],
      'border-w-x': [{ 'border-x': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-y': [{ 'border-y': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-t': [{ 'border-t': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-r': [{ 'border-r': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-b': [{ 'border-b': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-l': [{ 'border-l': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-s': [{ 'border-s': [...TOKEN_NAMES.strokeWidth] }],
      'border-w-e': [{ 'border-e': [...TOKEN_NAMES.strokeWidth] }],
      // 바깥 선(outline) 두께도 선 두께 토큰을 쓴다(outline-focus-outer는 두께, outline-focus-stroke-outer는 색).
      'outline-w': [{ outline: [...TOKEN_NAMES.strokeWidth] }],
    },
  },
});

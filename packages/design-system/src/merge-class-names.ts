import { extendTailwindMerge } from 'tailwind-merge';

/*
 * @codocs [[기술 스택:스타일링]]
 * tailwind-merge가 디자인 토큰 이름을 알게 한다. 기본 설정은 Tailwind 기본 테마 이름(`text-sm`, `border-2`)만 알아서,
 * `border-focus-outer`(두께)와 `border-focus-stroke-outer`(색)를 같은 색 클래스로 보고 앞의 것을 지운다.
 * 이름 목록은 tokens.css와 같아야 하며 merge-class-names.test.ts가 확인한다.
 */
export const TOKEN_NAMES = {
  spacing: [
    '0',
    '2',
    '4',
    '6',
    '8',
    '10',
    '12',
    '16',
    '20',
    '24',
    '32',
    '40',
    '48',
    'boot-screen-gap',
    'boot-screen-gap-mobile',
    'breadcrumb-item-max-width',
    'button-min-width',
    'caption-button-width',
    'control-height',
    'control-height-large',
    'control-height-small',
    'icon-12',
    'icon-16',
    'icon-20',
    'icon-24',
    'icon-32',
    'icon-48',
    'menu-item-height',
    'progress-ring-size',
    'progress-ring-stroke',
    'scrollbar-thumb-hover',
    'scrollbar-thumb-rest',
    'taskbar-height',
    'taskbar-button-size',
    'taskbar-preview-thumbnail-height',
    'taskbar-preview-width',
    'title-bar-height',
    'title-bar-height-tabbed',
  ],
  radius: ['circular', 'control', 'focus-inner', 'focus-outer', 'none', 'overlay', 'small'],
  text: ['body', 'body-large', 'caption', 'display', 'subtitle', 'title', 'title-large'],
  borderWidth: ['default', 'focus-inner', 'focus-outer', 'indicator'],
} as const;

/**
 * 클래스 이름을 합치고, 같은 속성을 정하는 클래스가 겹치면 뒤의 것만 남긴다.
 * 컴포넌트는 기본 클래스 뒤에 사용처의 `className`을 넘겨 사용처가 덮어쓸 수 있게 한다.
 * @codocs [[기술 스택:스타일링]]
 */
export const mergeClassNames = extendTailwindMerge({
  override: {
    theme: {
      spacing: [...TOKEN_NAMES.spacing],
      radius: [...TOKEN_NAMES.radius],
      text: [...TOKEN_NAMES.text],
    },
  },
  extend: {
    classGroups: {
      'border-w': [{ border: [...TOKEN_NAMES.borderWidth] }],
      'border-w-x': [{ 'border-x': [...TOKEN_NAMES.borderWidth] }],
      'border-w-y': [{ 'border-y': [...TOKEN_NAMES.borderWidth] }],
      'border-w-t': [{ 'border-t': [...TOKEN_NAMES.borderWidth] }],
      'border-w-r': [{ 'border-r': [...TOKEN_NAMES.borderWidth] }],
      'border-w-b': [{ 'border-b': [...TOKEN_NAMES.borderWidth] }],
      'border-w-l': [{ 'border-l': [...TOKEN_NAMES.borderWidth] }],
      'border-w-s': [{ 'border-s': [...TOKEN_NAMES.borderWidth] }],
      'border-w-e': [{ 'border-e': [...TOKEN_NAMES.borderWidth] }],
    },
  },
});

import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/*
 * @codocs [[피그마 연동:토큰 사용 강제]]
 * tailwind-merge가 디자인 토큰 이름을 알게 한다. 기본 설정은 Tailwind 기본 테마 이름(`text-sm`, `border-2`)만 알아서,
 * `border-focus-outer`(두께)와 `border-focus-stroke-outer`(색)를 같은 색 클래스로 보고 앞의 것을 지운다.
 * 이름 목록은 tokens.css와 같아야 하며 cn.test.ts가 확인한다.
 */
export const TOKEN_NAMES = {
  spacing: ['0', '10', '12', '16', '2', '20', '24', '32', '4', '40', '48', '6', '8'],
  size: [
    '1',
    '1000',
    '1016',
    '1024',
    '104',
    '108',
    '1080',
    '112',
    '12',
    '120',
    '1278',
    '1280',
    '14',
    '140',
    '148',
    '16',
    '160',
    '180',
    '188',
    '1920',
    '2',
    '20',
    '200',
    '208',
    '220',
    '24',
    '240',
    '250',
    '258',
    '300',
    '316',
    '318',
    '32',
    '320',
    '34',
    '354',
    '356',
    '36',
    '388',
    '390',
    '4',
    '40',
    '400',
    '448',
    '458',
    '46',
    '465',
    '48',
    '480',
    '489',
    '500',
    '52',
    '522',
    '545',
    '56',
    '569',
    '574',
    '576',
    '6',
    '600',
    '638',
    '64',
    '640',
    '654',
    '660',
    '711',
    '716',
    '720',
    '76',
    '796',
    '798',
    '8',
    '80',
    '800',
    '84',
    '840',
    '844',
    '88',
    '89',
    '9',
    '95',
    '952',
    '96',
    'control-height',
    'icon-12',
    'icon-16',
    'icon-20',
    'icon-24',
    'icon-32',
    'icon-48',
  ],
  radius: ['circular', 'control', 'none', 'overlay', 'small'],
  strokeWidth: ['default', 'focus-outer', 'indicator'],
} as const;

/** 디자인 토큰 이름을 아는 `tailwind-merge`. */
const twMerge = extendTailwindMerge({
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

/**
 * 조건부 클래스를 `clsx`로 풀어 합치고, 같은 속성을 정하는 클래스가 겹치면 뒤의 것만 남긴다.
 * 컴포넌트는 기본 클래스 뒤에 사용처의 `className`을 넘겨 사용처가 덮어쓸 수 있게 한다.
 * @codocs [[피그마 연동:토큰 사용 강제]]
 * @param inputs 클래스 이름, 조건 객체, 배열 등 `clsx`가 받는 값
 * @returns 합친 클래스 문자열
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

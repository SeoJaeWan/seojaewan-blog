import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

import { TOKEN_NAMES } from './token-names';

/** 토큰 이름 목록(생성 파일과 같은 모양) */
export type TokenNameLists = { readonly [key in keyof typeof TOKEN_NAMES]: readonly string[] };

/**
 * 디자인 토큰 이름을 아는 `tailwind-merge`를 만든다. 기본 설정은 Tailwind 기본 테마 이름(`text-sm`, `border-2`)만 알아서,
 * `border-focus-outer`(두께)와 `border-focus-stroke-outer`(색)를 같은 색 클래스로 보고 앞의 것을 지운다.
 * 이름 목록은 `generate:tokens`와 플러그인이 tokens.css와 함께 만든다.
 * @codocs [[피그마 연동:토큰 사용 강제]]
 * @param names 토큰 이름 목록
 * @returns 클래스를 합치는 함수
 */
export function createTokenMerge(names: TokenNameLists): (classes: string) => string {
  return extendTailwindMerge({
    override: {
      theme: {
        // 크기·위치 유틸리티(`w-*`, `h-*`, `size-*`, `top-*`, `translate-*`)는 간격과 크기 토큰을 모두 읽는다.
        spacing: [...names.spacing, ...names.size, ...names.inset, ...names.translate],
        radius: [...names.radius],
      },
    },
    extend: {
      classGroups: {
        'border-w': [{ border: [...names.strokeWidth] }],
        'border-w-x': [{ 'border-x': [...names.strokeWidth] }],
        'border-w-y': [{ 'border-y': [...names.strokeWidth] }],
        'border-w-t': [{ 'border-t': [...names.strokeWidth] }],
        'border-w-r': [{ 'border-r': [...names.strokeWidth] }],
        'border-w-b': [{ 'border-b': [...names.strokeWidth] }],
        'border-w-l': [{ 'border-l': [...names.strokeWidth] }],
        'border-w-s': [{ 'border-s': [...names.strokeWidth] }],
        'border-w-e': [{ 'border-e': [...names.strokeWidth] }],
        // 바깥 선(outline) 두께도 선 두께 토큰을 쓴다(outline-focus-outer는 두께, outline-focus-stroke-outer는 색).
        'outline-w': [{ outline: [...names.strokeWidth] }],
        opacity: [{ opacity: [...names.opacity] }],
        rotate: [{ rotate: [...names.rotate] }],
        z: [{ z: [...names.zIndex] }],
        'line-clamp': [{ 'line-clamp': [...names.lineClamp] }],
        aspect: [{ aspect: [...names.aspect] }],
        'col-start': [{ 'col-start': [...names.gridColumnStart] }],
        'row-start': [{ 'row-start': [...names.gridRowStart] }],
        'border-spacing': [{ 'border-spacing': [...names.borderSpacing] }],
        shrink: [{ shrink: [...names.shrink] }],
        flex: [{ flex: [...names.flex] }],
      },
    },
  });
}

/** 디자인 토큰 이름을 아는 `tailwind-merge`. */
const twMerge = createTokenMerge(TOKEN_NAMES);

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

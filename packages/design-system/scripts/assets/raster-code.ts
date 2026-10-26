/**
 * 래스터 원본(figma/assets/images/)의 형식을 알아내고, 코드 자산(WebP)으로 바꾸는 설정을 정한다.
 * 파일을 읽거나 쓰지 않는 순수 함수다. 인코딩은 asset-files.ts가 sharp로 한다.
 */

/** 래스터 원본 형식. 확장자와 같다 */
export type RasterFormat = 'png' | 'jpg' | 'gif' | 'webp';

/** 사진(JPEG) 원본을 손실 WebP로 바꿀 때의 품질 */
export const WEBP_PHOTO_QUALITY = 80;

/** WebP 인코딩 설정. sharp의 `webp()` 옵션이다 */
export type WebpEncoding = { lossless: true; effort: number } | { quality: number; effort: number };

const WEBP_EFFORT = 4;

/**
 * 바이트 앞부분(매직넘버)으로 래스터 형식을 알아낸다.
 * @param bytes 파일 내용
 * @returns 형식, 모르는 형식이면 undefined
 */
export function rasterFormat(bytes: Uint8Array): RasterFormat | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpg';
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return 'gif';
  }
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && ascii(bytes, 8, 4) === 'WEBP') {
    return 'webp';
  }
  return undefined;
}

/**
 * 원본 형식에 맞는 WebP 인코딩 설정을 정한다. 투명도가 있을 수 있는 PNG·GIF는 무손실로, 사진(JPEG)은 손실 품질
 * WEBP_PHOTO_QUALITY로 바꾼다. 원본이 이미 WebP면 바꾸지 않고 그대로 쓴다.
 * @codocs [[피그마 연동:자산]]
 * @param format 원본 형식
 * @returns 인코딩 설정, 그대로 쓸 원본이면 null
 */
export function webpEncoding(format: RasterFormat): WebpEncoding | null {
  switch (format) {
    case 'jpg':
      return { quality: WEBP_PHOTO_QUALITY, effort: WEBP_EFFORT };
    case 'png':
    case 'gif':
      return { lossless: true, effort: WEBP_EFFORT };
    case 'webp':
      return null;
  }
}

/**
 * 바이트가 주어진 값으로 시작하는지 본다.
 * @param bytes 파일 내용
 * @param prefix 앞부분 값
 * @returns 같으면 true
 */
function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

/**
 * 바이트 일부를 ASCII 글자로 읽는다.
 * @param bytes 파일 내용
 * @param start 시작 위치
 * @param length 길이
 * @returns 글자
 */
function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

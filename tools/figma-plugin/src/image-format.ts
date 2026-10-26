// 이미지 바이트의 실제 형식을 매직넘버로 알아낸다. 래스터 자산 파일의 확장자를 정하는 데 쓴다.
// 코드 자산 생성기(packages/design-system/scripts/assets/raster-code.ts)도 같은 규칙으로 원본 형식을 확인한다.

/** 래스터 자산 원본 형식. 피그마 이미지 칠이 담을 수 있는 형식이고, 확장자와 같다 */
export type RasterExtension = 'png' | 'jpg' | 'gif' | 'webp';

/**
 * 바이트 앞부분(매직넘버)으로 이미지 형식을 알아낸다.
 * @codocs [[피그마 연동:자산]]
 * @param bytes 이미지 바이트
 * @returns 확장자, 모르는 형식이면 undefined
 */
export function rasterExtension(bytes: Uint8Array): RasterExtension | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'jpg';
  }
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return 'gif';
  }
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return 'webp';
  }
  return undefined;
}

/**
 * 바이트가 주어진 값으로 시작하는지 본다.
 * @param bytes 바이트
 * @param prefix 앞부분 값
 * @returns 같으면 true
 */
function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

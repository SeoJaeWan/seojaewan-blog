import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import {
  MAX_DIFF_PIXELS,
  PIXELMATCH_THRESHOLD,
  SHOULD_INCLUDE_ANTI_ALIASING,
} from './parity-config.ts';

export type ComparisonResult =
  | { status: 'pass'; diffPixels: number }
  | { status: 'diff'; diffPixels: number; diff: PNG }
  | { status: 'size-mismatch'; message: string };

/**
 * 피그마 이미지와 스토리 스크린샷을 픽셀 단위로 비교한다. 크기가 다르면 비교하지 않고 실패한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 * @param expected 피그마에서 내보낸 기준 이미지
 * @param actual 스토리 스크린샷
 * @returns 통과 여부, 다른 픽셀 수, 실패하면 차이 이미지
 */
export function compareImages(expected: PNG, actual: PNG): ComparisonResult {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      status: 'size-mismatch',
      message: `이미지 크기가 다르다: 피그마 ${expected.width}×${expected.height}px, 스토리 ${actual.width}×${actual.height}px`,
    };
  }
  const diff = new PNG({ width: expected.width, height: expected.height });
  const diffPixels = pixelmatch(
    expected.data,
    actual.data,
    diff.data,
    expected.width,
    expected.height,
    { threshold: PIXELMATCH_THRESHOLD, includeAA: SHOULD_INCLUDE_ANTI_ALIASING },
  );
  return diffPixels > MAX_DIFF_PIXELS
    ? { status: 'diff', diffPixels, diff }
    : { status: 'pass', diffPixels };
}

/**
 * PNG 파일 내용을 읽는다.
 * @param buffer PNG 파일 내용
 * @returns 디코딩한 이미지
 */
export function readPng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer);
}

/**
 * 이미지를 PNG 파일 내용으로 바꾼다.
 * @param image 이미지
 * @returns PNG 파일 내용
 */
export function writePng(image: PNG): Buffer {
  return PNG.sync.write(image);
}

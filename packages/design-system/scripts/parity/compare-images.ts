import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

import {
  MAX_DIFF_RATIO,
  PIXEL_THRESHOLD,
  SHOULD_INCLUDE_ANTI_ALIASING,
  VECTOR_CHANNEL_THRESHOLD,
  VECTOR_MAX_DIFF_RATIO,
} from './parity-config.ts';

export type ComparisonResult =
  | { status: 'pass'; diffPixels: number; ratio: number }
  | { status: 'diff'; diffPixels: number; ratio: number; diff: PNG }
  | { status: 'size-mismatch'; message: string };

/**
 * 피그마 이미지와 스토리 스크린샷을 픽셀로 비교한다. 다른 픽셀이 이미지 넓이의 MAX_DIFF_RATIO를 넘으면 실패한다.
 * 크기가 다르면 비교하지 않고 실패한다.
 * @codocs [[피그마 일치 검사:픽셀 비교]]
 * @param expected 피그마에서 내보낸 기준 이미지
 * @param actual 스토리 스크린샷
 * @returns 통과 여부, 다른 픽셀 수와 비율, 실패하면 차이 이미지
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
    { threshold: PIXEL_THRESHOLD, includeAA: SHOULD_INCLUDE_ANTI_ALIASING },
  );
  const ratio = diffPixels / (expected.width * expected.height);
  return ratio > MAX_DIFF_RATIO
    ? { status: 'diff', diffPixels, ratio, diff }
    : { status: 'pass', diffPixels, ratio };
}

/**
 * vector 레이어의 피그마 SVG 렌더링과 코드 요소 렌더링을 비교한다. 둘 다 같은 Chromium이 그린 투명 배경 이미지다.
 * 채널(RGBA) 차이가 VECTOR_CHANNEL_THRESHOLD를 넘는 픽셀이 넓이의 VECTOR_MAX_DIFF_RATIO를 넘으면 모양이 다르다.
 * @codocs [[피그마 일치 검사:벡터 비교]]
 * @param expected 피그마 SVG를 그린 이미지
 * @param actual 코드 요소만 그린 이미지
 * @returns 통과 여부, 다른 픽셀 수와 비율, 차이 이미지(다른 픽셀은 빨강)
 */
export function compareVectorImages(expected: PNG, actual: PNG): ComparisonResult {
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      status: 'size-mismatch',
      message: `벡터 이미지 크기가 다르다: 피그마 ${expected.width}×${expected.height}px, 코드 ${actual.width}×${actual.height}px`,
    };
  }
  const diff = new PNG({ width: expected.width, height: expected.height });
  let diffPixels = 0;
  for (let i = 0; i < expected.data.length; i += 4) {
    let channelDiff = 0;
    for (let k = 0; k < 4; k += 1) {
      channelDiff = Math.max(
        channelDiff,
        Math.abs((expected.data[i + k] ?? 0) - (actual.data[i + k] ?? 0)),
      );
    }
    const isDifferent = channelDiff > VECTOR_CHANNEL_THRESHOLD;
    if (isDifferent) {
      diffPixels += 1;
    }
    diff.data.set(
      isDifferent ? [255, 0, 0, 255] : [0, 0, 0, Math.round((expected.data[i + 3] ?? 0) / 4)],
      i,
    );
  }
  const ratio = diffPixels / (expected.width * expected.height);
  return ratio > VECTOR_MAX_DIFF_RATIO
    ? { status: 'diff', diffPixels, ratio, diff }
    : { status: 'pass', diffPixels, ratio };
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

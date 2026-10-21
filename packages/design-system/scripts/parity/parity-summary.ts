/**
 * 피그마 일치 검사 결과(parity-results/summary.json)의 모양. CI는 이 파일로 PR 댓글을 만든다.
 */

import type { CheckFailure } from './compare-values.ts';

export const SUMMARY_FILE = 'summary.json';

/** 변형 결과 폴더(parity-results/<컴포넌트>/<변형>/)의 이미지 묶음 */
export type ResultImages = {
  /** `전체` 또는 vector 레이어 경로 */
  label: string;
  /** 피그마, 브라우저, 차이 순서의 파일 이름 */
  files: string[];
};

export type VariantResult = {
  component: string;
  variant: string;
  failures: CheckFailure[];
  notes: string[];
  images: ResultImages[];
  /** vector 레이어 경로 → 다른 픽셀 비율(통과한 레이어 포함). 허용 기준을 정할 때 쓴다 */
  vectorRatios: Record<string, number>;
  /** 전체 이미지 다른 픽셀 비율. 픽셀로 비교하지 않으면 null */
  pixelRatio: number | null;
};

export type ParitySummary = {
  total: number;
  failed: number;
  results: VariantResult[];
  /** 컴포넌트 폴더 파일 오류(이미지 없음, 가리키지 않는 파일 등) */
  fileErrors: string[];
};

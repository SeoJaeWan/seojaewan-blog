/**
 * 피그마 일치 검사 결과(parity-results/summary.json)의 모양. CI는 이 파일로 PR 댓글을 만든다.
 */

export const SUMMARY_FILE = 'summary.json';

/** 실패 하나 */
export type ParityFailure = {
  /** 레이어 경로(루트는 빈 문자열) 또는 `story`·`export` 같은 단계 이름 */
  layer: string;
  /** 고칠 것을 알려 주는 메시지 */
  message: string;
};

/** 변형 결과 폴더(parity-results/<컴포넌트>/<변형>/)의 이미지 묶음 */
export type ResultImages = {
  /** 이미지 묶음 이름 */
  label: string;
  /** 피그마, 브라우저 순서의 파일 이름 */
  files: string[];
};

export type VariantResult = {
  component: string;
  variant: string;
  failures: ParityFailure[];
  notes: string[];
  images: ResultImages[];
};

export type ParitySummary = {
  total: number;
  failed: number;
  results: VariantResult[];
  /** 컴포넌트 폴더 파일 오류(이미지 없음, 가리키지 않는 파일 등) */
  fileErrors: string[];
};

/**
 * 피그마 일치 검사 결과(parity-results/summary.json)와 캡처 표(parity-results/captures.json)의 모양.
 * CI는 이 파일들로 PR 댓글을 만들고, main에서는 캡처를 parity-captures 브랜치에 올린다.
 */

export const SUMMARY_FILE = 'summary.json';

/** 실패 하나 */
export type ParityFailure = {
  /** 레이어 경로(루트는 빈 문자열) 또는 `story`·`export` 같은 단계 이름 */
  layer: string;
  /** 고칠 것을 알려 주는 메시지 */
  message: string;
};

export type VariantResult = {
  component: string;
  variant: string;
  failures: ParityFailure[];
  notes: string[];
};

export type ParitySummary = {
  total: number;
  failed: number;
  results: VariantResult[];
  /** 컴포넌트 폴더 파일 오류(이미지 없음, 가리키지 않는 파일 등) */
  fileErrors: string[];
};

export const CAPTURES_FILE = 'captures.json';
// 변형 결과 폴더(parity-results/<컴포넌트>/<변형>/)에 남기는 캡처 결과 파일 이름이다.
export const CAPTURE_RESULT_FILE = 'capture.json';
// 변형 결과 폴더에 남기는 캡처 이미지 이름이다.
export const FIGMA_CAPTURE_FILE = 'capture-figma.png';
export const CODE_CAPTURE_FILE = 'capture-code.png';

/** 캡처 표 한 줄(변형과 상태, BOOLEAN 경우 하나) */
export type CaptureRow = {
  component: string;
  /** 결과 이름(변형, BOOLEAN 경우면 `<변형>,<경우>`) */
  variant: string;
  /** 피그마 변형 이름 */
  baseVariant: string;
  /** BOOLEAN 경우면 true */
  isCase: boolean;
  /** parity-results 기준 피그마 캡처 경로. 피그마 PNG가 없으면 null */
  figma: string | null;
  /** parity-results 기준 코드 캡처 경로. 캡처하지 못했으면 null */
  code: string | null;
  /** 캡처하지 못한 이유 */
  error: string | null;
};

export type CaptureSummary = {
  rows: CaptureRow[];
};

/**
 * 캡처 결과(parity-results/captures.json)의 모양.
 * CI는 이 파일로 PR 댓글을 만들고, main에서는 코드 캡처를 parity-captures 브랜치에 올린다.
 */

export const CAPTURES_FILE = 'captures.json';
// run-capture.ts가 고른 대상 목록(JSON 배열)을 Playwright Test에 넘기는 파일이다(결과 폴더 안).
export const SELECTION_FILE = 'selection.json';
// 변형 결과 폴더(<결과>/<대상>/<변형>/)에 남기는 파일 이름이다.
export const CAPTURE_RESULT_FILE = 'capture.json';
export const FIGMA_CAPTURE_FILE = 'figma.png';
export const CODE_CAPTURE_FILE = 'code.png';
export const DIFF_CAPTURE_FILE = 'diff.png';
// Playwright Test에 결과 폴더를 넘기는 환경 변수다.
export const RESULTS_DIR_ENV = 'FIGMA_PARITY_RESULTS';

/** 캡처 표 한 줄(변형과 상태 하나) */
export type CaptureRow = {
  /** 대상(`button`, `patterns/menu/folder`) */
  target: string;
  /** 피그마 이름(`Button`, `Menu/Folder`) */
  name: string;
  /** 변형 파일 이름 */
  variant: string;
  /** 결과 폴더 기준 피그마 그림 경로. 만들지 못했으면 null */
  figma: string | null;
  /** 결과 폴더 기준 코드 그림 경로. 캡처하지 못했으면 null */
  code: string | null;
  /** 결과 폴더 기준 차이 그림 경로. 만들지 못했으면 null */
  diff: string | null;
  /** 캡처하지 못한 이유 */
  error: string | null;
};

export type CaptureSummary = {
  rows: CaptureRow[];
  /** 대상 폴더 오류(PNG 없음, export.json이 가리키지 않는 파일 등) */
  fileErrors: string[];
};

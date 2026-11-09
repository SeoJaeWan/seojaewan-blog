/**
 * 캡처 결과(parity-results/captures.json)의 모양.
 * CI는 이 파일로 PR 댓글을 만들고, main에서는 코드 캡처를 parity-captures 브랜치에 올린다.
 * 컴포넌트와 조립 모두 피그마 그림과 비교한다. 조립은 참고용이고, parity-captures에 저장된 이전 코드 그림과의 비교도 함께 남긴다.
 */

export const CAPTURES_FILE = 'captures.json';
// run-capture.ts가 고른 대상 목록(JSON 배열)을 Playwright Test에 넘기는 파일이다(결과 폴더 안).
export const SELECTION_FILE = 'selection.json';
// 변형 결과 폴더(<결과>/<대상>/<변형>/)에 남기는 파일 이름이다.
export const CAPTURE_RESULT_FILE = 'capture.json';
export const FIGMA_CAPTURE_FILE = 'figma.png';
/** 조립의 이전 코드 그림(parity-captures에서 꺼낸 것) */
export const PREVIOUS_CAPTURE_FILE = 'previous.png';
/** 조립의 이전 코드 그림과 지금 코드 그림의 차이 그림 */
export const PREVIOUS_DIFF_CAPTURE_FILE = 'previous-diff.png';
export const CODE_CAPTURE_FILE = 'code.png';
export const DIFF_CAPTURE_FILE = 'diff.png';
// Playwright Test에 결과 폴더를 넘기는 환경 변수다.
export const RESULTS_DIR_ENV = 'FIGMA_PARITY_RESULTS';
// Playwright Test에 조립의 이전 코드 그림을 읽을 parity-captures 커밋을 넘기는 환경 변수다. 비어 있으면 이전 그림이 없다.
export const PREVIOUS_COMMIT_ENV = 'FIGMA_PARITY_PREVIOUS';

/**
 * 캡처 표 한 줄(변형과 상태 하나).
 * - target: 대상(`button`, `patterns/menu/folder`)
 * - kind: 컴포넌트는 정확히 같아야 하는 기준, 조립은 참고용이다. 둘 다 피그마 그림과 비교한다
 * - name: 피그마 이름(`Button`, `Menu/Folder`)
 * - variant: 변형 파일 이름
 * - figma: 결과 폴더 기준 피그마 그림 경로. 만들지 못했으면 null
 * - previous: 결과 폴더 기준 이전 코드 그림 경로(조립). 컴포넌트이거나 이전 그림이 없으면(새 조립, 새 변형) null
 * - code: 결과 폴더 기준 지금 코드 그림 경로. 캡처하지 못했으면 null
 * - diff: 결과 폴더 기준 피그마 그림과 지금 코드 그림의 차이 그림 경로. 만들지 못했으면 null
 * - previousDiff: 결과 폴더 기준 이전 코드 그림과 지금 코드 그림의 차이 그림 경로(조립). 없으면 null
 * - error: 캡처하지 못한 이유
 */
export type CaptureRow = {
  target: string;
  kind: 'component' | 'pattern';
  name: string;
  variant: string;
  figma: string | null;
  previous: string | null;
  code: string | null;
  diff: string | null;
  previousDiff?: string | null;
  error: string | null;
};

/**
 * 캡처 결과 요약.
 * - fileErrors: 대상 폴더 오류(PNG 없음, export.json이 가리키지 않는 파일 등)
 * - previousCommit: 조립의 이전 코드 그림을 읽은 parity-captures 커밋. 읽지 못했으면 null
 */
export type CaptureSummary = {
  rows: CaptureRow[];
  fileErrors: string[];
  previousCommit?: string | null;
};

import type { ComponentPage } from '../../../packages/design-system/src/figma-contract';
import type { TokenSummary } from './token-changes';

// UI(iframe)와 플러그인 본체가 주고받는 메시지 모양. UI와 본체 양쪽에서 타입으로만 쓴다.

/**
 * 내보낼 수 있는 컴포넌트(세트이거나 변형이 없는 컴포넌트).
 * - page: 놓인 페이지(Controls·Shell·Blog). 목록은 페이지로 묶는다
 * - variantCount: 변형 수. 변형이 없는 컴포넌트는 1
 */
export type ComponentSummary = {
  id: string;
  name: string;
  page: ComponentPage;
  variantCount: number;
};

/** 내보내기 대상 종류 */
export type TargetKind = 'tokens' | 'assets' | 'component';

/**
 * PR 하나에 한 커밋.
 * - target: 컴포넌트 이름, 또는 `토큰`, `자산`
 * - kind: PR 종류. 결과 화면이 종류별로 묶는다
 * - branch: 커밋한 브랜치
 * - commitUrl: 만든 커밋 주소
 * - pullRequestUrl: PR 주소
 * - isNewPullRequest: 이번에 새로 연 PR이면 true, 열린 PR에 이어서 커밋했으면 false
 */
export type PullRequestCommit = {
  target: string;
  kind: TargetKind;
  branch: string;
  commitUrl: string;
  pullRequestUrl: string;
  isNewPullRequest: boolean;
};

/** 구조 검사 위반 한 줄(core/check-structure.ts의 Violation과 같은 모양). nodeId: "피그마에서 보기"로 선택할 노드. 가리킬 노드가 없으면 null. */
export type ViolationLine = {
  where: string;
  reason: string;
  fix: string;
  nodeId: string | null;
};

/** 한 대상의 위반. target: 대상 이름(컴포넌트 이름이나 `토큰`, `자산`). */
export type ViolationGroup = {
  target: string;
  kind: TargetKind;
  violations: ViolationLine[];
};

/**
 * 내보내기 결과. 구조 검사 위반이 있으면 아무것도 커밋하지 않고 대상별 위반 목록을 돌려준다.
 * - commits: 커밋한 PR
 * - unchanged: 바뀐 것이 없어 커밋하지 않은 대상
 */
export type ExportOutcome =
  | { kind: 'done'; commits: PullRequestCommit[]; unchanged: string[] }
  | { kind: 'blocked'; groups: ViolationGroup[] };

/**
 * 내보내기 진행. 검사(대상마다)와 커밋(PR마다) 두 단계다.
 * - done: 이 단계에서 끝난 수
 * - total: 이 단계의 전체 수
 * - text: 지금 하는 일
 */
export type ExportProgress = {
  phase: 'check' | 'commit';
  done: number;
  total: number;
  text: string;
};

/**
 * 저장소와 비교한 목록 상태.
 * - tokens: 토큰 변경. 피그마 토큰을 변환하지 못했으면 null
 * - tokensError: 토큰 변환 실패 이유
 * - newIds: 저장소 `main`에 스키마가 없는 컴포넌트의 노드 ID
 */
export type RepoStatus =
  /** GitHub 토큰이 없어 비교하지 못함 */
  | { kind: 'missing-token' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      tokens: TokenSummary | null;
      tokensError: string | null;
      newIds: string[];
    };

/** GitHub 연결 확인 결과 */
export type ConnectionResult =
  { ok: true; repo: string; canPush: boolean } | { ok: false; message: string };

/**
 * 설정 화면에 보이는 고정 값.
 * - repo: `owner/name`
 * - rulesUrl: 플러그인 규칙 문서 주소
 * - newTokenUrl: fine-grained 토큰 만들기 주소
 */
export type PluginSettings = {
  repo: string;
  fileKey: string;
  rulesUrl: string;
  newTokenUrl: string;
};

/**
 * 본체 → UI.
 * - components: 페이지 순서(Controls → Shell → Blog), 페이지 안은 캔버스 순서의 컴포넌트
 */
export type MainMessage =
  | {
      type: 'init';
      token: string;
      settings: PluginSettings;
      components: ComponentSummary[];
    }
  | { type: 'repo-status'; status: RepoStatus }
  | { type: 'connection'; result: ConnectionResult }
  | { type: 'log'; text: string }
  | { type: 'progress'; progress: ExportProgress }
  /** 막지 않는 알림(쓰는 곳이 없는 변수·스타일 등) */
  | { type: 'notices'; notices: string[] }
  | { type: 'done'; result: ExportOutcome }
  | { type: 'failed'; message: string };

/**
 * 내보내기 요청.
 * - isTokensSelected: 토큰을 내보낼 대상으로 골랐는지. 다른 대상을 내보낼 때는 고르지 않아도 토큰을 비교한다
 * - isAssetsSelected: 자산을 내보낼 대상으로 골랐는지
 * - componentIds: 내보낼 컴포넌트
 */
export type ExportMessage = {
  type: 'export';
  token: string;
  isTokensSelected: boolean;
  isAssetsSelected: boolean;
  componentIds: string[];
};

/** UI → 본체 */
export type UiMessage =
  | ExportMessage
  /** 토큰을 저장한다. 빈 문자열이면 지운다 */
  | { type: 'save-token'; token: string }
  /** 저장소를 읽어 연결과 쓰기 권한을 확인한다 */
  | { type: 'check-connection'; token: string }
  /** 저장소와 다시 비교한다 */
  | { type: 'refresh-status'; token: string }
  /** 노드를 선택하고 화면을 옮긴다 */
  | { type: 'focus-node'; nodeId: string };

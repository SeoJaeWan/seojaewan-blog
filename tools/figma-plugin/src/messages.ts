import type { TokenSummary } from './token-changes';

// UI(iframe)와 플러그인 본체가 주고받는 메시지 모양. UI와 본체 양쪽에서 타입으로만 쓴다.

/** 페이지에서 찾은 컴포넌트나 조립 */
export type ComponentSummary = {
  id: string;
  name: string;
  kind: 'COMPONENT_SET' | 'COMPONENT';
  variantCount: number;
  /** 묶음 이름. 컴포넌트는 01 · Components의 영역 섹션, 조립은 이름의 영역(`Menu/Folder` → `Menu`) */
  group: string;
};

/** UI 목록에 보이는 애니메이션 견본 */
export type MotionSummary = { id: string; name: string };

/** 내보내기 대상 종류 */
export type TargetKind = 'tokens' | 'component' | 'pattern' | 'motion';

/** PR 하나에 한 커밋(컴포넌트·조립·애니메이션·토큰 PR) */
export type PullRequestCommit = {
  /** 컴포넌트 이름, 조립 PR이면 `<영역> 조립`, 애니메이션 PR이면 견본 이름, 토큰 PR이면 `토큰` */
  target: string;
  /** PR 종류. 결과 화면이 종류별로 묶는다 */
  kind: TargetKind;
  /** 커밋한 브랜치 */
  branch: string;
  /** 만든 커밋 주소 */
  commitUrl: string;
  /** PR 주소 */
  pullRequestUrl: string;
  /** 이번에 새로 연 PR이면 true, 열린 PR에 이어서 커밋했으면 false */
  isNewPullRequest: boolean;
};

/** 구조 검사 위반 한 줄(core/check-structure.ts의 Violation과 같은 모양) */
export type ViolationLine = {
  where: string;
  reason: string;
  fix: string;
  /** "피그마에서 보기"로 선택할 노드. 가리킬 노드가 없으면 null */
  nodeId: string | null;
};

/** 한 대상의 위반 */
export type ViolationGroup = {
  /** 대상 이름(컴포넌트·조립·견본 이름이나 `토큰`) */
  target: string;
  kind: TargetKind;
  violations: ViolationLine[];
};

/** 내보내기 결과. 구조 검사 위반이 있으면 아무것도 커밋하지 않고 대상별 위반 목록을 돌려준다 */
export type ExportOutcome =
  | {
      kind: 'done';
      /** 커밋한 PR */
      commits: PullRequestCommit[];
      /** 바뀐 것이 없어 커밋하지 않은 대상 */
      unchanged: string[];
    }
  | { kind: 'blocked'; groups: ViolationGroup[] };

/** 내보내기 진행. 검사(대상마다)와 커밋(PR마다) 두 단계다 */
export type ExportProgress = {
  phase: 'check' | 'commit';
  /** 이 단계에서 끝난 수 */
  done: number;
  /** 이 단계의 전체 수 */
  total: number;
  /** 지금 하는 일 */
  text: string;
};

/** 저장소와 비교한 목록 상태 */
export type RepoStatus =
  /** GitHub 토큰이 없어 비교하지 못함 */
  | { kind: 'missing-token' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | {
      kind: 'ready';
      /** 토큰 변경. 피그마 토큰을 변환하지 못했으면 null */
      tokens: TokenSummary | null;
      /** 토큰 변환 실패 이유 */
      tokensError: string | null;
      /** 저장소 `main`에 폴더(애니메이션은 json)가 없는 대상의 노드 ID */
      newIds: string[];
    };

/** GitHub 연결 확인 결과 */
export type ConnectionResult =
  { ok: true; repo: string; canPush: boolean } | { ok: false; message: string };

/** 설정 화면에 보이는 고정 값 */
export type PluginSettings = {
  /** `owner/name` */
  repo: string;
  fileKey: string;
  /** PR 규칙 문서 주소 */
  rulesUrl: string;
  /** fine-grained 토큰 만들기 주소 */
  newTokenUrl: string;
};

/** 본체 → UI */
export type MainMessage =
  | {
      type: 'init';
      token: string;
      settings: PluginSettings;
      /** 캔버스 순서(위→아래 행, 행 안 왼→오른)의 컴포넌트 */
      components: ComponentSummary[];
      /** 캔버스 순서의 조립 */
      patterns: ComponentSummary[];
      motions: MotionSummary[];
      /** 모션 API를 쓸 수 없어 애니메이션을 내보낼 수 없으면 그 안내. 쓸 수 있으면 null */
      motionUnavailable: string | null;
    }
  | { type: 'repo-status'; status: RepoStatus }
  | { type: 'connection'; result: ConnectionResult }
  | { type: 'log'; text: string }
  | { type: 'progress'; progress: ExportProgress }
  /** 막지 않는 알림(쓰는 곳이 없는 변수·스타일, 건너뛴 애니메이션 등) */
  | { type: 'notices'; notices: string[] }
  | { type: 'done'; result: ExportOutcome }
  | { type: 'failed'; message: string };

/** 내보내기 요청 */
export type ExportMessage = {
  type: 'export';
  token: string;
  /** 토큰을 내보낼 대상으로 골랐는지. 다른 대상을 내보낼 때는 고르지 않아도 토큰을 비교한다 */
  tokens: boolean;
  /** 내보낼 컴포넌트 */
  componentIds: string[];
  /** 내보낼 조립 */
  patternIds: string[];
  /** 내보낼 애니메이션 견본 */
  motionIds: string[];
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

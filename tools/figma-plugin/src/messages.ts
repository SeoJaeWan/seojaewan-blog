// UI(iframe)와 플러그인 본체가 주고받는 메시지 모양. UI와 본체 양쪽에서 타입으로만 쓴다.

/** UI 목록에 보이는 컴포넌트나 조립 */
export type ComponentSummary = {
  id: string;
  name: string;
  kind: 'COMPONENT_SET' | 'COMPONENT';
  variantCount: number;
};

/** UI 목록에 보이는 애니메이션 견본 */
export type MotionSummary = { id: string; name: string };

/** PR 하나에 한 커밋(컴포넌트·조립·애니메이션·토큰 PR) */
export type PullRequestCommit = {
  /** 컴포넌트 이름, 조립 PR이면 `<영역> 조립`, 애니메이션 PR이면 견본 이름, 토큰 PR이면 `토큰` */
  target: string;
  /** 커밋한 브랜치 */
  branch: string;
  /** 만든 커밋 주소 */
  commitUrl: string;
  /** PR 주소 */
  pullRequestUrl: string;
  /** 이번에 새로 연 PR이면 true, 열린 PR에 이어서 커밋했으면 false */
  isNewPullRequest: boolean;
};

/** 내보내기 결과. 구조 검사 위반이 있으면 아무것도 커밋하지 않고 위반 목록을 돌려준다 */
export type ExportOutcome =
  | {
      kind: 'done';
      /** 커밋한 PR */
      commits: PullRequestCommit[];
      /** 바뀐 것이 없어 커밋하지 않은 대상 */
      unchanged: string[];
    }
  | { kind: 'blocked'; violations: { where: string; reason: string; fix: string }[] };

/** 본체 → UI */
export type MainMessage =
  | {
      type: 'init';
      token: string;
      components: ComponentSummary[];
      patterns: ComponentSummary[];
      motions: MotionSummary[];
      /** 모션 API를 쓸 수 없어 애니메이션을 내보낼 수 없으면 그 안내. 쓸 수 있으면 null */
      motionUnavailable: string | null;
    }
  | { type: 'log'; text: string }
  /** 막지 않는 알림(쓰는 곳이 없는 변수·스타일, 건너뛴 애니메이션 등) */
  | { type: 'notices'; notices: string[] }
  | { type: 'done'; result: ExportOutcome }
  | { type: 'failed'; message: string };

/** UI → 본체 */
export type UiMessage = {
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

// UI(iframe)와 플러그인 본체가 주고받는 메시지 모양. UI와 본체 양쪽에서 타입으로만 쓴다.

/** UI 목록에 보이는 컴포넌트 */
export type ComponentSummary = {
  id: string;
  name: string;
  kind: 'COMPONENT_SET' | 'COMPONENT';
  variantCount: number;
};

/** PR 하나에 한 커밋(컴포넌트 PR이나 토큰 PR) */
export type PullRequestCommit = {
  /** 컴포넌트 이름, 토큰 PR이면 `토큰` */
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
  | { type: 'init'; token: string; components: ComponentSummary[] }
  | { type: 'log'; text: string }
  /** 쓰는 곳이 없는 변수·스타일 알림(G2, 막지 않음) */
  | { type: 'notices'; notices: string[] }
  | { type: 'done'; result: ExportOutcome }
  | { type: 'failed'; message: string };

/** UI → 본체 */
export type UiMessage = {
  type: 'export';
  token: string;
  /** 내보낼 컴포넌트. 비어 있으면 토큰만 확인한다 */
  componentIds: string[];
};

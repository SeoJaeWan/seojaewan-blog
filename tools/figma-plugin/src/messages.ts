// UI(iframe)와 플러그인 본체가 주고받는 메시지 모양. UI와 본체 양쪽에서 타입으로만 쓴다.

/** UI 목록에 보이는 컴포넌트 */
export type ComponentSummary = {
  id: string;
  name: string;
  kind: 'COMPONENT_SET' | 'COMPONENT';
  variantCount: number;
};

/** 본체 → UI */
export type MainMessage =
  | { type: 'init'; token: string; branch: string; components: ComponentSummary[] }
  | { type: 'log'; text: string }
  /** 쓰는 곳이 없는 변수·스타일 알림(G2, 막지 않음) */
  | { type: 'notices'; notices: string[] }
  | {
      type: 'done';
      /** 커밋 결과, 바뀐 것 없음, 또는 구조 검사 위반 목록 */
      result:
        | {
            kind: 'committed';
            commit: {
              branch: string;
              commitUrl: string;
              pullRequestUrl: string | null;
              isNewPullRequest: boolean;
            };
          }
        | { kind: 'unchanged' }
        | { kind: 'blocked'; violations: { where: string; reason: string; fix: string }[] };
    }
  | { type: 'failed'; message: string };

/** UI → 본체 */
export type UiMessage = {
  type: 'export';
  token: string;
  componentIds: string[];
  shouldExportTokens: boolean;
  /** 커밋할 기존 브랜치. 비어 있으면 새 브랜치와 PR을 만든다 */
  branch: string;
};

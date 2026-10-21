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
  | { type: 'init'; token: string; components: ComponentSummary[] }
  | { type: 'log'; text: string }
  | { type: 'done'; pullRequestUrl: string | null }
  | { type: 'failed'; message: string };

/** UI → 본체 */
export type UiMessage = {
  type: 'export';
  token: string;
  componentIds: string[];
  shouldExportTokens: boolean;
};

/**
 * notion 영역의 콘텐츠 계약 — ui가 "그리는 데 필요한 데이터 모양"을 선언한다.
 * sync 레이어 매퍼가 공식 API 응답(@notionhq/client)을 이 타입으로 변환하므로
 * ui는 Notion API 와이어 포맷에 의존하지 않는다 (.codex/notion/pipeline.md 결정 2).
 * union에 없는 블록은 매퍼가 경고 후 건너뛴다 — 지원 목록은 블록 인벤토리로 확정한다.
 */

/** Notion 색상 팔레트 — 텍스트 색과 배경색(_background) */
export type NotionColor =
  | "blue"
  | "blue_background"
  | "brown"
  | "brown_background"
  | "default"
  | "gray"
  | "gray_background"
  | "green"
  | "green_background"
  | "orange"
  | "orange_background"
  | "pink"
  | "pink_background"
  | "purple"
  | "purple_background"
  | "red"
  | "red_background"
  | "yellow"
  | "yellow_background";

/** 인라인 텍스트 조각 — 원본 rich_text 배열의 항목 하나에 대응 */
export interface NotionRichTextSpan {
  annotations?: {
    bold?: boolean;
    code?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
  };
  /** 텍스트 색/배경색 (기본 default) */
  color?: NotionColor;
  /** 링크 URL — 지정 시 새 탭 anchor로 렌더 */
  href?: string;
  text: string;
}

/** 리스트 항목 — 연속된 list_item 블록은 매퍼가 하나의 리스트로 그룹핑한다 */
export interface NotionListItem {
  children?: NotionBlockNode[];
  richText: NotionRichTextSpan[];
}

/**
 * 본문 블록 트리. 이미지 src는 매퍼가 자산화된 경로로 교체한 뒤 전달한다 —
 * ui는 만료되는 Notion 서명 URL을 알지 못한다.
 */
export type NotionBlockNode =
  | {
      type: "bulletedList";
      items: NotionListItem[];
    }
  | {
      type: "callout";
      children?: NotionBlockNode[];
      color?: NotionColor;
      /** 이모지 아이콘 (없으면 기본 💡) */
      icon?: string;
      richText: NotionRichTextSpan[];
    }
  | {
      type: "code";
      caption?: string;
      code: string;
      language: string;
    }
  | {
      type: "columnList";
      columns: NotionBlockNode[][];
    }
  | {
      type: "divider";
    }
  | {
      /** KaTeX 렌더는 후속 — v1은 수식 원문을 코드 스타일로 표시한다 */
      type: "equation";
      expression: string;
    }
  | {
      type: "heading";
      color?: NotionColor;
      level: 1 | 2 | 3;
      richText: NotionRichTextSpan[];
    }
  | {
      type: "image";
      alt?: string;
      caption?: NotionRichTextSpan[];
      /** 자산화된 이미지 경로 (예: /notion/{hash}.png) */
      src: string;
    }
  | {
      type: "numberedList";
      items: NotionListItem[];
    }
  | {
      type: "paragraph";
      children?: NotionBlockNode[];
      color?: NotionColor;
      richText: NotionRichTextSpan[];
    }
  | {
      type: "quote";
      children?: NotionBlockNode[];
      color?: NotionColor;
      richText: NotionRichTextSpan[];
    }
  | {
      type: "table";
      hasColumnHeader?: boolean;
      hasRowHeader?: boolean;
      /** rows → cells → rich text spans */
      rows: NotionRichTextSpan[][][];
    }
  | {
      type: "toggle";
      children?: NotionBlockNode[];
      color?: NotionColor;
      richText: NotionRichTextSpan[];
    };

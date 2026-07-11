import type { ReactNode } from "react";

export interface NotionColumnsProps {
  /** 렌더된 컬럼 내용 — 블록 재귀는 NotionContent가 소유하고 여기서는 slot으로 받는다 */
  columns: ReactNode[];
}

/**
 * 컬럼 레이아웃 블록 (원본 Notion column_list + column 대응).
 * 데스크톱에서 균등 폭 가로 배치, 좁은 화면에서는 세로로 쌓는다.
 * 원본 컬럼 비율은 공식 API가 제공하지 않으므로 균등 분할만 지원한다
 * (.codex/notion/pipeline.md의 공식 API 한계 항목).
 *
 * @param props.columns NotionContent가 재귀 렌더링해 넘기는 컬럼별 block content
 */
export const NotionColumns = ({ columns }: NotionColumnsProps) => (
  <div className="wb-notion-columns">
    {columns.map((column, index) => (
      <div className="wb-notion-columns__column" key={index}>
        {column}
      </div>
    ))}
  </div>
);

import { NotionRichTextUI } from "../../notionRichTextUI";
import type { NotionRichTextSpan } from "../../types";

export interface NotionTableUIProps {
  /** 첫 행을 열 머리글로 표시 */
  hasColumnHeader?: boolean;
  /** 각 행의 첫 셀을 행 머리글로 표시 */
  hasRowHeader?: boolean;
  /** rows → cells → rich text spans */
  rows: NotionRichTextSpan[][][];
}

/**
 * 표 블록 (원본 Notion table + table_row 대응 — 원본 프로젝트에서 placeholder로
 * 남아 있던 블록). 머리글 행/열은 Notion처럼 회색 배경으로 구분한다.
 *
 * @param props.rows rows -> cells -> rich text spans 형태의 table content
 * @param props.hasColumnHeader true이면 첫 행을 열 머리글로 표시한다
 * @param props.hasRowHeader true이면 각 행의 첫 셀을 행 머리글로 표시한다
 */
export const NotionTableUI = ({
  hasColumnHeader = false,
  hasRowHeader = false,
  rows,
}: NotionTableUIProps) => {
  const [headerRow, ...bodyRows] = hasColumnHeader ? rows : [undefined, ...rows];

  const renderCell = (cell: NotionRichTextSpan[], cellIndex: number, isHeaderRow: boolean) => {
    const isHeader = isHeaderRow || (hasRowHeader && cellIndex === 0);
    const CellTag = isHeader ? "th" : "td";

    return (
      <CellTag
        className="wb-notion-table__cell"
        key={cellIndex}
        scope={isHeaderRow ? "col" : undefined}
      >
        <NotionRichTextUI spans={cell} />
      </CellTag>
    );
  };

  return (
    <div className="wb-notion-table">
      <table className="wb-notion-table__table">
        {headerRow ? (
          <thead>
            <tr>{headerRow.map((cell, cellIndex) => renderCell(cell, cellIndex, true))}</tr>
          </thead>
        ) : null}
        <tbody>
          {bodyRows.map((row, rowIndex) =>
            row ? (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => renderCell(cell, cellIndex, false))}
              </tr>
            ) : null,
          )}
        </tbody>
      </table>
    </div>
  );
};

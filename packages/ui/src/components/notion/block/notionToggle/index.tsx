import type { ReactNode } from "react";

import { clsx } from "clsx";

import { notionColorClass, NotionRichText } from "../../notionRichText";
import type { NotionColor, NotionRichTextSpan } from "../../types";

export interface NotionToggleProps {
  /** 렌더된 자식 블록 — 재귀는 NotionContent가 소유하고 여기서는 slot으로 받는다 */
  children?: ReactNode;
  /** summary 텍스트에 적용할 Notion 색상 클래스. */
  color?: NotionColor;
  /** 처음부터 펼친 상태로 렌더 (스토리/문서용) */
  defaultOpen?: boolean;
  /** summary 안에 렌더할 rich text span 목록. */
  richText: NotionRichTextSpan[];
}

/**
 * 토글 블록 (원본 Notion toggle 대응).
 * native details/summary로 접기/펼치기를 제공하고, 화살표 마커는 CSS로
 * Notion처럼 회전시킨다. 자식 블록이 없으면 마커를 흐리게 둔다.
 *
 * @param props.richText summary 안에 렌더할 rich text span 목록
 * @param props.children 펼쳤을 때 보여줄 렌더된 자식 블록
 * @param props.color summary 텍스트에 적용할 Notion 색상
 * @param props.defaultOpen 처음부터 펼친 상태로 렌더할지 여부
 */
export const NotionToggle = ({
  children,
  color,
  defaultOpen = false,
  richText,
}: NotionToggleProps) => (
  <details
    className={clsx("wb-notion-toggle", notionColorClass(color))}
    data-empty={children ? undefined : "true"}
    open={defaultOpen}
  >
    <summary className="wb-notion-toggle__summary">
      <NotionRichText spans={richText} />
    </summary>
    {children ? <div className="wb-notion-toggle__content">{children}</div> : null}
  </details>
);

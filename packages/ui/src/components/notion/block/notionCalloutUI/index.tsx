import type { ReactNode } from "react";

import { clsx } from "clsx";

import { notionColorClass, NotionRichTextUI } from "../../notionRichTextUI";
import type { NotionColor, NotionRichTextSpan } from "../../types";

export interface NotionCalloutUIProps {
  /** 렌더된 자식 블록 — 재귀는 NotionContentUI가 소유하고 여기서는 slot으로 받는다 */
  children?: ReactNode;
  /** Notion callout 색상. *_background는 채운 박스, 일반 색은 plain variant로 처리한다. */
  color?: NotionColor;
  /** 이모지 아이콘 (기본 💡) */
  icon?: string;
  /** callout 본문 rich text span 목록. */
  richText: NotionRichTextSpan[];
}

/**
 * 콜아웃 블록 (원본 Notion callout 대응).
 * 배경색 계열(color: *_background 또는 미지정)은 채운 박스로, 텍스트색 계열은
 * 테두리 박스로 그린다 — Notion의 동작과 동일.
 *
 * @param props.richText callout 본문에 렌더할 rich text span 목록
 * @param props.children callout 본문 아래에 이어 붙일 렌더된 자식 블록
 * @param props.color Notion callout 색상
 * @param props.icon 왼쪽에 표시할 이모지 아이콘. 기본값은 "💡"
 */
export const NotionCalloutUI = ({
  children,
  color,
  icon = "💡",
  richText,
}: NotionCalloutUIProps) => {
  const isPlainColor = color !== undefined && color !== "default" && !color.endsWith("_background");

  return (
    <aside
      className={clsx(
        "wb-notion-callout",
        isPlainColor && "wb-notion-callout--plain",
        notionColorClass(color),
      )}
    >
      <span aria-hidden="true" className="wb-notion-callout__icon">
        {icon}
      </span>
      <div className="wb-notion-callout__body">
        <p className="wb-notion-callout__text">
          <NotionRichTextUI spans={richText} />
        </p>
        {children}
      </div>
    </aside>
  );
};

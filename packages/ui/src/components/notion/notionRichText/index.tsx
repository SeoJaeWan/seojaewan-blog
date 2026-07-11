import type { ReactNode } from "react";
import { Fragment } from "react";

import type { NotionColor, NotionRichTextSpan } from "../types";

/** Notion 색상 → CSS 클래스. default(또는 미지정)는 클래스 없음 */
export const notionColorClass = (color?: NotionColor): string | undefined =>
  color && color !== "default" ? `wb-notion-color--${color}` : undefined;

/**
 * NotionRichText가 렌더링할 Notion rich text span 목록.
 */
export interface NotionRichTextProps {
  /** text, href, color, annotations를 포함한 inline span 배열. */
  spans: NotionRichTextSpan[];
}

/**
 * 인라인 rich text 렌더러 — annotation(bold/italic/code/취소선/밑줄), 색/배경색,
 * 링크를 중첩 엘리먼트로 조립한다. 블록 컴포넌트와 NotionContent가 제목·본문·캡션
 * 어디서든 공유하는 notion 영역의 최소 단위다.
 *
 * @param props.spans text, href, color, annotations를 포함한 inline span 배열
 */
export const NotionRichText = ({ spans }: NotionRichTextProps) => (
  <>
    {spans.map((span, index) => (
      <Fragment key={index}>{renderSpan(span)}</Fragment>
    ))}
  </>
);

const renderSpan = (span: NotionRichTextSpan): ReactNode => {
  const { annotations = {}, color, href, text } = span;
  let node: ReactNode = text;

  // 안쪽부터 감싼다: code → bold → italic → 취소선 → 밑줄 → 색 → 링크(최외곽)
  if (annotations.code) {
    node = <code className="wb-notion-rich-text__code">{node}</code>;
  }
  if (annotations.bold) {
    node = <strong>{node}</strong>;
  }
  if (annotations.italic) {
    node = <em>{node}</em>;
  }
  if (annotations.strikethrough) {
    node = <del>{node}</del>;
  }
  if (annotations.underline) {
    node = <u>{node}</u>;
  }

  const colorClass = notionColorClass(color);
  if (colorClass) {
    node = <span className={colorClass}>{node}</span>;
  }

  if (href) {
    node = (
      <a
        className="wb-notion-rich-text__link"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {node}
      </a>
    );
  }

  return node;
};

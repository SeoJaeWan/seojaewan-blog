import { NotionRichTextUI } from "../../notionRichTextUI";
import type { NotionRichTextSpan } from "../../types";

export interface NotionImageUIProps {
  /** img alt 텍스트. 없으면 장식 이미지처럼 빈 문자열로 렌더한다. */
  alt?: string;
  /** 이미지 아래 figcaption으로 렌더할 rich text span 목록. */
  caption?: NotionRichTextSpan[];
  /** 자산화된 이미지 경로 — 매퍼가 만료되는 Notion 서명 URL을 교체해서 넘긴다 */
  src: string;
}

/**
 * 이미지 블록 (원본 Notion image 대응).
 * src는 sync 단계에서 자산화된 경로를 받으므로 만료를 알지 못한다.
 * 클릭 확대(라이트박스)는 후속.
 *
 * @param props.src sync 단계에서 자산화해 넘기는 이미지 경로
 * @param props.alt img alt 텍스트. 없으면 장식 이미지처럼 빈 문자열로 렌더한다
 * @param props.caption 이미지 아래 figcaption으로 렌더할 rich text span 목록
 */
export const NotionImageUI = ({ alt, caption, src }: NotionImageUIProps) => {
  const hasCaption = caption !== undefined && caption.length > 0;

  return (
    <figure className="wb-notion-image">
      <img alt={alt ?? ""} className="wb-notion-image__img" loading="lazy" src={src} />
      {hasCaption ? (
        <figcaption className="wb-notion-image__caption">
          <NotionRichTextUI spans={caption} />
        </figcaption>
      ) : null}
    </figure>
  );
};

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Fragment } from "react";

import { clsx } from "clsx";

import { NotionCallout } from "../block/notionCallout";
import type { NotionCodeBlockProps } from "../block/notionCodeBlock";
import { NotionCodeBlock } from "../block/notionCodeBlock";
import { NotionColumns } from "../block/notionColumns";
import { NotionImage } from "../block/notionImage";
import { NotionTable } from "../block/notionTable";
import { NotionToggle } from "../block/notionToggle";
import { notionColorClass, NotionRichText } from "../notionRichText";
import type { NotionBlockNode, NotionListItem } from "../types";

/** Notion block tree와 block별 visual renderer를 전달하는 props. */
export interface NotionContentProps extends ComponentPropsWithoutRef<"div"> {
  /** sync 레이어가 만든 Notion block tree. 순서대로 블록 컴포넌트에 매핑된다. */
  blocks: NotionBlockNode[];
  /** code block visual을 교체할 renderer. 기본값은 NotionCodeBlock이다. */
  renderCodeBlock?: (props: NotionCodeBlockProps) => ReactNode;
}

type NotionCodeBlockRenderer = NonNullable<NotionContentProps["renderCodeBlock"]>;

const renderDefaultCodeBlock: NotionCodeBlockRenderer = (props) => <NotionCodeBlock {...props} />;

/**
 * Notion 본문 렌더러 — sync 레이어 매퍼가 만든 블록 트리(NotionBlockNode[])를 받아
 * 블록 타입별 컴포넌트로 매핑한다 (원본 NotionViewer + react-notion-x 대체).
 * 자식 블록 재귀와 들여쓰기는 여기가 소유하고, 블록 컴포넌트(callout/toggle/columns)는
 * 렌더된 자식을 slot으로만 받는다. 타이포/간격/팔레트는 wb-notion-content가 소유한다.
 *
 * @param props.blocks sync 레이어가 만든 Notion block tree
 * @param props.className Notion content root에 추가할 className
 * @param props.renderCodeBlock code block visual을 조립할 renderer. 기본값은 NotionCodeBlock
 */
export const NotionContent = ({
  blocks,
  className,
  renderCodeBlock = renderDefaultCodeBlock,
  ...props
}: NotionContentProps) => (
  <div className={clsx("wb-notion-content", className)} {...props}>
    <NotionBlocks blocks={blocks} renderCodeBlock={renderCodeBlock} />
  </div>
);

interface NotionBlocksProps {
  blocks: NotionBlockNode[];
  renderCodeBlock: NotionCodeBlockRenderer;
}

const NotionBlocks = ({ blocks, renderCodeBlock }: NotionBlocksProps) => (
  <>
    {blocks.map((block, index) => (
      <Fragment key={index}>{renderBlock(block, renderCodeBlock)}</Fragment>
    ))}
  </>
);

/** 자식 블록 들여쓰기 래퍼 — 자식이 없으면 아무것도 그리지 않는다 */
const renderChildren = (
  children: NotionBlockNode[] | undefined,
  renderCodeBlock: NotionCodeBlockRenderer,
): ReactNode =>
  children && children.length > 0 ? (
    <div className="wb-notion-content__children">
      <NotionBlocks blocks={children} renderCodeBlock={renderCodeBlock} />
    </div>
  ) : null;

const renderListItems = (items: NotionListItem[], renderCodeBlock: NotionCodeBlockRenderer) =>
  items.map((item, index) => (
    <li className="wb-notion-content__list-item" key={index}>
      <NotionRichText spans={item.richText} />
      {renderChildren(item.children, renderCodeBlock)}
    </li>
  ));

const renderBlock = (
  block: NotionBlockNode,
  renderCodeBlock: NotionCodeBlockRenderer,
): ReactNode => {
  switch (block.type) {
    case "paragraph":
      return (
        <>
          <p className={clsx("wb-notion-content__paragraph", notionColorClass(block.color))}>
            <NotionRichText spans={block.richText} />
          </p>
          {renderChildren(block.children, renderCodeBlock)}
        </>
      );

    case "heading": {
      const HeadingTag = `h${block.level}` as const;
      return (
        <HeadingTag
          className={clsx(
            `wb-notion-content__heading wb-notion-content__heading--${block.level}`,
            notionColorClass(block.color),
          )}
        >
          <NotionRichText spans={block.richText} />
        </HeadingTag>
      );
    }

    case "bulletedList":
      return (
        <ul className="wb-notion-content__list">{renderListItems(block.items, renderCodeBlock)}</ul>
      );

    case "numberedList":
      return (
        <ol className="wb-notion-content__list">{renderListItems(block.items, renderCodeBlock)}</ol>
      );

    case "quote":
      return (
        <blockquote className={clsx("wb-notion-content__quote", notionColorClass(block.color))}>
          <NotionRichText spans={block.richText} />
          {renderChildren(block.children, renderCodeBlock)}
        </blockquote>
      );

    case "callout":
      return (
        <NotionCallout color={block.color} icon={block.icon} richText={block.richText}>
          {renderChildren(block.children, renderCodeBlock)}
        </NotionCallout>
      );

    case "toggle":
      return (
        <NotionToggle color={block.color} richText={block.richText}>
          {block.children && block.children.length > 0 ? (
            <NotionBlocks blocks={block.children} renderCodeBlock={renderCodeBlock} />
          ) : null}
        </NotionToggle>
      );

    case "code":
      return renderCodeBlock({
        caption: block.caption,
        code: block.code,
        language: block.language,
      });

    case "image":
      return <NotionImage alt={block.alt} caption={block.caption} src={block.src} />;

    case "table":
      return (
        <NotionTable
          hasColumnHeader={block.hasColumnHeader}
          hasRowHeader={block.hasRowHeader}
          rows={block.rows}
        />
      );

    case "columnList":
      return (
        <NotionColumns
          columns={block.columns.map((column, index) => (
            <NotionBlocks blocks={column} key={index} renderCodeBlock={renderCodeBlock} />
          ))}
        />
      );

    case "equation":
      // KaTeX 렌더는 후속 — v1은 수식 원문을 코드 스타일로 표시한다
      return (
        <div className="wb-notion-content__equation">
          <code>{block.expression}</code>
        </div>
      );

    case "divider":
      return <hr className="wb-notion-content__divider" />;
  }
};

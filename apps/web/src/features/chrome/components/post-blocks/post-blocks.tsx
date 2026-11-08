import { createElement, type JSX, type ReactNode } from 'react';

import {
  Asset,
  Bookmark,
  Callout,
  cn,
  CodeBlock,
  Column,
  Columns,
  Equation,
  Figure,
  ListBlock,
  Quote,
  Separator,
  Table,
  TableCell,
  Toggle,
  UnsupportedBlock,
} from '@seojaewan/design-system';

import { ResponsiveImage } from '@/features/chrome/components/responsive-image/responsive-image';
import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import {
  type CodeToken,
  getColumnGrows,
  getHeadingId,
  getHeadingLevel,
  getPlainText,
  getTopHeadingLevel,
  type HeadingBlock,
  type ListItemBlock,
  type PostBlock,
  type RichText as RichTextPart,
} from '@/shared/utils/post-body/post-body';

import { RichText } from './components/rich-text/rich-text';
import { KatexHtml } from './katex-html';

/** 이미지 블록 */
export type PostImageBlock = Extract<PostBlock, { type: 'image' }>;

/** 수식 블록 */
export type PostEquationBlock = Extract<PostBlock, { type: 'equation' }>;

type PostBlocksProps = {
  blocks: readonly PostBlock[];
  layout?: 'wide' | 'narrow';
  resolveLink?: (href: string) => ChromeTabPage | null;
  onPageOpen?: (page: ChromeTabPage) => void;
  renderImage?: (block: PostImageBlock) => ReactNode;
  onImageOpen?: (block: PostImageBlock, trigger: HTMLElement) => void;
  renderEquation?: (block: PostEquationBlock) => ReactNode;
  expandedToggleIndexes?: readonly number[];
  className?: string;
};

// 제목 단계마다의 글자 스타일이다([[Notion 블록:지원 블록]]).
const headingClassNames = {
  heading_1: 'w-full type-title text-color-black-89',
  heading_2: 'w-full type-subtitle text-color-black-89',
  heading_3: 'w-full type-body-large-strong text-color-black-89',
} as const satisfies Record<HeadingBlock['type'], string>;

// 본문 글자의 모양이다(피그마 Chrome/PostBlocks `paragraph with formatting`). 글자 서식과 링크는 RichText가 그린다.
const BODY_TEXT_CLASS_NAME = 'type-body-large text-color-black-89';

// 목록 단계마다의 글머리표다(Notion과 같이 단계마다 모양이 바뀐다).
const BULLETS = ['•', '◦', '▪'] as const;

/**
 * 글 본문 블록을 피그마 조립 `Chrome/PostBlocks`의 모양으로 그린다. 블록 사이 간격은 16이고 바탕은 페이지 바탕(`chrome/page-fill`)이다.
 * 제목은 제목 1·2·3을 글자 스타일 Title·Subtitle·Body Large Strong으로 그리고, 목차가 찾도록 맨 위 블록과 열 안 블록의 제목에 id를 단다.
 * 열 나누기는 Columns·Column으로 그린다. 넓은 창은 열을 나란히 놓고 열 너비를 Notion `width_ratio` 비율로 나누며, 좁은 창은 차례로 쌓는다.
 * 이어진 같은 종류의 목록 항목은 한 목록으로 묶어 ListBlock으로 그리고, 표시(글머리표·번호)는 깊이와 순서로 정한다.
 * 글자 조각(문단, 제목, 목록, 인용, 콜아웃, 토글 제목, 표 칸)의 서식과 링크는 RichText가 그린다.
 * 코드 블록은 서버가 강조한 글자 조각(`highlighted`)이 있으면 강조기가 준 색으로 칠하고, 없으면 글자 그대로다.
 * 지원하지 않는 블록 자리는 UnsupportedBlock 안내 상자다. `onImageOpen`을 주면 이미지를 눌러 크게 보기를 연다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[Notion 블록:모양]]
 * @codocs [[Chrome:글 화면]]
 * @param props 컴포넌트 속성
 * @param props.blocks 본문 블록
 * @param props.layout 글 화면의 넓은 창·좁은 창([[Chrome:글 화면]]). 열 나누기를 나란히 놓을지 쌓을지 고른다. 주지 않으면 넓은 창이다
 * @param props.resolveLink 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다. 없으면 모든 링크가 외부 주소다
 * @param props.onPageOpen 블로그 글 링크를 눌렀을 때. 같은 탭에서 그 페이지로 간다
 * @param props.renderImage 이미지 블록의 이미지(피그마 Figure `image`)를 그린다. 없으면 이미지 서버의 크기별 사본과 크기로 그린다([[Notion 이미지 제공]]). 조립 스토리가 피그마의 그림을 넣을 때 쓴다
 * @param props.onImageOpen 이미지를 눌렀을 때(클릭·Enter·Space). 주면 이미지가 크게 보기 버튼이 된다. 누른 이미지 블록과, 크게 보기를 닫은 뒤 포커스를 돌려줄 버튼을 받는다. 주지 않으면 누를 수 없는 이미지다(조립 스토리)
 * @param props.renderEquation 수식 블록의 수식(피그마 Equation `Formula` 슬롯)을 그린다. 없으면 서버가 KaTeX로 그려 보낸 HTML(`html`)을 넣고, HTML이 없으면 식을 코드 글자로 보인다([[기술 스택:글 본문 처리]]). 조립 스토리가 피그마의 수식 그림을 넣을 때 쓴다
 * @param props.expandedToggleIndexes 처음에 펼쳐 둘 토글 블록의 차례(본문 맨 위 차례). 없으면 모든 토글이 접혀 있다
 * @param props.className 바깥 배치 클래스
 */
export function PostBlocks({
  blocks,
  layout = 'wide',
  resolveLink,
  onPageOpen: handlePageOpen,
  renderImage = renderServedImage,
  onImageOpen,
  renderEquation = renderServerEquation,
  expandedToggleIndexes = [],
  className,
}: PostBlocksProps): JSX.Element {
  const topHeadingLevel = getTopHeadingLevel(blocks);

  /**
   * 글자 조각들을 RichText로 그린다. 링크는 이 본문의 링크 처리를 따른다.
   * @param richText 글자 조각
   * @param linkSize 링크 글자 크기. 표 칸은 둘레 글자 크기를 따른다(`inherit`)
   * @returns 글자와 링크
   */
  function renderRichText(
    richText: readonly RichTextPart[],
    linkSize: 'body-large' | 'inherit' = 'body-large',
  ): ReactNode {
    return (
      <RichText
        richText={richText}
        linkSize={linkSize}
        resolveLink={resolveLink}
        onPageOpen={handlePageOpen}
      />
    );
  }

  /**
   * 목록 하나(이어진 같은 종류의 항목)를 그린다.
   * @param items 목록 항목
   * @param depth 들여쓴 단계(맨 위가 0)
   * @param key 목록의 키
   * @returns 목록
   */
  function renderList(items: readonly ListItemBlock[], depth: number, key: string): JSX.Element {
    const isNumbered = items[0]?.type === 'numbered_list_item';
    return createElement(
      isNumbered ? 'ol' : 'ul',
      { key, className: 'flex w-full flex-col gap-spacing-xs' },
      items.map(
        /**
         * 목록 항목 하나를 그린다.
         * @param item 목록 항목
         * @param index 목록 안 차례
         * @returns 목록 항목
         */
        (item, index) => {
          const hasChildren = item.children !== undefined && item.children.length > 0;
          const subItems = hasChildren
            ? renderBlocks(item.children ?? [], depth + 1, null)
            : undefined;
          return item.type === 'to_do' ? (
            <ListBlock
              key={index}
              variant="to-do"
              isChecked={item.isChecked}
              label={getPlainText(item.richText)}
              text={renderRichText(item.richText)}
              hasChildren={hasChildren}
            >
              {subItems}
            </ListBlock>
          ) : (
            <ListBlock
              key={index}
              variant={isNumbered ? 'numbered' : 'bulleted'}
              marker={isNumbered ? getNumberMarker(index, depth) : getBullet(depth)}
              text={renderRichText(item.richText)}
              hasChildren={hasChildren}
            >
              {subItems}
            </ListBlock>
          );
        },
      ),
    );
  }

  /**
   * 목록이 아닌 블록 하나를 그린다.
   * @param block 블록
   * @param index 블록 차례
   * @param depth 들여쓴 단계(맨 위가 0)
   * @param outlinePath 블록들이 놓인 본문 안 자리. 맨 위면 비어 있고, 열 안이면 열 나누기 차례·열 차례가 이어진다. 목차에 들지 않는 곳(토글·목록 안)이면 null이다
   * @returns 블록
   */
  function renderBlock(
    block: Exclude<PostBlock, ListItemBlock>,
    index: number,
    depth: number,
    outlinePath: readonly number[] | null,
  ): JSX.Element {
    const isTopLevel = depth === 0 && outlinePath?.length === 0;
    switch (block.type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return createElement(
          `h${String(getHeadingLevel(block) - topHeadingLevel + 2)}`,
          {
            key: index,
            id: outlinePath === null ? undefined : getHeadingId(...outlinePath, index),
            className: headingClassNames[block.type],
          },
          renderRichText(block.richText),
        );
      case 'paragraph':
        return (
          <p key={index} className={`w-full ${BODY_TEXT_CLASS_NAME}`}>
            {renderRichText(block.richText)}
          </p>
        );
      case 'quote':
        return (
          <Quote key={index} className="w-full">
            <p>{renderRichText(block.richText)}</p>
          </Quote>
        );
      case 'callout':
        return (
          <Callout
            key={index}
            className="w-full"
            icon={<Asset name="icons/ic_fluent_info_24_regular.svg" />}
          >
            <p>{renderRichText(block.richText)}</p>
          </Callout>
        );
      case 'code':
        return (
          <CodeBlock
            key={index}
            language={block.language}
            lines={block.highlighted ?? toPlainCodeLines(block.code)}
            className="w-full"
          />
        );
      case 'image': {
        const caption = getPlainText(block.caption);
        const image = renderImage(block);
        return (
          <Figure
            key={index}
            className="w-full"
            image={
              onImageOpen === undefined ? (
                image
              ) : (
                // Figure가 이미지 칸의 바로 아래 요소에 주는 모양(너비 채우기)을 이미지에도 준다
                <button
                  type="button"
                  aria-label={
                    caption.length > 0 ? `이미지 크게 보기: ${caption}` : '이미지 크게 보기'
                  }
                  onClick={(event) => {
                    onImageOpen(block, event.currentTarget);
                  }}
                  className="cursor-zoom-in [&>*]:block [&>*]:w-full [&>*]:object-cover"
                >
                  {image}
                </button>
              )
            }
            caption={caption}
            hasCaption={caption.length > 0}
          />
        );
      }
      case 'divider':
        return <Separator key={index} className="w-full" />;
      case 'toggle':
        return (
          <Toggle
            key={index}
            className="w-full"
            title={renderRichText(block.richText)}
            isDefaultExpanded={isTopLevel && expandedToggleIndexes.includes(index)}
          >
            {renderBlocks(block.children ?? [], depth + 1, null)}
          </Toggle>
        );
      case 'column_list':
        return renderColumns(block.children, index, outlinePath);
      case 'column':
        return (
          <Column key={index} className="w-full">
            {renderBlocks(block.children, 0, null)}
          </Column>
        );
      case 'table':
        return (
          <Table key={index} className="w-full">
            {block.rows.map(
              /**
               * 표 행 하나를 그린다. 머리 행이 있으면 첫 행은 머리 칸이다.
               * @param row 행의 칸들
               * @param rowIndex 행 차례
               * @returns 행
               */
              (row, rowIndex) => {
                const isHeader = block.hasColumnHeader && rowIndex === 0;
                return (
                  <tr key={rowIndex}>
                    {row.map(
                      /**
                       * 표 칸 하나를 그린다. 머리 행의 칸은 열 머리(`th`)다.
                       * @param cell 칸 글자 조각
                       * @param cellIndex 칸 차례
                       * @returns 칸
                       */
                      (cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          variant={isHeader ? 'header' : 'body'}
                          scope={isHeader ? 'col' : undefined}
                        >
                          {renderRichText(cell, 'inherit')}
                        </TableCell>
                      ),
                    )}
                  </tr>
                );
              },
            )}
          </Table>
        );
      case 'bookmark':
        return (
          <a
            key={index}
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full"
          >
            <Bookmark
              title={block.title}
              description={block.description}
              url={block.url}
              className="w-full"
            />
          </a>
        );
      case 'equation':
        return (
          <Equation key={index} className="w-full">
            {renderEquation(block)}
          </Equation>
        );
      case 'unsupported':
        return <UnsupportedBlock key={index} className="w-full" typeName={block.typeName} />;
    }
  }

  /**
   * 열 나누기 블록을 그린다. 넓은 창은 열을 나란히 놓고 열마다 `width_ratio` 비율로 너비를 나누고, 좁은 창은 왼쪽 열부터 쌓는다.
   * 열 안의 블록은 맨 위처럼 그리고(목록 단계도 새로 센다), 제목에는 목차가 찾는 id를 단다.
   * @codocs [[Notion 블록:지원 블록]]
   * @param children 열 나누기의 하위 블록(열)
   * @param index 열 나누기 블록 차례
   * @param outlinePath 열 나누기가 놓인 본문 안 자리. 목차에 들지 않는 곳이면 null이다
   * @returns 열 나누기
   */
  function renderColumns(
    children: readonly PostBlock[],
    index: number,
    outlinePath: readonly number[] | null,
  ): JSX.Element {
    const isWide = layout === 'wide';
    const grows = getColumnGrows(
      children.map((column) => (column.type === 'column' ? column.widthRatio : null)),
    );
    return (
      <Columns key={index} layout={layout} className="w-full">
        {children.map(
          /**
           * 열 하나를 그린다. 넓은 창이면 비율만큼 너비를 나눠 갖는다.
           * @param column 열
           * @param columnIndex 열 차례
           * @returns 열
           */
          (column, columnIndex) => (
            <Column key={columnIndex} style={isWide ? { flexGrow: grows[columnIndex] } : undefined}>
              {renderBlocks(
                column.type === 'column' ? column.children : [column],
                0,
                outlinePath === null ? null : [...outlinePath, index, columnIndex],
              )}
            </Column>
          ),
        )}
      </Columns>
    );
  }

  /**
   * 블록들을 차례대로 그린다. 이어진 같은 종류의 목록 항목은 한 목록으로 묶는다.
   * @param items 블록
   * @param depth 들여쓴 단계(맨 위가 0)
   * @param outlinePath 블록들이 놓인 본문 안 자리. 맨 위면 비어 있다. 목차에 들지 않는 곳(토글·목록 안)이면 null이다
   * @returns 블록들
   */
  function renderBlocks(
    items: readonly PostBlock[],
    depth: number,
    outlinePath: readonly number[] | null,
  ): ReactNode[] {
    const nodes: ReactNode[] = [];
    let list: ListItemBlock[] = [];
    let listStart = 0;
    items.forEach(
      /**
       * 블록 하나를 지금 목록에 더하거나, 목록을 끝내고 블록을 그린다.
       * @param block 블록
       * @param index 블록 차례
       */
      (block, index) => {
        if (isListItemBlock(block) && (list.length === 0 || list[0]?.type === block.type)) {
          if (list.length === 0) {
            listStart = index;
          }
          list.push(block);
          return;
        }
        if (list.length > 0) {
          nodes.push(renderList(list, depth, `list-${String(listStart)}`));
          list = [];
        }
        if (isListItemBlock(block)) {
          listStart = index;
          list.push(block);
          return;
        }
        nodes.push(renderBlock(block, index, depth, outlinePath));
      },
    );
    if (list.length > 0) {
      nodes.push(renderList(list, depth, `list-${String(listStart)}`));
    }
    return nodes;
  }

  return (
    <div
      className={cn('flex w-full flex-col items-start gap-spacing-lg bg-color-white', className)}
    >
      {renderBlocks(blocks, 0, [])}
    </div>
  );
}

/**
 * 블록이 목록 항목(글머리·번호·할 일)인지 본다.
 * @param block 블록
 * @returns 목록 항목이면 true
 */
function isListItemBlock(block: PostBlock): block is ListItemBlock {
  return (
    block.type === 'bulleted_list_item' ||
    block.type === 'numbered_list_item' ||
    block.type === 'to_do'
  );
}

/**
 * 강조하지 않은 코드를 색 없는 글자 조각의 줄로 바꾼다. 코드 블록은 줄마다의 글자 조각을 받는다.
 * @param code 코드
 * @returns 줄마다의 글자 조각
 */
function toPlainCodeLines(code: string): CodeToken[][] {
  return code.split('\n').map((line) => [{ text: line, color: null }]);
}

/**
 * 단계에 맞는 글머리표.
 * @param depth 들여쓴 단계
 * @returns 글머리표
 */
function getBullet(depth: number): string {
  return BULLETS[depth % BULLETS.length] ?? '•';
}

/**
 * 단계에 맞는 번호 표시. 맨 위는 숫자, 한 단계 들여쓰면 영어 소문자, 두 단계는 로마 숫자다(Notion과 같다).
 * @param index 목록 안 차례(0부터)
 * @param depth 들여쓴 단계
 * @returns 번호 표시(예: `1.`, `a.`, `i.`)
 */
function getNumberMarker(index: number, depth: number): string {
  const number = index + 1;
  switch (depth % 3) {
    case 1:
      return `${toLetters(number)}.`;
    case 2:
      return `${toRoman(number)}.`;
    default:
      return `${String(number)}.`;
  }
}

/**
 * 1부터의 수를 영어 소문자 차례로 바꾼다(1 → a, 27 → aa).
 * @param number 수
 * @returns 영어 소문자
 */
function toLetters(number: number): string {
  let rest = number;
  let letters = '';
  while (rest > 0) {
    const remainder = (rest - 1) % 26;
    letters = String.fromCharCode(97 + remainder) + letters;
    rest = Math.floor((rest - 1) / 26);
  }
  return letters;
}

/**
 * 1부터의 수를 로마 숫자 소문자로 바꾼다.
 * @param number 수
 * @returns 로마 숫자
 */
function toRoman(number: number): string {
  const numerals = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ] as const;
  let rest = number;
  let roman = '';
  for (const [value, symbol] of numerals) {
    while (rest >= value) {
      roman += symbol;
      rest -= value;
    }
  }
  return roman;
}

/**
 * 이미지 블록의 이미지를 이미지 서버의 크기별 사본(`srcset`)과 크기로 그린다. 대체 글자는 캡션이다.
 * 본문 칸이 너비를 채우므로 높이는 크기 비율을 따른다(`h-auto`).
 * @codocs [[Notion 이미지 제공:크기]]
 * @param block 이미지 블록
 * @returns 이미지
 */
function renderServedImage(block: PostImageBlock): ReactNode {
  return <ResponsiveImage image={block} alt={getPlainText(block.caption)} className="h-auto" />;
}

/**
 * 서버가 KaTeX로 그려 보낸 수식을 넣는다. KaTeX CSS와 폰트는 글 화면과 함께 처음부터 불러와 수식이 깜빡이지 않는다.
 * 서버가 그리지 못한 식(`html` 없음)은 식 글자를 코드 서체로 보인다.
 * @codocs [[기술 스택:글 본문 처리]]
 * @param block 수식 블록
 * @returns 수식
 */
function renderServerEquation(block: PostEquationBlock): ReactNode {
  const text = <code className="type-code text-color-black-89">{block.expression}</code>;
  if (block.html === undefined) {
    return text;
  }
  return <KatexHtml html={block.html} />;
}

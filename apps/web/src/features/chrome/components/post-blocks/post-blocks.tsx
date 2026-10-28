import {
  createElement,
  Fragment,
  type JSX,
  lazy,
  type MouseEvent,
  type ReactNode,
  Suspense,
} from 'react';

import {
  Asset,
  Bookmark,
  Callout,
  Checkbox,
  CodeBlock,
  Equation,
  Figure,
  ImageAsset,
  Quote,
  Separator,
  Table,
  TableCell,
  Toggle,
  UnsupportedBlock,
} from '@seojaewan/design-system';

import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import {
  type CodeSyntax,
  type CodeToken,
  getHeadingId,
  getPlainText,
  type HeadingBlock,
  type ListItemBlock,
  type PostBlock,
  type RichText,
} from '@/shared/utils/post-body/post-body';

/** 이미지 블록 */
export type PostImageBlock = Extract<PostBlock, { type: 'image' }>;

/** 수식 블록 */
export type PostEquationBlock = Extract<PostBlock, { type: 'equation' }>;

type PostBlocksProps = {
  /** 본문 블록 */
  blocks: readonly PostBlock[];
  /**
   * 링크 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 외부 주소면 null이다. 없으면 모든 링크가 외부 주소다
   */
  resolveLink?: (href: string) => ChromeTabPage | null;
  /** 블로그 글 링크를 눌렀을 때. 같은 탭에서 그 페이지로 간다 */
  onPageOpen?: (page: ChromeTabPage) => void;
  /**
   * 이미지 블록의 이미지(피그마 Figure `image`)를 그린다. 없으면 임시 이미지(배경화면 Bloom)를 그린다.
   * Notion 이미지 제공([[Notion 이미지 제공]])이 9단계라 그 전까지의 자리다
   */
  renderImage?: (block: PostImageBlock) => ReactNode;
  /**
   * 이미지를 눌렀을 때(클릭·Enter·Space). 주면 이미지가 크게 보기 버튼이 된다. 누른 이미지 블록과, 크게 보기를 닫은 뒤
   * 포커스를 돌려줄 버튼을 받는다. 주지 않으면 누를 수 없는 이미지다(조립 스토리)
   */
  onImageOpen?: (block: PostImageBlock, trigger: HTMLElement) => void;
  /**
   * 수식 블록의 수식(피그마 Equation `Formula` 슬롯)을 그린다. 없으면 서버가 KaTeX로 그려 보낸 HTML(`html`)을 넣고,
   * HTML이 없으면 식을 코드 글자로 보인다([[기술 스택:글 본문 처리]]). 조립 스토리가 피그마의 수식 그림을 넣을 때 쓴다
   */
  renderEquation?: (block: PostEquationBlock) => ReactNode;
  /** 처음에 펼쳐 둘 토글 블록의 차례(본문 맨 위 차례). 없으면 모든 토글이 접혀 있다 */
  expandedToggleIndexes?: readonly number[];
  /** 바깥 배치 클래스 */
  className?: string;
};

// 제목 단계마다의 요소와 글자 스타일이다. 글 제목이 h1이라 본문 제목은 h2부터다([[Chrome:Notion 블록]]).
const HEADING_TAGS = { heading_1: 'h2', heading_2: 'h3', heading_3: 'h4' } as const;
const headingClassNames = {
  heading_1: 'w-full type-title text-text-fill-primary',
  heading_2: 'w-full type-subtitle text-text-fill-primary',
  heading_3: 'w-full type-body-large-strong text-text-fill-primary',
} as const satisfies Record<HeadingBlock['type'], string>;

// 본문 글자와 글자 서식의 모양이다(피그마 Chrome/PostBlocks `paragraph with formatting`).
const BODY_TEXT_CLASS_NAME = 'type-body-large text-text-fill-primary';
const LINK_CLASS_NAME = 'type-body-large-link text-accent-text-fill-primary underline';
const INLINE_CODE_CLASS_NAME = 'type-code text-post-inline-code';
const SMALL_LINK_CLASS_NAME = 'text-accent-text-fill-primary underline';

// 강조된 코드 글자 조각의 색이다(디자인 시스템 `code-syntax/*` 토큰).
const codeSyntaxClassNames = {
  attribute: 'text-code-syntax-attribute',
  comment: 'text-code-syntax-comment',
  constant: 'text-code-syntax-constant',
  function: 'text-code-syntax-function',
  keyword: 'text-code-syntax-keyword',
  'keyword-control': 'text-code-syntax-keyword-control',
  parameter: 'text-code-syntax-parameter',
  punctuation: 'text-code-syntax-punctuation',
  string: 'text-code-syntax-string',
  tag: 'text-code-syntax-tag',
  text: 'text-code-syntax-text',
  type: 'text-code-syntax-type',
  variable: 'text-code-syntax-variable',
} as const satisfies Record<CodeSyntax, string>;

// 서버가 그린 수식 HTML을 넣는 부품이다. KaTeX CSS를 품어 수식이 있을 때만 받는다.
const katexHtml = lazy(async () => {
  const { KatexHtml } = await import('./katex-html');
  return { default: KatexHtml };
});

// 목록 단계마다의 글머리표다(Notion과 같이 단계마다 모양이 바뀐다).
const BULLETS = ['•', '◦', '▪'] as const;

/**
 * 글 본문 블록을 피그마 조립 `Chrome/PostBlocks`의 모양으로 그린다. 블록 사이 간격은 16이다.
 * 제목은 제목 1·2·3을 글자 스타일 Title·Subtitle·Body Large Strong으로 그리고, 목차가 찾도록 맨 위 블록의 제목에 id를 단다.
 * 이어진 같은 종류의 목록 항목은 한 목록으로 묶고, 하위 블록은 32 들여 그린다. 할 일은 읽기 전용 Checkbox다.
 * 글자 서식은 굵게·기울임·밑줄·취소선·인라인 코드(배경 없이 코드 서체와 `post/inline-code` 글자색)·링크다.
 * 링크는 블로그 글이면 같은 탭에서 그 글로 가고, 외부 주소면 실제 브라우저의 새 탭(noopener)에서 연다.
 * 코드 블록은 서버가 강조한 글자 조각(`highlighted`)이 있으면 `code-syntax` 색으로 칠하고, 없으면 글자 그대로다.
 * 지원하지 않는 블록 자리는 UnsupportedBlock 안내 상자다. `onImageOpen`을 주면 이미지를 눌러 크게 보기를 연다.
 * @codocs [[디자인 시스템:조립]]
 * @codocs [[Chrome:Notion 블록]]
 * @codocs [[Chrome:글 화면]]
 * @param props
 */
export function PostBlocks(props: PostBlocksProps): JSX.Element {
  const {
    blocks,
    resolveLink,
    onPageOpen: handlePageOpen,
    renderImage = renderTemporaryImage,
    onImageOpen,
    renderEquation = renderServerEquation,
    expandedToggleIndexes = [],
    className,
  } = props;

  /**
   * 글자 조각들을 그린다. 링크가 있는 조각은 링크다.
   * @param richText 글자 조각
   * @param isBodyLarge 본문 글자(Body Large) 자리인지. 아니면(표 칸) 서식 글자 스타일을 바꾸지 않는다
   * @returns 글자와 링크
   */
  function renderRichText(richText: readonly RichText[], isBodyLarge = true): ReactNode {
    return richText.map(
      /**
       * 글자 조각 하나를 그린다.
       * @param part 글자 조각
       * @param index 차례
       * @returns 글자나 링크
       */
      (part, index) => {
        if (part.link === null) {
          return (
            <span key={index} className={getTextClassName(part, isBodyLarge)}>
              {part.text}
            </span>
          );
        }
        const linkClassName = isBodyLarge ? LINK_CLASS_NAME : SMALL_LINK_CLASS_NAME;
        const page = resolveLink?.(part.link) ?? null;
        if (page === null) {
          return (
            <a
              key={index}
              href={part.link}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              {part.text}
            </a>
          );
        }
        return (
          <a
            key={index}
            href={part.link}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault();
              handlePageOpen?.(page);
            }}
            className={linkClassName}
          >
            {part.text}
          </a>
        );
      },
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
      { key, className: 'flex w-full flex-col gap-4' },
      items.map(
        /**
         * 목록 항목 하나를 그린다.
         * @param item 목록 항목
         * @param index 목록 안 차례
         * @returns 목록 항목
         */
        (item, index) => {
          const isDone = item.type === 'to_do' && item.checked;
          return (
            <li key={index} className="flex w-full flex-col gap-4">
              {/* 피그마 `row` 배치 프레임. 표시(24×24)와 글 사이 간격은 8이다 */}
              <div className="flex w-full items-start gap-8">
                {item.type === 'to_do' ? (
                  <span className="flex size-24 shrink-0 items-center justify-center">
                    <Checkbox checked={item.checked} />
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className={[
                      'flex size-24 shrink-0 items-center type-body-large text-text-fill-primary',
                      isNumbered ? 'justify-end' : 'justify-center',
                    ].join(' ')}
                  >
                    {isNumbered ? getNumberMarker(index, depth) : getBullet(depth)}
                  </span>
                )}
                <p
                  className={[
                    'min-w-0 flex-1',
                    isDone
                      ? 'type-body-large-strikethrough text-text-fill-secondary'
                      : BODY_TEXT_CLASS_NAME,
                  ].join(' ')}
                >
                  {renderRichText(item.richText)}
                </p>
              </div>
              {item.children !== undefined && item.children.length > 0 && (
                // 피그마 `children` 배치 프레임. 하위 블록은 표시 너비 + 간격(32)만큼 들여 쓴다
                <div className="flex w-full flex-col gap-4 pl-32">
                  {renderBlocks(item.children, depth + 1)}
                </div>
              )}
            </li>
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
   * @returns 블록
   */
  function renderBlock(
    block: Exclude<PostBlock, ListItemBlock>,
    index: number,
    depth: number,
  ): JSX.Element {
    const isTopLevel = depth === 0;
    switch (block.type) {
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        return createElement(
          HEADING_TAGS[block.type],
          {
            key: index,
            id: isTopLevel ? getHeadingId(index) : undefined,
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
            <p className={`w-full ${BODY_TEXT_CLASS_NAME}`}>{renderRichText(block.richText)}</p>
          </Quote>
        );
      case 'callout':
        return (
          <Callout
            key={index}
            className="w-full"
            icon={<Asset name="icons/ic_fluent_info_24_regular.svg" className="size-full" />}
          >
            <p className={`w-full ${BODY_TEXT_CLASS_NAME}`}>{renderRichText(block.richText)}</p>
          </Callout>
        );
      case 'code':
        return (
          <CodeBlock key={index} language={block.language} className="w-full">
            {block.highlighted === undefined ? block.code : renderCodeLines(block.highlighted)}
          </CodeBlock>
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
            showCaption={caption.length > 0}
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
            defaultExpanded={isTopLevel && expandedToggleIndexes.includes(index)}
          >
            {/* 토글 내용은 꺾쇠 자리(24)만큼 들여 쓴다 */}
            <div className="flex w-full flex-col gap-4 pl-24">
              {renderBlocks(block.children ?? [], depth + 1)}
            </div>
          </Toggle>
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
                       * 표 칸 하나를 그린다. 머리 행의 칸은 열 머리(`th`)다. 피그마 조립은 본문 칸 글자를
                       * Body(Regular)로 덮어쓰므로 본문 칸 글자는 Body로 감싼다.
                       * @param cell 칸 글자 조각
                       * @param cellIndex 칸 차례
                       * @returns 칸
                       */
                      (cell, cellIndex) => (
                        <TableCell
                          key={cellIndex}
                          type={isHeader ? 'header' : 'body'}
                          scope={isHeader ? 'col' : undefined}
                        >
                          {isHeader ? (
                            renderRichText(cell, false)
                          ) : (
                            <span className="type-body">{renderRichText(cell, false)}</span>
                          )}
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
   * 블록들을 차례대로 그린다. 이어진 같은 종류의 목록 항목은 한 목록으로 묶는다.
   * @param items 블록
   * @param depth 들여쓴 단계(맨 위가 0)
   * @returns 블록들
   */
  function renderBlocks(items: readonly PostBlock[], depth: number): ReactNode[] {
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
        nodes.push(renderBlock(block, index, depth));
      },
    );
    if (list.length > 0) {
      nodes.push(renderList(list, depth, `list-${String(listStart)}`));
    }
    return nodes;
  }

  return (
    <div
      className={['flex w-full flex-col items-start gap-16', className].filter(Boolean).join(' ')}
    >
      {renderBlocks(blocks, 0)}
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
 * 서식 있는 글자 조각의 클래스. 본문 글자 자리에서는 서식마다의 글자 스타일(Body Large Strong·Italic·Underline·
 * Strikethrough)을 쓰고, 인라인 코드는 코드 서체와 `post/inline-code` 글자색이다. 서식이 여럿이면 인라인 코드, 굵게,
 * 기울임, 밑줄, 취소선 차례로 하나만 쓴다(글자 스타일이 한 조각에 하나라서다).
 * @codocs [[Chrome:Notion 블록]]
 * @param part 글자 조각
 * @param isBodyLarge 본문 글자(Body Large) 자리인지
 * @returns 클래스. 서식이 없으면 undefined
 */
function getTextClassName(part: RichText, isBodyLarge: boolean): string | undefined {
  const annotations = part.annotations;
  if (annotations === undefined) {
    return undefined;
  }
  if (annotations.code === true) {
    return INLINE_CODE_CLASS_NAME;
  }
  if (!isBodyLarge) {
    return undefined;
  }
  if (annotations.bold === true) {
    return 'type-body-large-strong';
  }
  if (annotations.italic === true) {
    return 'type-body-large-italic';
  }
  if (annotations.underline === true) {
    return 'type-body-large-underline';
  }
  if (annotations.strikethrough === true) {
    return 'type-body-large-strikethrough';
  }
  return undefined;
}

/**
 * 강조된 코드 줄들을 그린다. 줄 사이는 줄바꿈 글자다(코드 블록이 `pre`라 그대로 줄이 바뀐다).
 * @param lines 줄마다의 글자 조각
 * @returns 강조된 코드
 */
function renderCodeLines(lines: readonly (readonly CodeToken[])[]): ReactNode {
  return lines.map(
    /**
     * 코드 한 줄을 그린다.
     * @param line 줄의 글자 조각
     * @param lineIndex 줄 차례
     * @returns 코드 한 줄
     */
    (line, lineIndex) => (
      <Fragment key={lineIndex}>
        {lineIndex > 0 && '\n'}
        {line.map(
          /**
           * 글자 조각 하나를 강조 색으로 그린다. 색이 없으면 기본 코드 글자색이다.
           * @param token 글자 조각
           * @param tokenIndex 조각 차례
           * @returns 글자
           */
          (token, tokenIndex) =>
            token.syntax === null ? (
              <Fragment key={tokenIndex}>{token.text}</Fragment>
            ) : (
              <span key={tokenIndex} className={codeSyntaxClassNames[token.syntax]}>
                {token.text}
              </span>
            ),
        )}
      </Fragment>
    ),
  );
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
 * 이미지 블록의 임시 이미지. Notion 이미지 제공([[Notion 이미지 제공]])이 9단계라 그 전까지 배경화면 Bloom을 그린다.
 * 글 본문과 이미지 크게 보기가 같은 이미지를 쓴다.
 * @param block 이미지 블록
 * @param className 이미지 클래스. 크게 보기처럼 크기를 정해야 하는 곳이 준다
 * @returns 임시 이미지
 */
export function renderTemporaryImage(block: PostImageBlock, className?: string): ReactNode {
  return (
    <ImageAsset
      name="images/wallpaper-bloom"
      alt={getPlainText(block.caption)}
      className={className}
    />
  );
}

/**
 * 서버가 KaTeX로 그려 보낸 수식을 넣는다. KaTeX CSS와 폰트는 수식이 있는 글을 열 때만 받도록 지연해 불러오고,
 * 받는 동안과 서버가 그리지 못한 식(`html` 없음)은 식 글자를 코드 서체로 보인다.
 * @codocs [[기술 스택:글 본문 처리]]
 * @param block 수식 블록
 * @returns 수식
 */
function renderServerEquation(block: PostEquationBlock): ReactNode {
  const text = <code className="type-code text-text-fill-primary">{block.expression}</code>;
  if (block.html === undefined) {
    return text;
  }
  return <Suspense fallback={text}>{createElement(katexHtml, { html: block.html })}</Suspense>;
}

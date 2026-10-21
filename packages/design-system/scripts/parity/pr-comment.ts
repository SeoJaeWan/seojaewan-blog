/**
 * 피그마 일치 검사 결과(summary.json)로 PR 댓글 본문을 만든다. GitHub를 부르지 않는 순수 함수다.
 * 실패는 하나도 빼지 않는다. 길이 제한을 넘으면 먼저 이미지를 빼고, 그래도 길면 댓글을 여러 개로 나눈다.
 */

import type { ParitySummary, VariantResult } from './parity-summary.ts';

/** 댓글을 찾는 숨은 표시. 두 번째 댓글부터는 번호를 붙인다(`<!-- figma-parity 2 -->`). */
export const COMMENT_MARKER = 'figma-parity';
// GitHub 댓글 길이 제한(65,536자)보다 여유를 둔다.
export const COMMENT_LIMIT = 60_000;

export type CommentOptions = {
  /** parity-results 기준 이미지 경로(`button/style=accent,state=rest/diff.png`)를 댓글에 넣을 주소로 바꾼다 */
  imageUrl: (file: string) => string;
  /** 이 실행(Actions run) 주소 */
  runUrl: string;
};

/** 댓글에 넣는 이미지 하나 */
export type CommentImage = { file: string };

type Block = { text: string; imageRows: string[]; images: string[] };

/**
 * 결과 요약으로 댓글 본문 목록을 만든다. 각 본문은 순서 번호가 든 숨은 표시로 시작한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 * @param summary 결과 요약
 * @param options 이미지 주소와 실행 주소
 * @returns 댓글 본문 목록과 쓰인 이미지 파일
 */
export function renderComments(
  summary: ParitySummary,
  options: CommentOptions,
): { bodies: string[]; images: string[] } {
  const failedResults = summary.results.filter((result) => result.failures.length > 0);
  if (failedResults.length === 0 && summary.fileErrors.length === 0) {
    return {
      bodies: [`${marker(1)}\n피그마 일치 검사: ${summary.total}개 모두 통과`],
      images: [],
    };
  }

  const header = `피그마 일치 검사: ${summary.total}개 중 ${failedResults.length}개 실패`;
  const blocks: Block[] = [];
  if (summary.fileErrors.length > 0) {
    blocks.push({
      text: ['**파일 오류**', ...summary.fileErrors.map((error) => `- ${error}`)].join('\n'),
      imageRows: [],
      images: [],
    });
  }
  const components = [...new Set(failedResults.map((result) => result.component))];
  for (const component of components) {
    blocks.push(
      componentBlock(
        component,
        failedResults.filter((result) => result.component === component),
        options,
      ),
    );
  }
  const footer = `[실행 결과와 이미지 전체](${options.runUrl})`;
  return paginate(header, blocks, footer);
}

/**
 * 컴포넌트 하나의 접힌 블록을 만든다. 같은 실패 줄을 가진 변형을 한 줄로 묶는다.
 * @param component 컴포넌트 폴더 이름
 * @param results 그 컴포넌트의 실패한 변형
 * @param options 이미지 주소
 * @returns 블록
 */
function componentBlock(
  component: string,
  results: readonly VariantResult[],
  options: CommentOptions,
): Block {
  const variantsByMessage = new Map<string, string[]>();
  for (const result of results) {
    for (const message of new Set(result.failures.map((failure) => failure.message))) {
      variantsByMessage.set(message, [...(variantsByMessage.get(message) ?? []), result.variant]);
    }
  }
  const lines = [...variantsByMessage].map(
    ([message, variants]) => `- ${groupVariants(variants)}: ${escapeMarkdown(message)}`,
  );
  const imageRows: string[] = [];
  const images: string[] = [];
  for (const result of results) {
    for (const group of result.images) {
      const files = group.files.map((file) => `${component}/${result.variant}/${file}`);
      images.push(...files);
      const cells = files.map((file) => `<img src="${options.imageUrl(file)}" height="64">`);
      while (cells.length < 2) {
        cells.push('');
      }
      imageRows.push(`| ${result.variant} · ${group.label} | ${cells.join(' | ')} |`);
    }
  }
  return {
    text: [
      `<details><summary>${component} (${results.length}개 실패)</summary>`,
      '',
      ...lines,
    ].join('\n'),
    imageRows,
    images,
  };
}

/**
 * 블록을 댓글 길이 제한에 맞춰 나눈다. 넘치면 뒤쪽 블록부터 이미지를 빼고, 그래도 넘치면 다음 댓글로 넘긴다.
 * @param header 첫 댓글 머리말
 * @param blocks 블록
 * @param footer 마지막 댓글 꼬리말
 * @returns 댓글 본문과 쓰인 이미지 파일
 */
function paginate(
  header: string,
  blocks: Block[],
  footer: string,
): { bodies: string[]; images: string[] } {
  const withImages = blocks.map(() => true);
  /**
   * 블록 하나를 쓴다. 이미지를 빼기로 한 블록은 이미지 표를 넣지 않는다.
   * @param block 블록
   * @param index 블록 순서
   * @returns 블록 본문
   */
  function render(block: Block, index: number): string {
    const table =
      withImages[index] === true && block.imageRows.length > 0
        ? ['', '', '| 변형 | 피그마 | 브라우저 |', '|---|---|---|', ...block.imageRows].join('\n')
        : '';
    const closing = block.text.startsWith('<details>') ? '\n\n</details>' : '';
    return `${block.text}${table}${closing}`;
  }
  /**
   * 모든 블록을 한 댓글에 넣었을 때의 길이를 잰다.
   * @returns 글자 수
   */
  function total(): number {
    return (
      header.length +
      footer.length +
      blocks.reduce((sum, block, index) => sum + render(block, index).length + 2, 0)
    );
  }
  for (let index = blocks.length - 1; index >= 0 && total() > COMMENT_LIMIT; index -= 1) {
    withImages[index] = false;
  }

  const pages: string[][] = [[header]];
  let length = header.length;
  for (const [index, block] of blocks.entries()) {
    for (const piece of splitBlock(render(block, index))) {
      if (length + piece.length + 2 > COMMENT_LIMIT - footer.length) {
        pages.push([]);
        length = 0;
      }
      pages.at(-1)?.push(piece);
      length += piece.length + 2;
    }
  }
  pages.at(-1)?.push(footer);
  const images = blocks.flatMap((block, index) => (withImages[index] === true ? block.images : []));
  return {
    bodies: pages.map((parts, index) => `${marker(index + 1)}\n${parts.join('\n\n')}`),
    images,
  };
}

/**
 * 한 블록이 댓글 하나보다 길면 줄 단위로 나눈다. 나뉜 조각은 같은 접힌 블록으로 다시 감싼다.
 * @param text 블록
 * @returns 조각 목록
 */
function splitBlock(text: string): string[] {
  if (text.length <= COMMENT_LIMIT / 2) {
    return [text];
  }
  const lines = text.split('\n');
  const summaryLine = lines[0]?.startsWith('<details>') === true ? lines[0] : '';
  const body =
    summaryLine === '' ? lines : lines.slice(1, lines.at(-1) === '</details>' ? -1 : undefined);
  const pieces: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const line of body) {
    if (length + line.length > COMMENT_LIMIT / 2 && current.length > 0) {
      pieces.push(current.join('\n'));
      current = [];
      length = 0;
    }
    current.push(line);
    length += line.length + 1;
  }
  pieces.push(current.join('\n'));
  return summaryLine === ''
    ? pieces
    : pieces.map(
        (piece) =>
          `${summaryLine.replace('</summary>', ' (계속)</summary>')}\n${piece}\n\n</details>`,
      );
}

/**
 * 변형 이름 목록을 마지막 속성만 다른 것끼리 묶어 짧게 쓴다.
 * 예: `style=accent,state=rest`, `style=accent,state=hover` → `style=accent · state=rest, hover`
 * @param variants 변형 이름 목록
 * @returns 묶은 문자열
 */
export function groupVariants(variants: readonly string[]): string {
  const groups = new Map<string, string[]>();
  for (const variant of variants) {
    const parts = variant.split(',');
    const last = parts.pop() ?? '';
    const [name = '', value = last] = last.split('=');
    const prefix = [...parts, name].join(',');
    groups.set(prefix, [...(groups.get(prefix) ?? []), value]);
  }
  const lines: string[] = [];
  for (const [prefix, values] of groups) {
    const parts = prefix.split(',');
    const last = parts.pop() ?? '';
    lines.push([...parts, `${last}=${values.join(', ')}`].join(' · '));
  }
  return lines.join('; ');
}

/**
 * 댓글을 찾는 숨은 표시를 만든다.
 * @param index 댓글 순서(1부터)
 * @returns HTML 주석
 */
export function marker(index: number): string {
  return index === 1 ? `<!-- ${COMMENT_MARKER} -->` : `<!-- ${COMMENT_MARKER} ${index} -->`;
}

/**
 * 댓글 본문의 숨은 표시에서 순서를 읽는다.
 * @param body 댓글 본문
 * @returns 순서(1부터), 이 검사의 댓글이 아니면 undefined
 */
export function markerIndex(body: string): number | undefined {
  const match = new RegExp(`^<!-- ${COMMENT_MARKER}(?: (\\d+))? -->`, 'u').exec(body);
  if (match === null) {
    return undefined;
  }
  return match[1] === undefined ? 1 : Number(match[1]);
}

/**
 * 메시지 안의 Markdown·HTML 특수 문자를 글자 그대로 보이게 한다.
 * @param text 메시지
 * @returns 바꾼 메시지
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[<>|*_`[\]]/gu, (char) => `\\${char}`);
}

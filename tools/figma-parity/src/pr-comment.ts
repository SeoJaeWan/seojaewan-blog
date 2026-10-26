/**
 * 캡처 결과(captures.json)로 PR 댓글 본문을 만든다. GitHub를 부르지 않는 순수 함수다.
 * 대상마다 `피그마 | 코드 | 차이` 표를 둔다. 판정하지 않는다. 길이 제한을 넘으면 댓글을 여러 개로 나눈다.
 */

import type { CaptureRow, CaptureSummary } from './results.ts';

/** 댓글을 찾는 숨은 표시. 두 번째 댓글부터는 번호를 붙인다(`<!-- figma-parity 2 -->`). */
export const COMMENT_MARKER = 'figma-parity';
// GitHub 댓글 길이 제한(65,536자)보다 여유를 둔다.
export const COMMENT_LIMIT = 60_000;
// 캡처 표 하나에 넣는 줄 수. 넘치면 같은 대상의 표를 이어서 하나 더 만든다(표 머리를 다시 쓴다).
export const CAPTURE_ROWS_PER_TABLE = 40;
const tableHeader = ['| 변형 | 피그마 | 코드 | 차이 |', '|---|---|---|---|'];

export type CommentOptions = {
  /** 결과 폴더 기준 이미지 경로(`button/style=accent,state=rest/code.png`)를 댓글에 넣을 주소로 바꾼다 */
  imageUrl: (file: string) => string;
  /** 이 실행(Actions run) 주소 */
  runUrl: string;
};

/**
 * 캡처 결과로 댓글 본문 목록을 만든다. 각 본문은 순서 번호가 든 숨은 표시로 시작한다.
 * @codocs [[피그마 연동:CI]]
 * @param captures 캡처 결과
 * @param options 이미지 주소와 실행 주소
 * @returns 댓글 본문 목록과 쓰인 이미지 파일
 */
export function renderComments(
  captures: CaptureSummary,
  options: CommentOptions,
): { bodies: string[]; images: string[] } {
  const failed = captures.rows.filter((row) => row.error !== null);
  const targets = new Set(captures.rows.map((row) => row.target));
  const header = [
    `피그마 캡처 표: 대상 ${String(targets.size)}개, 변형 ${String(captures.rows.length)}개` +
      (failed.length > 0 ? `, 캡처 실패 ${String(failed.length)}개` : ''),
    '판정하지 않는다. 차이 그림에서 같은 곳은 검정, 다른 곳은 밝게 보인다. 글자 가장자리나 모서리의 가는 밝은 선은 엔진 차이일 수 있다.',
  ].join('\n');
  const blocks: string[] = [];
  if (captures.fileErrors.length > 0) {
    blocks.push(['**파일 오류**', ...captures.fileErrors.map((error) => `- ${error}`)].join('\n'));
  }
  const tables = captureBlocks(captures.rows, options);
  blocks.push(...tables.blocks);
  const footer = `[실행 결과](${options.runUrl})`;
  return {
    bodies: paginate(header, blocks, footer, { marker: COMMENT_MARKER, tableHeader }),
    images: tables.images,
  };
}

/**
 * 대상마다 `피그마 | 코드 | 차이` 표를 쓴다. 줄은 변형과 상태다.
 * @codocs [[피그마 연동:캡처 표]]
 * @param rows 캡처 표 줄
 * @param options 이미지 주소
 * @returns 블록과 쓰인 이미지 파일
 */
function captureBlocks(
  rows: readonly CaptureRow[],
  options: CommentOptions,
): { blocks: string[]; images: string[] } {
  const blocks: string[] = [];
  const images: string[] = [];
  for (const target of new Set(rows.map((row) => row.target))) {
    const own = rows.filter((row) => row.target === target);
    const name = own[0]?.name ?? target;
    for (let start = 0; start < own.length; start += CAPTURE_ROWS_PER_TABLE) {
      const chunk = own.slice(start, start + CAPTURE_ROWS_PER_TABLE);
      images.push(
        ...chunk.flatMap((row) => [row.figma, row.code, row.diff]).filter((file) => file !== null),
      );
      const title = start === 0 ? name : `${name} (계속)`;
      blocks.push(
        [
          `<details open><summary>${title} (${String(own.length)}개)</summary>`,
          '',
          ...tableHeader,
          ...chunk.map((row) => captureLine(row, options)),
          '',
          '</details>',
        ].join('\n'),
      );
    }
  }
  return { blocks, images };
}

/**
 * 캡처 표 한 줄을 쓴다. 만들지 못한 그림 칸은 비우고, 이유는 코드 칸에 쓴다.
 * @param row 캡처 표 줄
 * @param options 이미지 주소
 * @returns 표 줄
 */
function captureLine(row: CaptureRow, options: CommentOptions): string {
  const figma = row.figma === null ? '' : image(row.figma, '피그마', options);
  const code =
    row.code === null
      ? `캡처 실패: ${escapeMarkdown(row.error ?? '')}`
      : image(row.code, '코드', options);
  const diff =
    row.diff === null
      ? row.code !== null && row.error !== null
        ? escapeMarkdown(row.error)
        : ''
      : image(row.diff, '차이', options);
  return `| \`${row.variant}\` | ${figma} | ${code} | ${diff} |`;
}

/**
 * 이미지 칸을 만든다.
 * @param file 결과 폴더 기준 경로
 * @param alt 대체 글자
 * @param options 이미지 주소
 * @returns HTML 이미지
 */
function image(file: string, alt: string, options: CommentOptions): string {
  return `<img src="${options.imageUrl(file)}" alt="${alt}">`;
}

/** 댓글 나누기 설정 */
export type PaginateOptions = {
  /** 댓글을 찾는 숨은 표시 이름(`figma-parity`, `motion-check`) */
  marker: string;
  /** 표가 든 블록을 나눌 때 다시 쓰는 표 머리 */
  tableHeader: readonly string[];
};

/**
 * 블록을 댓글 길이 제한에 맞춰 나눈다. 블록 하나가 너무 길면 줄 단위로 나눈다.
 * 캡처 표 댓글과 모션 검사 댓글이 함께 쓴다.
 * @codocs [[피그마 연동:CI]]
 * @param header 첫 댓글 머리말
 * @param blocks 블록
 * @param footer 마지막 댓글 꼬리말
 * @param options 숨은 표시 이름과 표 머리
 * @returns 댓글 본문
 */
export function paginate(
  header: string,
  blocks: readonly string[],
  footer: string,
  options: PaginateOptions,
): string[] {
  const pages: string[][] = [[header]];
  let length = header.length;
  for (const block of blocks) {
    for (const piece of splitBlock(block, options.tableHeader)) {
      if (length + piece.length + 2 > COMMENT_LIMIT - footer.length) {
        pages.push([]);
        length = 0;
      }
      pages.at(-1)?.push(piece);
      length += piece.length + 2;
    }
  }
  pages.at(-1)?.push(footer);
  return pages.map((parts, index) => `${marker(index + 1, options.marker)}\n${parts.join('\n\n')}`);
}

/**
 * 한 블록이 댓글 하나보다 길면 줄 단위로 나눈다. 나뉜 조각은 같은 접힌 블록으로 다시 감싸고 표 머리를 다시 쓴다.
 * @param text 블록
 * @param header 다시 쓰는 표 머리
 * @returns 조각 목록
 */
function splitBlock(text: string, header: readonly string[]): string[] {
  if (text.length <= COMMENT_LIMIT / 2) {
    return [text];
  }
  const lines = text.split('\n');
  const summaryLine = lines[0]?.startsWith('<details') === true ? lines[0] : '';
  const body =
    summaryLine === '' ? lines : lines.slice(1, lines.at(-1) === '</details>' ? -1 : undefined);
  const pieces: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const line of body) {
    if (length + line.length > COMMENT_LIMIT / 2 && current.length > 0) {
      pieces.push(current.join('\n'));
      current = [...header];
      length = header.join('\n').length;
    }
    current.push(line);
    length += line.length + 1;
  }
  pieces.push(current.join('\n'));
  return summaryLine === ''
    ? pieces
    : pieces.map(
        (piece, index) =>
          `${index === 0 ? summaryLine : summaryLine.replace('</summary>', ' (계속)</summary>')}\n${piece.trim()}\n\n</details>`,
      );
}

/**
 * 댓글을 찾는 숨은 표시를 만든다.
 * @param index 댓글 순서(1부터)
 * @param name 숨은 표시 이름. 기본은 캡처 표 댓글이다
 * @returns HTML 주석
 */
export function marker(index: number, name = COMMENT_MARKER): string {
  return index === 1 ? `<!-- ${name} -->` : `<!-- ${name} ${String(index)} -->`;
}

/**
 * 댓글 본문의 숨은 표시에서 순서를 읽는다.
 * @param body 댓글 본문
 * @param name 숨은 표시 이름. 기본은 캡처 표 댓글이다
 * @returns 순서(1부터), 이 도구의 댓글이 아니면 undefined
 */
export function markerIndex(body: string, name = COMMENT_MARKER): number | undefined {
  const match = new RegExp(`^<!-- ${name}(?: (\\d+))? -->`, 'u').exec(body);
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
export function escapeMarkdown(text: string): string {
  return text.replace(/[<>|*_`[\]]/gu, (char) => `\\${char}`);
}

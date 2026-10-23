/**
 * 피그마 일치 검사 결과(summary.json)와 캡처 표(captures.json)로 PR 댓글 본문을 만든다. GitHub를 부르지 않는 순수 함수다.
 * 맨 위는 판정 결과이고, 판정이 통과했을 때만 그 아래에 캡처 표를 둔다.
 * 실패는 하나도 빼지 않는다. 길이 제한을 넘으면 댓글을 여러 개로 나눈다.
 */

import type { CaptureRow, CaptureSummary, ParitySummary, VariantResult } from './parity-summary.ts';

/** 댓글을 찾는 숨은 표시. 두 번째 댓글부터는 번호를 붙인다(`<!-- figma-parity 2 -->`). */
export const COMMENT_MARKER = 'figma-parity';
// GitHub 댓글 길이 제한(65,536자)보다 여유를 둔다.
export const COMMENT_LIMIT = 60_000;
// 캡처 표 하나에 넣는 줄 수. 넘치면 같은 컴포넌트의 표를 이어서 하나 더 만든다(표 머리를 다시 쓴다).
export const CAPTURE_ROWS_PER_TABLE = 40;

export type CommentOptions = {
  /** parity-results 기준 이미지 경로(`button/style=accent,state=rest/capture-code.png`)를 댓글에 넣을 주소로 바꾼다 */
  imageUrl: (file: string) => string;
  /** 이 실행(Actions run) 주소 */
  runUrl: string;
};

/** 캡처 표 자리에 넣을 것 */
export type CaptureSection =
  { kind: 'table'; captures: CaptureSummary } | { kind: 'skipped'; reason: string };

/**
 * 결과 요약으로 댓글 본문 목록을 만든다. 각 본문은 순서 번호가 든 숨은 표시로 시작한다.
 * @codocs [[피그마 일치 검사:CI 비교]]
 * @param summary 판정 결과 요약
 * @param options 이미지 주소와 실행 주소
 * @param capture 캡처 표(판정이 통과했을 때만 쓴다). 없으면 캡처 표 자리를 비운다
 * @returns 댓글 본문 목록과 쓰인 이미지 파일
 */
export function renderComments(
  summary: ParitySummary,
  options: CommentOptions,
  capture?: CaptureSection,
): { bodies: string[]; images: string[] } {
  const failedResults = summary.results.filter((result) => result.failures.length > 0);
  const isPassed = failedResults.length === 0 && summary.fileErrors.length === 0;
  const blocks: string[] = [];
  const images: string[] = [];
  let header: string;
  if (isPassed) {
    header = `피그마 일치 검사: ${String(summary.total)}개 모두 통과`;
    if (capture?.kind === 'skipped') {
      blocks.push(`캡처 표를 만들지 않았다: ${escapeMarkdown(capture.reason)}`);
    } else if (capture?.kind === 'table') {
      const tables = captureBlocks(capture.captures.rows, options);
      blocks.push(...tables.blocks);
      images.push(...tables.images);
    }
  } else {
    header = `피그마 일치 검사: ${String(summary.total)}개 중 ${String(failedResults.length)}개 실패`;
    if (summary.fileErrors.length > 0) {
      blocks.push(['**파일 오류**', ...summary.fileErrors.map((error) => `- ${error}`)].join('\n'));
    }
    const components = [...new Set(failedResults.map((result) => result.component))];
    for (const component of components) {
      blocks.push(
        failureBlock(
          component,
          failedResults.filter((result) => result.component === component),
        ),
      );
    }
  }
  const footer = `[실행 결과](${options.runUrl})`;
  return { bodies: paginate(header, blocks, footer), images };
}

/**
 * 컴포넌트 하나의 실패를 접힌 블록으로 쓴다. 같은 실패 줄을 가진 변형을 한 줄로 묶는다.
 * @param component 컴포넌트 폴더 이름
 * @param results 그 컴포넌트의 실패한 변형
 * @returns 블록
 */
function failureBlock(component: string, results: readonly VariantResult[]): string {
  const variantsByMessage = new Map<string, string[]>();
  for (const result of results) {
    for (const message of new Set(result.failures.map((failure) => failure.message))) {
      variantsByMessage.set(message, [...(variantsByMessage.get(message) ?? []), result.variant]);
    }
  }
  const lines = [...variantsByMessage].map(
    ([message, variants]) => `- ${groupVariants(variants)}: ${escapeMarkdown(message)}`,
  );
  return [
    `<details><summary>${component} (${String(results.length)}개 실패)</summary>`,
    '',
    ...lines,
    '',
    '</details>',
  ].join('\n');
}

/**
 * 캡처 표를 컴포넌트마다 `피그마 | 코드` 표로 쓴다. 줄은 변형과 상태, BOOLEAN 경우다.
 * @codocs [[피그마 일치 검사:캡처 표]]
 * @param rows 캡처 표 줄
 * @param options 이미지 주소
 * @returns 블록과 쓰인 이미지 파일
 */
function captureBlocks(
  rows: readonly CaptureRow[],
  options: CommentOptions,
): { blocks: string[]; images: string[] } {
  const blocks: string[] = [
    '**캡처 표**: 판정하지 않는 것(크기 방식, 안쪽 선, 재질, 줄바꿈, 위치)을 확인한다.',
  ];
  const images: string[] = [];
  const components = [...new Set(rows.map((row) => row.component))];
  for (const component of components) {
    const own = rows.filter((row) => row.component === component);
    for (let start = 0; start < own.length; start += CAPTURE_ROWS_PER_TABLE) {
      const chunk = own.slice(start, start + CAPTURE_ROWS_PER_TABLE);
      const lines = chunk.map((row) => captureLine(row, options));
      images.push(...chunk.flatMap((row) => [row.figma, row.code]).filter((file) => file !== null));
      const title = start === 0 ? component : `${component} (계속)`;
      blocks.push(
        [
          `<details open><summary>${title} (${String(own.length)}개)</summary>`,
          '',
          '| 변형 | 피그마 | 코드 |',
          '|---|---|---|',
          ...lines,
          '',
          '</details>',
        ].join('\n'),
      );
    }
  }
  return { blocks, images };
}

/**
 * 캡처 표 한 줄을 쓴다.
 * @param row 캡처 표 줄
 * @param options 이미지 주소
 * @returns 표 줄
 */
function captureLine(row: CaptureRow, options: CommentOptions): string {
  const figma = row.figma === null ? figmaMissing(row) : image(row.figma, '피그마', options);
  const code =
    row.code === null
      ? `캡처 실패: ${escapeMarkdown(row.error ?? '')}`
      : image(row.code, '코드', options);
  return `| \`${row.variant}\` | ${figma} | ${code} |`;
}

/**
 * 피그마 캡처가 없는 칸의 글자를 정한다.
 * @param row 캡처 표 줄
 * @returns 칸 글자
 */
function figmaMissing(row: CaptureRow): string {
  return row.isCase ? '피그마 PNG 없음(BOOLEAN 경우)' : '피그마 PNG 없음';
}

/**
 * 이미지 칸을 만든다.
 * @param file parity-results 기준 경로
 * @param alt 대체 글자
 * @param options 이미지 주소
 * @returns HTML 이미지
 */
function image(file: string, alt: string, options: CommentOptions): string {
  return `<img src="${options.imageUrl(file)}" alt="${alt}">`;
}

/**
 * 블록을 댓글 길이 제한에 맞춰 나눈다. 블록 하나가 너무 길면 줄 단위로 나눈다.
 * @param header 첫 댓글 머리말
 * @param blocks 블록
 * @param footer 마지막 댓글 꼬리말
 * @returns 댓글 본문
 */
function paginate(header: string, blocks: readonly string[], footer: string): string[] {
  const pages: string[][] = [[header]];
  let length = header.length;
  for (const block of blocks) {
    for (const piece of splitBlock(block)) {
      if (length + piece.length + 2 > COMMENT_LIMIT - footer.length) {
        pages.push([]);
        length = 0;
      }
      pages.at(-1)?.push(piece);
      length += piece.length + 2;
    }
  }
  pages.at(-1)?.push(footer);
  return pages.map((parts, index) => `${marker(index + 1)}\n${parts.join('\n\n')}`);
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
  const summaryLine = lines[0]?.startsWith('<details') === true ? lines[0] : '';
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
        (piece, index) =>
          `${index === 0 ? summaryLine : summaryLine.replace('</summary>', ' (계속)</summary>')}\n${piece.trim()}\n\n</details>`,
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
  return index === 1 ? `<!-- ${COMMENT_MARKER} -->` : `<!-- ${COMMENT_MARKER} ${String(index)} -->`;
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

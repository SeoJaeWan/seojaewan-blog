/**
 * PR 댓글 본문을 길이 제한에 맞춰 나누고, 댓글을 찾는 숨은 표시를 다룬다. GitHub를 부르지 않는 순수 함수다.
 * 모션 검사 댓글(motion-report.ts)이 쓴다.
 */

// GitHub 댓글 길이 제한(65,536자)보다 여유를 둔다.
export const COMMENT_LIMIT = 60_000;

/**
 * 댓글 나누기 설정.
 * - marker: 댓글을 찾는 숨은 표시 이름(`motion-check`)
 * - tableHeader: 표가 든 블록을 나눌 때 다시 쓰는 표 머리
 */
export type PaginateOptions = {
  marker: string;
  tableHeader: readonly string[];
};

/**
 * 블록을 댓글 길이 제한에 맞춰 나눈다. 블록 하나가 너무 길면 줄 단위로 나눈다.
 * @codocs [[피그마 연동:모션]]
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
 * 표 머리는 블록 안 첫 표의 머리를 쓴다. 블록에 표가 없으면 기본 머리를 쓴다.
 * @param text 블록
 * @param fallback 블록에서 표 머리를 찾지 못했을 때 다시 쓰는 표 머리
 * @returns 조각 목록
 */
function splitBlock(text: string, fallback: readonly string[]): string[] {
  if (text.length <= COMMENT_LIMIT / 2) {
    return [text];
  }
  const lines = text.split('\n');
  const headerIndex = lines.findIndex(
    (line, index) => line.startsWith('|') && lines[index + 1]?.startsWith('|---') === true,
  );
  const header = headerIndex >= 0 ? lines.slice(headerIndex, headerIndex + 2) : fallback;
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
 * @param name 숨은 표시 이름
 * @returns HTML 주석
 */
export function marker(index: number, name: string): string {
  return index === 1 ? `<!-- ${name} -->` : `<!-- ${name} ${String(index)} -->`;
}

/**
 * 댓글 본문의 숨은 표시에서 순서를 읽는다.
 * @param body 댓글 본문
 * @param name 숨은 표시 이름
 * @returns 순서(1부터), 이 도구의 댓글이 아니면 undefined
 */
export function markerIndex(body: string, name: string): number | undefined {
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

// Chrome 페이지에서 찾기의 일치 찾기와 이동 규칙이다.

// 글자를 찾지 않는 요소다(스크립트·스타일과, 값이 글자 노드가 아닌 입력칸).
const skippedTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT']);

// 글자 흐름을 나누는 블록 요소다. 서로 다른 블록의 글자는 이어 붙여 찾지 않는다(실제 Chrome과 같다).
const blockSelector = [
  'address',
  'article',
  'aside',
  'blockquote',
  'button',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'td',
  'th',
  'tr',
  'ul',
].join(',');

// 블록 사이에 넣는 글자. 입력칸은 한 줄이라 찾는 글자에 들어올 수 없다.
const BLOCK_BREAK = '\n';

/** 글자 노드 하나와 이은 글자 안에서의 시작 위치 */
type TextSegment = { node: Text; start: number };

/**
 * 영역 안의 글자에서 찾는 글자와 일치하는 곳을 모두 찾는다. 대소문자를 구분하지 않는 포함 검색이고 초성 검색은 하지 않는다.
 * 같은 블록 안의 글자는 서식(굵게, 링크 등)으로 나뉘어 있어도 이어서 찾는다. 겹치지 않게 앞에서부터 찾는다.
 * @codocs [[Chrome:페이지에서 찾기]]
 * @param root 찾을 영역(지금 탭의 페이지 본문)
 * @param query 찾는 글자
 * @returns 일치하는 곳. 문서 차례다. 찾는 글자가 비었으면 빈 목록
 */
export function findTextRanges(root: Node, query: string): Range[] {
  if (query === '') {
    return [];
  }
  const segments: TextSegment[] = [];
  let text = '';
  let lastBlock: Element | null = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode });
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!(node instanceof Text)) {
      continue;
    }
    const block = node.parentElement?.closest(blockSelector) ?? null;
    if (segments.length > 0 && block !== lastBlock) {
      text += BLOCK_BREAK;
    }
    lastBlock = block;
    segments.push({ node, start: text.length });
    text += node.data;
  }
  const haystack = toSearchCase(text);
  const needle = toSearchCase(query);
  const ranges: Range[] = [];
  for (
    let index = haystack.indexOf(needle);
    index !== -1;
    index = haystack.indexOf(needle, index + needle.length)
  ) {
    const range = createRange(segments, index, index + needle.length);
    if (range !== null) {
      ranges.push(range);
    }
  }
  return ranges;
}

/**
 * 다음(또는 이전) 일치의 차례. 끝에 닿으면 처음(또는 끝)으로 돌아간다.
 * @codocs [[Chrome:페이지에서 찾기]]
 * @param index 지금 차례(0부터)
 * @param total 일치 개수
 * @param direction 다음은 1, 이전은 -1
 * @returns 옮긴 차례. 일치가 없으면 0
 */
export function stepMatchIndex(index: number, total: number, direction: 1 | -1): number {
  if (total === 0) {
    return 0;
  }
  return (index + direction + total) % total;
}

/**
 * 찾을 글자 노드만 받는다. 숨긴 요소와 입력칸 안의 글자는 건너뛴다.
 * @param node 글자 노드
 * @returns 받을지
 */
function acceptNode(node: Node): number {
  const parent = node.parentElement;
  if (parent === null || skippedTags.has(parent.tagName) || parent.closest('[hidden]') !== null) {
    return NodeFilter.FILTER_REJECT;
  }
  return NodeFilter.FILTER_ACCEPT;
}

/**
 * 대소문자를 구분하지 않고 비교하도록 글자를 소문자로 바꾼다. 소문자로 바꾸면 길이가 바뀌는 글자는 그대로 두어
 * 바꾼 글자와 원래 글자의 위치가 어긋나지 않게 한다.
 * @param text 글자
 * @returns 비교용 글자
 */
function toSearchCase(text: string): string {
  return Array.from(text, (char) => {
    const lower = char.toLowerCase();
    return lower.length === char.length ? lower : char;
  }).join('');
}

/**
 * 이은 글자 안의 구간을 글자 노드 위의 Range로 바꾼다.
 * @param segments 글자 노드들
 * @param start 시작 위치
 * @param end 끝 위치
 * @returns Range. 구간이 글자 노드 밖이면 null
 */
function createRange(segments: readonly TextSegment[], start: number, end: number): Range | null {
  const from = findSegment(segments, start, false);
  const to = findSegment(segments, end, true);
  if (from === undefined || to === undefined) {
    return null;
  }
  const range = document.createRange();
  range.setStart(from.node, start - from.start);
  range.setEnd(to.node, end - to.start);
  return range;
}

/**
 * 위치가 든 글자 노드를 찾는다.
 * @param segments 글자 노드들
 * @param position 위치
 * @param isEnd 끝 위치인지. 끝 위치는 노드 끝에 닿아도 그 노드다
 * @returns 글자 노드. 없으면 undefined
 */
function findSegment(
  segments: readonly TextSegment[],
  position: number,
  isEnd: boolean,
): TextSegment | undefined {
  return segments.findLast((segment) =>
    isEnd
      ? segment.start < position && position <= segment.start + segment.node.data.length
      : segment.start <= position && position < segment.start + segment.node.data.length,
  );
}

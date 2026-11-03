import type { ChromeTabPage } from '@/shared/utils/chrome-tabs/chrome-tabs';
import type { RichTextAnnotations } from '@/shared/utils/post-body/post-body';

/** 글자 서식 하나. Notion 글자 서식(annotations)의 이름과 같다 */
export type RichTextMark = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code';

// 안쪽부터 감싸는 차례다. 인라인 코드가 가장 바깥이라 코드 서체 위에 굵게·기울임·줄이 겹친다.
const markOrder = [
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
] as const satisfies readonly RichTextMark[];

/**
 * 글자 조각에 걸린 서식을 안쪽부터 감싸는 차례로 고른다. Notion처럼 한 조각에 서식이 여럿 걸리면 모두 겹쳐 그리므로
 * 걸린 서식을 모두 돌려준다. 서식이 없으면 빈 목록이다.
 * @codocs [[Notion 블록:모양]]
 * @param annotations 글자 서식
 * @returns 안쪽부터 감쌀 서식
 */
export function getRichTextMarks(annotations: RichTextAnnotations | undefined): RichTextMark[] {
  if (annotations === undefined) {
    return [];
  }
  return markOrder.filter((mark) => annotations[mark] === true);
}

/** 글자 조각의 링크가 가는 곳 */
export type RichTextLinkTarget =
  /** 링크가 없다 */
  | { kind: 'none' }
  /** 외부 주소. 실제 브라우저의 새 탭에서 연다 */
  | { kind: 'external'; href: string }
  /** 블로그 안의 페이지. 같은 탭에서 그 페이지로 간다 */
  | { kind: 'page'; href: string; page: ChromeTabPage };

/**
 * 글자 조각의 링크가 어디로 가는지 정한다. 블로그 안의 페이지로 풀리면 같은 탭의 페이지, 아니면 외부 주소다.
 * @codocs [[Chrome:글 화면]]
 * @param link 링크 주소. 없으면 null
 * @param resolveLink 주소가 블로그 안의 페이지면 그 페이지를 돌려준다. 없으면 모든 링크가 외부 주소다
 * @returns 링크가 가는 곳
 */
export function getRichTextLinkTarget(
  link: string | null,
  resolveLink?: (href: string) => ChromeTabPage | null,
): RichTextLinkTarget {
  if (link === null) {
    return { kind: 'none' };
  }
  const page = resolveLink?.(link) ?? null;
  return page === null ? { kind: 'external', href: link } : { kind: 'page', href: link, page };
}

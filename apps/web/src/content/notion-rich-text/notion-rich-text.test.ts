import { describe, expect, it } from 'vitest';

import { type NotionRichText, toRichText } from './notion-rich-text';

/**
 * Notion 글자 조각을 만든다.
 * @param text 글자
 * @param options 서식과 링크
 * @returns Notion 글자 조각
 */
function notionText(
  text: string,
  options: Partial<NotionRichText['annotations']> & { href?: string } = {},
): NotionRichText {
  const { href = null, ...annotations } = options;
  return {
    plain_text: text,
    href,
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default',
      ...annotations,
    },
  };
}

// @codocs [[Notion 블록:모양]]
describe('Notion 블록:모양', () => {
  it('서식이 없는 조각은 서식 없이 옮긴다', () => {
    expect(toRichText([notionText('보통')])).toEqual([{ text: '보통', link: null }]);
  });

  it('굵게·기울임·밑줄·취소선·인라인 코드가 겹치면 모두 옮긴다', () => {
    expect(
      toRichText([
        notionText('모두', {
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
          code: true,
        }),
      ]),
    ).toEqual([
      {
        text: '모두',
        link: null,
        annotations: { bold: true, italic: true, underline: true, strikethrough: true, code: true },
      },
    ]);
  });

  it('Notion 색(글자색, 형광펜)은 따르지 않는다', () => {
    expect(
      toRichText([
        notionText('빨간 글자', { color: 'red' }),
        notionText('노란 배경', { color: 'yellow_background', bold: true }),
      ]),
    ).toEqual([
      { text: '빨간 글자', link: null },
      { text: '노란 배경', link: null, annotations: { bold: true } },
    ]);
  });

  it('블로그 주소로 가는 링크는 사이트 안 링크로 바꾼다', () => {
    expect(
      toRichText([
        notionText('글', { href: 'https://seojaewan.com/posts/react-19-hooks' }),
        notionText('www', { href: 'https://www.seojaewan.com/posts/a?x=1#b' }),
      ]).map((part) => part.link),
    ).toEqual(['/posts/react-19-hooks', '/posts/a?x=1#b']);
  });

  it('다른 주소로 가는 링크는 그대로 둔다', () => {
    expect(
      toRichText([
        notionText('문서', { href: 'https://developers.notion.com/' }),
        notionText('이미지 서버', { href: 'https://images.seojaewan.com/notion/a' }),
      ]).map((part) => part.link),
    ).toEqual(['https://developers.notion.com/', 'https://images.seojaewan.com/notion/a']);
  });
});

import { describe, expect, it } from 'vitest';

import { getRichTextLinkTarget, getRichTextMarks } from './rich-text-format';

// @codocs [[Notion 블록:모양]]
describe('글자 서식', () => {
  it('서식이 없는 조각은 감쌀 서식이 없다', () => {
    expect(getRichTextMarks(undefined)).toEqual([]);
    expect(getRichTextMarks({})).toEqual([]);
  });

  it('굵게만 걸린 조각은 굵게로 감싼다', () => {
    expect(getRichTextMarks({ bold: true })).toEqual(['bold']);
  });

  it('기울임만 걸린 조각은 기울임으로 감싼다', () => {
    expect(getRichTextMarks({ italic: true })).toEqual(['italic']);
  });

  it('밑줄만 걸린 조각은 밑줄로 감싼다', () => {
    expect(getRichTextMarks({ underline: true })).toEqual(['underline']);
  });

  it('취소선만 걸린 조각은 취소선으로 감싼다', () => {
    expect(getRichTextMarks({ strikethrough: true })).toEqual(['strikethrough']);
  });

  it('인라인 코드만 걸린 조각은 인라인 코드로 감싼다', () => {
    expect(getRichTextMarks({ code: true })).toEqual(['code']);
  });

  it('false로 적힌 서식은 감싸지 않는다', () => {
    expect(getRichTextMarks({ bold: false, italic: true, code: false })).toEqual(['italic']);
  });

  it('서식이 여럿 걸리면 Notion처럼 모두 겹치고, 인라인 코드가 가장 바깥이다', () => {
    expect(
      getRichTextMarks({
        code: true,
        strikethrough: true,
        underline: true,
        italic: true,
        bold: true,
      }),
    ).toEqual(['bold', 'italic', 'underline', 'strikethrough', 'code']);
  });
});

// @codocs [[Chrome:글 화면]]
describe('글자 조각의 링크', () => {
  it('링크가 없는 조각은 링크가 아니다', () => {
    expect(getRichTextLinkTarget(null, () => ({ kind: 'new-tab' }))).toEqual({ kind: 'none' });
  });

  it('블로그 안의 페이지로 풀리는 주소는 같은 탭에서 그 페이지로 간다', () => {
    expect(
      getRichTextLinkTarget('/posts/react', (href) =>
        href === '/posts/react' ? { kind: 'post', slug: 'react' } : null,
      ),
    ).toEqual({ kind: 'page', href: '/posts/react', page: { kind: 'post', slug: 'react' } });
  });

  it('블로그 안의 페이지가 아닌 주소는 외부 주소다', () => {
    expect(getRichTextLinkTarget('https://react.dev', () => null)).toEqual({
      kind: 'external',
      href: 'https://react.dev',
    });
  });

  it('페이지를 찾는 함수가 없으면 모든 링크가 외부 주소다', () => {
    expect(getRichTextLinkTarget('/posts/react')).toEqual({
      kind: 'external',
      href: '/posts/react',
    });
  });
});

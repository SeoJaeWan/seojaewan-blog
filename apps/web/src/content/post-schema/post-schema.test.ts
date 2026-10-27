import { describe, expect, it } from 'vitest';

import { parsePostIndex } from './post-schema';

const ROW = {
  title: 'React 19 훅 정리',
  slug: 'react-19-hooks',
  folder: 'React/Hooks',
  publishedAt: '2026-10-20',
  cover: null,
} as const;

// @codocs [[콘텐츠 원천:Notion 속성]]
describe('콘텐츠 원천:Notion 속성', () => {
  it('글 줄을 제목, slug, 폴더 경로, 작성일의 글 색인으로 바꾼다', () => {
    expect(parsePostIndex([ROW])).toEqual([
      {
        slug: 'react-19-hooks',
        title: 'React 19 훅 정리',
        folderPath: ['React', 'Hooks'],
        date: '2026-10-20',
      },
    ]);
  });

  it('폴더 속성이 비어 있으면 빈 경로이고, 경로 칸의 앞뒤 공백과 빈 칸은 지운다', () => {
    expect(parsePostIndex([{ ...ROW, folder: '' }])[0]?.folderPath).toEqual([]);
    expect(parsePostIndex([{ ...ROW, folder: ' React / /Hooks/ ' }])[0]?.folderPath).toEqual([
      'React',
      'Hooks',
    ]);
  });

  it('slug는 영어 소문자·숫자·하이픈만 쓰고, 겹치면 안 된다', () => {
    expect(() => parsePostIndex([{ ...ROW, slug: '리액트' }])).toThrow();
    expect(() => parsePostIndex([ROW, ROW])).toThrow();
  });

  it('작성일이 날짜가 아니면 거부한다', () => {
    expect(() => parsePostIndex([{ ...ROW, publishedAt: '2026/10/20' }])).toThrow();
  });
});

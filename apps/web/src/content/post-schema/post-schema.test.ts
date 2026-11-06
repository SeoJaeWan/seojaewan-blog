import { describe, expect, it } from 'vitest';

import { parsePostRows, toPostSummary } from './post-schema';

const ROW = {
  pageId: '410c97ba-fd89-8146-a87a-eca9b3451c50',
  title: 'React 19 훅 정리',
  slug: 'react-19-hooks',
  folder: 'React/Hooks',
  publishedAt: '2026-10-20',
  cover: null,
  summary: '',
  lastEditedAt: '2026-11-06T02:33:00.000Z',
} as const;

// @codocs [[콘텐츠 원천:Notion 속성]]
describe('콘텐츠 원천:Notion 속성', () => {
  it('공개 행을 묶음, 제목, slug, 폴더 경로, 작성일의 글 색인으로 바꾼다', () => {
    expect(toPostSummary(ROW, 'blog')).toEqual({
      collection: 'blog',
      slug: 'react-19-hooks',
      title: 'React 19 훅 정리',
      folderPath: ['React', 'Hooks'],
      date: '2026-10-20',
    });
  });

  it('slug는 영어 소문자·숫자·하이픈만 쓰고, 같은 데이터베이스 안에서 겹치면 안 된다', () => {
    expect(() => parsePostRows([{ ...ROW, slug: '리액트' }])).toThrow();
    expect(() => parsePostRows([ROW, ROW])).toThrow();
  });

  it('작성일이 날짜가 아니면 거부한다', () => {
    expect(() => parsePostRows([{ ...ROW, publishedAt: '2026/10/20' }])).toThrow();
  });

  it('제목이 비어 있으면 거부한다', () => {
    expect(() => parsePostRows([{ ...ROW, title: ' ' }])).toThrow();
  });

  it('고친 시각이 ISO 시각이 아니면 거부한다', () => {
    expect(() => parsePostRows([{ ...ROW, lastEditedAt: '2026-11-06' }])).toThrow();
  });
});

// @codocs [[작업 공간 맞추기:초기 구조]]
describe('작업 공간 맞추기:초기 구조', () => {
  it('폴더 속성이 비어 있으면 빈 경로(묶음 폴더 바로 아래)다', () => {
    expect(toPostSummary({ ...ROW, folder: '' }, 'blog').folderPath).toEqual([]);
  });

  it('하위 폴더는 `/`로 나눈 경로이고, 경로 칸의 앞뒤 공백과 빈 칸은 지운다', () => {
    expect(toPostSummary({ ...ROW, folder: ' React / /Hooks/ ' }, 'blog').folderPath).toEqual([
      'React',
      'Hooks',
    ]);
  });
});

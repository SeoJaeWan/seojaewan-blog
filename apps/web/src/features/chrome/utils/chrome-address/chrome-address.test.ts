import { describe, expect, it } from 'vitest';

import { createInitialWorkspace, trashItems } from '@/shared/utils/workspace-rules/workspace-rules';

import {
  getAddressSuggestions,
  getPageAddress,
  resolveAddress,
  searchPosts,
} from './chrome-address';

const workspace = createInitialWorkspace({
  posts: [
    { slug: 'react-19-hooks', title: '리액트 19 훅 정리', folderPath: [], date: '2026-10-20' },
    { slug: 'rsc', title: '리액트 서버 컴포넌트', folderPath: [], date: '2026-10-12' },
    { slug: 'next-cache', title: 'Next.js 캐시', folderPath: [], date: '2026-09-01' },
  ],
  links: [],
});

const HOST = 'localhost:3000';

// @codocs [[Chrome:주소창]]
describe('Chrome:주소창', () => {
  it('평소 주소창은 글 주소를 보이고 새 탭 페이지에서는 비어 있다', () => {
    expect(getPageAddress({ kind: 'post', slug: 'a' })).toBe('seojaewan.com/posts/a');
    expect(getPageAddress({ kind: 'new-tab' })).toBe('');
  });

  it('검색 결과는 검색어, 찾을 수 없음 화면은 입력한 주소를 보인다', () => {
    expect(getPageAddress({ kind: 'search', query: '리액트' })).toBe('리액트');
    expect(getPageAddress({ kind: 'not-found', url: '/posts/x' })).toBe('/posts/x');
  });

  it('블로그 글 주소를 입력하면 그 글로 간다', () => {
    const post = { type: 'page', page: { kind: 'post', slug: 'rsc' } };
    expect(resolveAddress('seojaewan.com/posts/rsc', workspace, HOST)).toEqual(post);
    expect(resolveAddress('https://seojaewan.com/posts/rsc/', workspace, HOST)).toEqual(post);
    expect(resolveAddress('/posts/rsc', workspace, HOST)).toEqual(post);
    expect(resolveAddress(`http://${HOST}/posts/rsc`, workspace, HOST)).toEqual(post);
  });

  it('없는 글 주소는 입력한 주소의 찾을 수 없음 화면이다', () => {
    expect(resolveAddress(' seojaewan.com/posts/none ', workspace, HOST)).toEqual({
      type: 'page',
      page: { kind: 'not-found', url: 'seojaewan.com/posts/none' },
    });
  });

  it('휴지통에 든 글도 주소로는 열린다', () => {
    const trashed = trashItems(workspace, ['post:rsc'], '2026-10-28T00:00:00.000Z');
    const state = trashed.ok ? trashed.state : workspace;
    expect(resolveAddress('/posts/rsc', state, HOST)).toEqual({
      type: 'page',
      page: { kind: 'post', slug: 'rsc' },
    });
  });

  it('외부 주소는 실제 브라우저의 새 탭에서 연다', () => {
    expect(resolveAddress('https://github.com/a', workspace, HOST)).toEqual({
      type: 'external',
      url: 'https://github.com/a',
    });
    expect(resolveAddress('example.com', workspace, HOST)).toEqual({
      type: 'external',
      url: 'https://example.com/',
    });
  });

  it('그 밖의 글자는 검색 결과 페이지로 간다', () => {
    expect(resolveAddress('리액트 훅', workspace, HOST)).toEqual({
      type: 'page',
      page: { kind: 'search', query: '리액트 훅' },
    });
    expect(resolveAddress('Next.js', workspace, HOST)).toEqual({
      type: 'page',
      page: { kind: 'search', query: 'Next.js' },
    });
  });

  it('빈 입력은 아무 데도 가지 않는다', () => {
    expect(resolveAddress('  ', workspace, HOST)).toBeNull();
  });

  it('입력 중 추천은 일치 규칙에 맞는 글과 끝의 검색 줄이다', () => {
    expect(getAddressSuggestions(workspace, '리액').map((entry) => entry.title)).toEqual([
      '리액트 19 훅 정리',
      '리액트 서버 컴포넌트',
      '리액 검색',
    ]);
  });

  it('추천과 검색 결과에서 휴지통에 든 글은 뺀다', () => {
    const trashed = trashItems(workspace, ['post:rsc'], '2026-10-28T00:00:00.000Z');
    const state = trashed.ok ? trashed.state : workspace;
    expect(getAddressSuggestions(state, '리액').map((entry) => entry.title)).toEqual([
      '리액트 19 훅 정리',
      '리액 검색',
    ]);
    expect(searchPosts(state, '리액트').map((post) => post.slug)).toEqual(['react-19-hooks']);
  });

  it('검색 결과는 제목에 검색어가 든 글이다', () => {
    expect(searchPosts(workspace, '캐시').map((post) => post.slug)).toEqual(['next-cache']);
  });
});

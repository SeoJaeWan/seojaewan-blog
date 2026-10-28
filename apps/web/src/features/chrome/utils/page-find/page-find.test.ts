import { afterEach, describe, expect, it } from 'vitest';

import { findTextRanges, stepMatchIndex } from './page-find';

afterEach(() => {
  document.body.innerHTML = '';
});

/**
 * HTML로 찾을 영역을 만든다.
 * @param html 영역 안 HTML
 * @returns 영역
 */
function area(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

/**
 * 일치한 곳의 글자들.
 * @param root 영역
 * @param query 찾는 글자
 * @returns 글자
 */
function matches(root: Node, query: string): string[] {
  return findTextRanges(root, query).map((range) => range.toString());
}

// @codocs [[Chrome:페이지에서 찾기]]
describe('Chrome:페이지에서 찾기', () => {
  it('대소문자를 구분하지 않는 포함 검색이다', () => {
    const root = area('<p>React와 react, REACT</p>');
    expect(matches(root, 'react')).toEqual(['React', 'react', 'REACT']);
  });

  it('초성 검색은 하지 않는다', () => {
    const root = area('<p>리액트 훅</p>');
    expect(matches(root, 'ㄹㅇㅌ')).toEqual([]);
  });

  it('서식으로 나뉜 같은 문단의 글자도 이어서 찾는다', () => {
    const root = area('<p><strong>use</strong> 훅과 <a href="/">링크</a></p>');
    expect(matches(root, 'use 훅')).toEqual(['use 훅']);
  });

  it('다른 블록의 글자는 이어 붙여 찾지 않는다', () => {
    const root = area('<h2>리액트</h2><p>훅</p>');
    expect(matches(root, '리액트훅')).toEqual([]);
  });

  it('입력칸 값과 숨긴 요소는 찾지 않는다', () => {
    const root = area('<input value="훅"><p hidden>훅</p><p>훅</p>');
    expect(matches(root, '훅')).toHaveLength(1);
  });

  it('찾는 글자가 비었으면 일치가 없다', () => {
    expect(matches(area('<p>글</p>'), '')).toEqual([]);
  });

  it('다음은 끝에 닿으면 처음으로, 이전은 처음에서 끝으로 돌아간다', () => {
    expect(stepMatchIndex(0, 3, 1)).toBe(1);
    expect(stepMatchIndex(2, 3, 1)).toBe(0);
    expect(stepMatchIndex(0, 3, -1)).toBe(2);
    expect(stepMatchIndex(0, 0, 1)).toBe(0);
  });
});

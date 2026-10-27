import { describe, expect, it } from 'vitest';

import { getChoseong, getMatchRank } from './name-match';

// @codocs [[검색:일치 규칙]]
describe('검색:일치 규칙', () => {
  it('이름에 검색어가 포함되면 맞는다', () => {
    expect(getMatchRank('리액트 훅', '훅')).toBe(2);
  });

  it('대소문자는 무시한다', () => {
    expect(getMatchRank('React', 'react')).toBe(0);
  });

  it('앞뒤 공백은 무시한다', () => {
    expect(getMatchRank('React', '  React ')).toBe(0);
  });

  it('검색어로 시작하면 포함보다 앞 단계다', () => {
    expect(getMatchRank('React Hooks', 'react')).toBe(1);
  });

  it('검색어가 초성으로만 이루어져 있으면 이름의 초성과 비교한다', () => {
    expect(getMatchRank('리액트', 'ㄹㅇㅌ')).toBe(0);
  });

  it('맞지 않으면 없다', () => {
    expect(getMatchRank('React', 'vue')).toBeNull();
  });

  it('검색어가 비면 없다', () => {
    expect(getMatchRank('React', ' ')).toBeNull();
  });

  it('한글 음절은 초성으로 바꾸고 다른 글자는 그대로 둔다', () => {
    expect(getChoseong('리액트 19')).toBe('ㄹㅇㅌ 19');
  });
});

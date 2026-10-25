import { describe, expect, it } from 'vitest';

import { getAvailableLetters, getStartLetter, groupByStartLetter } from './start-letter-rules';

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두', () => {
  it('기호로 시작하는 항목은 &로 묶는다', () => {
    expect(getStartLetter('.NET 정리')).toBe('&');
    expect(getStartLetter('@types 패키지')).toBe('&');
  });

  it('격자에 칸이 없는 문자(한글·라틴 밖)로 시작하는 항목은 &로 묶는다', () => {
    expect(getStartLetter('カタカナ')).toBe('&');
  });

  it('숫자로 시작하는 항목은 #으로 묶는다', () => {
    expect(getStartLetter('2026 회고')).toBe('#');
  });

  it('라틴 글자로 시작하는 항목은 대문자 글자로 묶는다', () => {
    expect(getStartLetter('chrome')).toBe('C');
    expect(getStartLetter('File Explorer')).toBe('F');
    expect(getStartLetter('Écrire')).toBe('E');
  });

  it('한글로 시작하는 항목은 초성으로 묶고 된소리는 예사소리 칸에 넣는다', () => {
    expect(getStartLetter('리액트 서버 컴포넌트')).toBe('ㄹ');
    expect(getStartLetter('힣')).toBe('ㅎ');
    expect(getStartLetter('까다로운 버그')).toBe('ㄱ');
    expect(getStartLetter('ㅆ로 시작')).toBe('ㅅ');
  });

  it('묶음은 글자 격자 순서(&, #, A~Z, ㄱ~ㅎ)로, 묶음 안은 이름순으로 놓는다', () => {
    const groups = groupByStartLetter([
      { title: '이력서' },
      { title: 'React 19 훅 정리' },
      { title: '2026 회고' },
      { title: 'React' },
      { title: '@types' },
      { title: 'Blog' },
    ]);
    expect(groups).toEqual([
      { label: '&', items: [{ title: '@types' }] },
      { label: '#', items: [{ title: '2026 회고' }] },
      { label: 'B', items: [{ title: 'Blog' }] },
      { label: 'R', items: [{ title: 'React' }, { title: 'React 19 훅 정리' }] },
      { label: 'ㅇ', items: [{ title: '이력서' }] },
    ]);
  });

  it('항목이 있는 글자만 누를 수 있는 글자로 구한다', () => {
    expect(
      getAvailableLetters([
        { label: 'C', items: [{ title: 'Chrome' }] },
        { label: 'D', items: [] },
        { label: 'ㄹ', items: [{ title: '리액트' }] },
      ]),
    ).toEqual(['C', 'ㄹ']);
  });
});

import { describe, expect, it } from 'vitest';

import { parseDirectives, parseDirectiveTexts } from './directives';

// @codocs [[피그마 연동:구조 검사]]
describe('@ 줄', () => {
  it('설명 글은 건너뛰고 키와 값을 읽는다', () => {
    const { directives, problems } = parseDirectives(
      '창을 여는 움직임이다.\n@repeat 1\n  @trigger open\n@trigger hover\n@reduced-motion 바로 바뀜',
    );
    expect(directives).toEqual({
      repeat: ['1'],
      trigger: ['open', 'hover'],
      'reduced-motion': ['바로 바뀜'],
    });
    expect(problems).toEqual([]);
  });

  it.each([
    ['@loop 1', '모르는 키'],
    ['@Repeat 1', '모르는 키'],
    ['@trigger', '값이 없다'],
    ['@repeat 0', '1 이상의 정수'],
    ['@repeat 1\n@repeat 2', '한 번만'],
    ['@direction sideways', 'alternate'],
  ])('%s를 고칠 줄로 돌려준다', (text, message) => {
    const [problem] = parseDirectives(text).problems;
    expect(problem).toContain(message);
  });

  it('여러 글을 이어 읽는다', () => {
    expect(parseDirectiveTexts(['@repeat 1', undefined, '@trigger open']).directives).toEqual({
      repeat: ['1'],
      trigger: ['open'],
    });
  });
});

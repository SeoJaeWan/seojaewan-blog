import { describe, expect, it } from 'vitest';

import {
  parseDirectives,
  parseDirectiveTexts,
  parseVariantDirectives,
  retiredNotice,
} from './directives';

// @codocs [[피그마 연동:구조 검사]]
describe('@ 줄', () => {
  it('설명 글은 건너뛰고 키와 값을 읽는다', () => {
    const { directives, problems, retired } = parseDirectives(
      '유지 조건이 있는 움직임이다.\n@hold 끄는 동안\n  @direction alternate\n@hold 포커스 동안',
    );
    expect(directives).toEqual({ hold: ['끄는 동안', '포커스 동안'], direction: ['alternate'] });
    expect(problems).toEqual([]);
    expect(retired).toEqual([]);
  });

  it.each([
    ['@loop 1', '모르는 키'],
    ['@Hold 1', '모르는 키'],
    ['@hold', '값이 없다'],
    ['@direction normal\n@direction reverse', '한 번만'],
    ['@direction sideways', 'alternate'],
  ])('%s를 고칠 줄로 돌려준다', (text, message) => {
    const [problem] = parseDirectives(text).problems;
    expect(problem).toContain(message);
  });

  it('더 쓰지 않는 키는 막지 않고 지울 줄로 돌려준다', () => {
    const { directives, problems, retired } = parseDirectives(
      '@sample-size width\n@runtime 열리는 메뉴\n@trigger focus-visible\n@repeat 1\n@reduced-motion 바로',
    );
    expect(directives).toEqual({});
    expect(problems).toEqual([]);
    expect(retired).toEqual([
      '@sample-size width',
      '@runtime 열리는 메뉴',
      '@trigger focus-visible',
      '@repeat 1',
      '@reduced-motion 바로',
    ]);
    expect(retiredNotice('FileRow', retired)).toContain('`@sample-size width`');
  });

  it('옛 모션 견본 주석은 @repeat·@trigger·@runtime·@reduced-motion을 받는다', () => {
    const { directives, problems, retired } = parseDirectives(
      '@repeat 1\n  @trigger open\n@trigger hover\n@reduced-motion 바로 바뀜\n@sample-size width',
      { isLegacySample: true },
    );
    expect(directives).toEqual({
      repeat: ['1'],
      trigger: ['open', 'hover'],
      'reduced-motion': ['바로 바뀜'],
    });
    expect(problems).toEqual([]);
    expect(retired).toEqual(['@sample-size width']);
    expect(parseDirectives('@repeat 0', { isLegacySample: true }).problems[0]).toContain(
      '1 이상의 정수',
    );
    expect(parseDirectives('@repeat 1\n@repeat 2', { isLegacySample: true }).problems[0]).toContain(
      '한 번만',
    );
  });

  it('여러 글을 이어 읽는다', () => {
    expect(parseDirectiveTexts(['@hold a', undefined, '@hold b']).directives).toEqual({
      hold: ['a', 'b'],
    });
  });

  it('단독 컴포넌트의 description은 한 번만 읽는다', () => {
    const standalone = { id: '1:1', description: '@hold a' };
    expect(parseVariantDirectives(standalone, standalone).directives).toEqual({ hold: ['a'] });
  });

  it('세트는 세트와 변형의 description을 이어 읽는다', () => {
    const { directives, retired } = parseVariantDirectives(
      { id: '1:1', description: '@sample-size width' },
      { id: '1:2', description: '@hold hover' },
    );
    expect(directives).toEqual({ hold: ['hover'] });
    expect(retired).toEqual(['@sample-size width']);
  });
});

import { describe, expect, it } from 'vitest';

import { extractCodocsRefs } from './code-evidence.ts';

// @codocs [[테스트 작성 규칙:E2E]]
describe('코드 근거', () => {
  it('JSDoc 안의 @codocs는 그 아래 선언의 줄·이름과 설명 첫 줄을 근거로 남긴다', () => {
    const refs = extractCodocsRefs([
      {
        file: 'apps/web/src/a.ts',
        text: [
          "import x from 'x';",
          '',
          '/**',
          ' * 항목을 연다.',
          ' * 둘째 줄은 쓰지 않는다.',
          ' * @codocs [[항목 조작:열기]]',
          ' * @param id 항목',
          ' */',
          'export function openItem(id: string): void {}',
        ].join('\n'),
      },
    ]);
    expect(refs.get('[[항목 조작:열기]]')).toEqual([
      { file: 'apps/web/src/a.ts', line: 9, name: 'openItem', description: '항목을 연다.' },
    ]);
  });

  it('// 주석 한 줄에 링크가 여럿이면 링크마다 같은 근거를 남긴다', () => {
    const refs = extractCodocsRefs([
      {
        file: 'apps/web/src/b.ts',
        text: [
          '// @codocs [[창 동작:창 조작]] [[스냅:끌어서 스냅]]',
          '// 창을 끈다.',
          'const dragWindow = () => {};',
        ].join('\n'),
      },
    ]);
    expect(refs.get('[[창 동작:창 조작]]')?.[0]).toMatchObject({
      line: 3,
      name: 'dragWindow',
      description: '창을 끈다.',
    });
    expect(refs.get('[[스냅:끌어서 스냅]]')).toHaveLength(1);
  });

  it('주석이 아닌 줄의 @codocs 글자와 선언이 아닌 다음 줄은 이름 없이 둔다', () => {
    const refs = extractCodocsRefs([
      {
        file: 'apps/web/src/c.ts',
        text: ["const text = '@codocs [[가:나]]';", '// @codocs [[다:라]]', '  ...rest,'].join(
          '\n',
        ),
      },
    ]);
    expect(refs.has('[[가:나]]')).toBe(false);
    expect(refs.get('[[다:라]]')?.[0]).toMatchObject({ line: 3, name: null, description: '' });
  });
});

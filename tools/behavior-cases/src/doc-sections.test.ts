import { describe, expect, it } from 'vitest';

import { firstLineOf, parseCodocsDoc, splitDocLink } from './doc-sections.ts';

const docText = [
  '_codocs:',
  '  id: item-actions',
  '  name: 항목 조작',
  '  parent:',
  '    - 화면별 기능',
  '개요: |',
  '  바탕화면 아이콘과 탐색기 항목이 함께 따르는 규칙이다.',
  '',
  '  둘째 문단.',
  '"8단계 E2E: 핵심 흐름": |',
  '  콜론이 든 섹션 이름이다.',
  '열기: |',
  '  | 조작 | 동작 |',
].join('\n');

// @codocs [[테스트 작성 규칙:E2E]]
describe('문서 링크', () => {
  it('codocs 문서의 이름과 최상위 섹션 본문을 읽는다', () => {
    const doc = parseCodocsDoc(docText, '.codocs/a.yaml');
    expect(doc?.name).toBe('항목 조작');
    expect([...(doc?.sections.keys() ?? [])]).toEqual(['개요', '8단계 E2E: 핵심 흐름', '열기']);
    expect(doc?.sections.get('개요')).toBe(
      '바탕화면 아이콘과 탐색기 항목이 함께 따르는 규칙이다.\n\n둘째 문단.',
    );
  });

  it('_codocs 이름이 없으면 codocs 문서로 보지 않는다', () => {
    expect(parseCodocsDoc('개요: |\n  본문', '.codocs/b.yaml')).toBeNull();
  });

  it('링크를 문서 이름과 섹션으로 나누고, \\:는 이름 안의 콜론으로 본다', () => {
    expect(splitDocLink('[[항목 조작:열기]]')).toEqual({ doc: '항목 조작', section: '열기' });
    expect(splitDocLink('[[a\\:b:c]]')).toEqual({ doc: 'a:b', section: 'c' });
  });

  it('섹션 첫 줄은 빈 줄을 건너뛰고 \\[[ 표시를 [[로 돌린다', () => {
    expect(firstLineOf('\n`@codocs \\[[문서:섹션]]` 형식\n다음 줄')).toBe(
      '`@codocs [[문서:섹션]]` 형식',
    );
  });
});

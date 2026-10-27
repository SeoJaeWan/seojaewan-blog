import { describe, expect, it } from 'vitest';

import { compareDatesNewestFirst, compareItemKinds, compareItemNames } from './item-sort';

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  it('이름은 숫자를 값으로 비교한다', () => {
    expect(['10', '2'].sort(compareItemNames)).toEqual(['2', '10']);
  });

  it('이름은 영어가 한글보다 앞이다', () => {
    expect(['가', 'b'].sort(compareItemNames)).toEqual(['b', '가']);
  });

  it('유형은 폴더, 글, 외부 링크 차례다', () => {
    expect((['link', 'post', 'folder'] as const).toSorted(compareItemKinds)).toEqual([
      'folder',
      'post',
      'link',
    ]);
  });
});

// @codocs [[바탕화면:빈 곳 우클릭 메뉴]]
describe('바탕화면:빈 곳 우클릭 메뉴', () => {
  it('날짜는 최근 것이 앞이고 날짜가 없으면 뒤다', () => {
    expect([null, '2026-01-01', '2026-02-01'].sort(compareDatesNewestFirst)).toEqual([
      '2026-02-01',
      '2026-01-01',
      null,
    ]);
  });
});

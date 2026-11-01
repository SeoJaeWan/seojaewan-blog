import { describe, expect, it } from 'vitest';

import { scrollThumb } from './scroll-thumb';

// @codocs [[디자인 기반:겹쳐 놓기]]
describe('scrollThumb', () => {
  it('내용이 넘치지 않으면 막대가 없다', () => {
    expect(
      scrollThumb({ clientHeight: 240, scrollHeight: 240, scrollTop: 0 }, 232),
    ).toBeUndefined();
  });

  it('보이는 비율로 길이를, 스크롤한 비율로 위치를 정한다', () => {
    expect(scrollThumb({ clientHeight: 240, scrollHeight: 636, scrollTop: 90 }, 232)).toEqual({
      offset: 40,
      length: 80,
    });
  });

  it('끝까지 스크롤하면 막대가 화살표 앞에서 끝난다', () => {
    const thumb = scrollThumb({ clientHeight: 240, scrollHeight: 636, scrollTop: 396 }, 232);
    expect(thumb && thumb.offset + thumb.length).toBe(222);
  });
});

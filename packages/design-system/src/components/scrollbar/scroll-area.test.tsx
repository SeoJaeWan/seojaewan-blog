import { fireEvent, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ScrollArea, scrollThumb } from './scroll-area';

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

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('ScrollArea', () => {
  // jsdom에는 ResizeObserver가 없다. 크기를 바꾸지 않는 테스트라 아무것도 하지 않는 것으로 둔다.
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('내용을 담고, 마우스를 올리면 스크롤바를 펼친다', () => {
    const { container, getByText } = render(
      <ScrollArea material="solid">
        <p>항목 이름</p>
      </ScrollArea>,
    );
    expect(getByText('항목 이름')).toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(root.querySelectorAll('svg')).toHaveLength(0);
    fireEvent.pointerEnter(root);
    expect(root.querySelectorAll('svg')).toHaveLength(2);
    fireEvent.pointerLeave(root);
    expect(root.querySelectorAll('svg')).toHaveLength(0);
  });

  it('내용이 넘치지 않으면 스크롤바를 숨긴다', () => {
    const { container } = render(<ScrollArea />);
    expect(container.querySelector('[aria-hidden]')).toHaveClass('invisible');
  });
});

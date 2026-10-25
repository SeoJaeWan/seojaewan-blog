import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExplorerContent } from './explorer-content';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('ExplorerContent', () => {
  it('desktop은 주소 줄·명령 막대·탐색 창·항목·상태 줄 슬롯을 채운다', () => {
    render(
      <ExplorerContent
        locationIcon={<span />}
        path={<span>경로 칸</span>}
        commands={<span>명령</span>}
        navigation={<span>폴더 트리</span>}
        itemCount="항목 6개"
      >
        <span>항목</span>
      </ExplorerContent>,
    );
    for (const text of ['경로 칸', '명령', '폴더 트리', '항목', '항목 6개']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    expect(screen.getByRole('searchbox', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '자세히' })).toBeInTheDocument();
  });

  it('mobile은 탐색 창과 보기 전환 버튼을 그리지 않는다', () => {
    render(
      <ExplorerContent device="mobile" locationIcon={<span />} navigation={<span>폴더 트리</span>}>
        <span>항목</span>
      </ExplorerContent>,
    );
    expect(screen.getByText('항목')).toBeInTheDocument();
    expect(screen.queryByText('폴더 트리')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '자세히' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
  });

  it('고정 부품의 버튼 동작을 넘긴다', async () => {
    const user = userEvent.setup();
    const handlers = {
      onBack: vi.fn(),
      onForward: vi.fn(),
      onUp: vi.fn(),
      onRefresh: vi.fn(),
      onDetailsView: vi.fn(),
      onLargeIconsView: vi.fn(),
    };
    render(<ExplorerContent locationIcon={<span />} {...handlers} />);
    for (const name of ['뒤로', '앞으로', '위로', '새로 고침', '자세히', '큰 아이콘']) {
      await user.click(screen.getByRole('button', { name }));
    }
    for (const handler of Object.values(handlers)) {
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });
});

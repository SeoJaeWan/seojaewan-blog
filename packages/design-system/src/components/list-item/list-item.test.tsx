import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ListItem } from './list-item';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('ListItem', () => {
  it('기본은 제목만 있는 한 줄(높이 36, 아이콘 16)이다', () => {
    const { container } = render(<ListItem icon={<i>아이콘</i>} />);
    expect(screen.getByText('항목 이름')).toBeInTheDocument();
    expect(screen.getByText('아이콘').parentElement).toHaveClass('size-icon-16');
    expect(container.firstChild).toHaveClass('h-36');
  });

  it('two-line은 부제를 함께 보이고 높이 52, 아이콘 32다', () => {
    const { container } = render(<ListItem size="two-line" icon={<i>아이콘</i>} />);
    expect(screen.getByText('보조 설명')).toBeInTheDocument();
    expect(screen.getByText('아이콘').parentElement).toHaveClass('size-icon-32');
    expect(container.firstChild).toHaveClass('h-52');
  });

  it('호출하는 쪽이 aria-selected를 덮을 수 있다(버튼 역할 줄은 undefined로 뺀다)', () => {
    const { container, rerender } = render(<ListItem icon={<i />} selected />);
    expect(container.firstChild).toHaveAttribute('aria-selected', 'true');
    rerender(<ListItem icon={<i />} selected aria-selected={undefined} />);
    expect(container.firstChild).not.toHaveAttribute('aria-selected');
  });

  it('showSubtitle을 끄면 부제를 숨긴다', () => {
    render(<ListItem size="two-line" showSubtitle={false} icon={<i />} />);
    expect(screen.queryByText('보조 설명')).not.toBeInTheDocument();
  });

  it('compact에서는 subtitle을 타입으로 막고 그리지 않는다', () => {
    // @ts-expect-error subtitle은 size="two-line"에서만 받는다
    render(<ListItem subtitle="부제" icon={<i />} />);
    expect(screen.queryByText('부제')).not.toBeInTheDocument();
  });

  it('trailing은 showTrailing일 때만 보인다', () => {
    const { rerender } = render(<ListItem icon={<i />} />);
    expect(screen.queryByText('부가 정보')).not.toBeInTheDocument();
    rerender(<ListItem showTrailing trailing="오늘" icon={<i />} />);
    expect(screen.getByText('오늘')).toBeInTheDocument();
  });

  it('selected면 선택된 바탕이고 aria-selected가 붙는다', () => {
    const { container } = render(<ListItem selected icon={<i />} />);
    expect(container.firstChild).toHaveAttribute('aria-selected', 'true');
    expect(container.firstChild).toHaveClass('bg-control-alt-fill-tertiary');
  });

  it('className은 바깥 배치에 합쳐진다', () => {
    const { container } = render(<ListItem className="w-400" icon={<i />} />);
    expect(container.firstChild).toHaveClass('w-400', 'flex');
  });
});

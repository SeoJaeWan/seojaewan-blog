import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Breadcrumb } from './breadcrumb';

// @codocs [[컴포넌트 목록:상태]]
describe('Breadcrumb', () => {
  it('Rest는 위치 아이콘과 꺾쇠 뒤에 경로 칸을 그린다', () => {
    const { container } = render(
      <Breadcrumb locationIcon={<i data-testid="loc" />}>
        <span>경로 칸</span>
      </Breadcrumb>,
    );
    expect(screen.getByTestId('loc')).toBeInTheDocument();
    expect(screen.getByText('경로 칸')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('Editing은 경로 대신 주소 입력창을 그린다', () => {
    render(
      <Breadcrumb locationIcon={<i data-testid="loc" />} editing address="바탕 화면">
        <span>경로 칸</span>
      </Breadcrumb>,
    );
    expect(screen.getByRole('textbox', { name: '주소' })).toHaveValue('바탕 화면');
    expect(screen.queryByText('경로 칸')).toBeNull();
    expect(screen.queryByTestId('loc')).toBeNull();
  });
});

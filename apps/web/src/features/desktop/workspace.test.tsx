import { render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Workspace } from './workspace';

// @codocs [[바탕화면:표시하는 항목]]
describe('바탕화면:표시하는 항목', () => {
  it('처음에는 바탕화면에 휴지통, Blog 폴더, 외부 링크(GitHub, 이력서)가 보인다', () => {
    render(<Workspace />);
    const desktop = screen.getByRole('main', { name: '바탕화면' });
    for (const name of ['휴지통', 'Blog', 'GitHub', '이력서']) {
      expect(within(desktop).getByText(name)).toBeInTheDocument();
    }
  });
});

// @codocs [[작업 표시줄:시계]]
describe('작업 표시줄:시계', () => {
  it('서버 HTML에는 시계를 그리지 않고, 마운트한 뒤 기기의 시간을 보여준다', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 20, 15, 24));
    try {
      expect(renderToString(<Workspace />)).not.toContain('오후 3:24');
      render(<Workspace />);
      expect(screen.getByText('오후 3:24')).toBeInTheDocument();
      expect(screen.getByText('2026-10-20')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

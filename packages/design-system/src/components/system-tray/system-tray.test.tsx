import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SystemTray } from './system-tray';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('SystemTray', () => {
  it('time과 date를 위아래 두 줄로 그린다', () => {
    render(<SystemTray time="오후 3:20" date="2026-10-24" />);
    expect(screen.getByText('오후 3:20')).toBeInTheDocument();
    expect(screen.getByText('2026-10-24')).toBeInTheDocument();
  });

  it('값을 주지 않으면 자리를 설명하는 기본 문구를 그린다', () => {
    render(<SystemTray />);
    expect(screen.getByText('시간')).toBeInTheDocument();
    expect(screen.getByText('날짜')).toBeInTheDocument();
  });
});

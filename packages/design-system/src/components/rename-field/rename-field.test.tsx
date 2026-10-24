import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RenameField } from './rename-field';

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
describe('RenameField', () => {
  it('기본 글자는 이름이다', () => {
    render(<RenameField />);
    expect(screen.getByText('이름')).toBeInTheDocument();
  });

  it('text를 보여 준다', () => {
    render(<RenameField text="문서" />);
    expect(screen.getByText('문서')).toBeInTheDocument();
  });
});

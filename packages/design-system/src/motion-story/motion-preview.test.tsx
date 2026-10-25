import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MotionPreview } from './motion-preview';

/**
 * 모션 클래스를 받은 견본 요소를 그리는 미리보기를 만든다.
 * @returns 렌더링 결과
 */
function renderPreview(): ReturnType<typeof render> {
  return render(
    <MotionPreview
      motionClass="motion-window-open"
      runtimeValues={{ '--motion-target-x': '120px' }}
    >
      {(motionClassName) => <div role="img" aria-label="견본" className={motionClassName} />}
    </MotionPreview>,
  );
}

// @codocs [[피그마 연동:모션]]
describe('모션', () => {
  it('모션 스토리는 견본과 같은 요소에 모션 클래스를 걸어 재생한다', () => {
    renderPreview();
    expect(screen.getByRole('img', { name: '견본' })).toHaveClass('motion-window-open');
  });

  it('다시 재생은 견본을 새로 그려 애니메이션을 처음부터 시작한다', async () => {
    renderPreview();
    const before = screen.getByRole('img', { name: '견본' });
    await userEvent.click(screen.getByRole('button', { name: '다시 재생' }));
    const after = screen.getByRole('img', { name: '견본' });
    expect(after).not.toBe(before);
    expect(after).toHaveClass('motion-window-open');
  });

  it('느리게 보기는 눌림 상태로 켜고 끈다', async () => {
    renderPreview();
    const slow = screen.getByRole('button', { name: '느리게 보기' });
    expect(slow).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(slow);
    expect(slow).toHaveAttribute('aria-pressed', 'true');
  });

  it('실행 중 값은 견본을 감싼 요소에 CSS 변수로 넣는다', () => {
    renderPreview();
    const stage = screen.getByRole('img', { name: '견본' }).parentElement?.parentElement;
    expect(stage?.style.getPropertyValue('--motion-target-x')).toBe('120px');
  });
});

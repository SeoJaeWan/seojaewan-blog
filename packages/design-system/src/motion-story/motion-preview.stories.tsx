import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { MotionPreview } from './motion-preview';

// 모션 스토리(`Motion/<이름>`)가 아니라 모션 스토리를 감싸는 도구 자체의 동작 스토리다.
// 제목이 `Motion/`으로 시작하면 모션 시간 검사가 모션 스토리로 읽으므로 `Tools/`에 둔다.
const meta = {
  title: 'Tools/MotionPreview',
  component: MotionPreview,
  args: {
    motionClass: 'motion-window-open',
    runtimeValues: { '--motion-target-x': '120px' },
    children: (motionClassName: string) => (
      <div role="img" aria-label="견본" className={motionClassName} />
    ),
  },
} satisfies Meta<typeof MotionPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:모션]]
/** 견본에 모션 클래스를 걸어 재생하고, 다시 재생과 느리게 보기 버튼을 둔다 */
export const Default: Story = {
  play: async ({ canvas, userEvent, step }) => {
    const sample = canvas.getByRole('img', { name: '견본' });

    await step('견본과 같은 요소에 모션 클래스를 건다', async () => {
      await expect(sample).toHaveClass('motion-window-open');
    });

    await step('실행 중 값을 견본을 감싼 요소에 CSS 변수로 넣는다', async () => {
      const stage = sample.parentElement?.parentElement;
      await expect(stage?.style.getPropertyValue('--motion-target-x')).toBe('120px');
    });

    await step('다시 재생은 견본을 새로 그려 애니메이션을 처음부터 시작한다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '다시 재생' }));
      const replayed = canvas.getByRole('img', { name: '견본' });
      await expect(replayed).not.toBe(sample);
      await expect(replayed).toHaveClass('motion-window-open');
    });

    await step('느리게 보기는 눌림 상태로 켜고 끈다', async () => {
      const slow = canvas.getByRole('button', { name: '느리게 보기' });
      await expect(slow).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(slow);
      await expect(slow).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(slow);
      await expect(slow).toHaveAttribute('aria-pressed', 'false');
    });
  },
};

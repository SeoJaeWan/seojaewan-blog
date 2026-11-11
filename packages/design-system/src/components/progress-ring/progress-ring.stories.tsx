import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, type ReactNode, useLayoutEffect } from 'react';
import { expect } from 'storybook/test';

import { ProgressRing } from './progress-ring';

// 피그마 ProgressRing의 변형 속성 값이다(정규화한 이름).
const VARIANTS = ['accent', 'on-dark'] as const;
const SIZES = ['16', '32', '64'] as const;

type FigmaArgs = {
  variant: (typeof VARIANTS)[number];
  size: (typeof SIZES)[number];
};

/**
 * on-dark 링은 흰 호라 기본(흰) 화면 위에서는 보이지 않으므로, 쓰는 곳인 재부팅 화면의 바탕색을 화면에 깐다.
 * @param props
 * @param props.variant 피그마 Variant
 * @param props.children 그릴 링
 * @returns 링
 */
function Backdrop(props: { variant: FigmaArgs['variant']; children: ReactNode }): JSX.Element {
  const { variant, children } = props;
  useLayoutEffect(() => {
    if (variant !== 'on-dark') {
      return undefined;
    }
    document.body.style.backgroundColor = 'var(--color-black)';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [variant]);
  return <>{children}</>;
}

const meta = {
  title: 'Components/ProgressRing',
  args: { variant: 'accent', size: '16' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    size: { control: 'inline-radio', options: SIZES },
  },
  render: (args) => (
    <Backdrop variant={args.variant}>
      <ProgressRing variant={args.variant} size={args.size} aria-label="불러오는 중" />
    </Backdrop>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
// @codocs [[피그마 연동:PR 흐름]]
/** 진행 표시 역할과 쓰는 곳이 붙인 이름을 갖고, 호가 늘 돈다 */
export const Default: Story = {
  render: () => <ProgressRing aria-label="불러오는 중" />,
  play: async ({ canvas, step }) => {
    const ring = canvas.getByRole('progressbar', { name: '불러오는 중' });

    await step('호 자산이 링 모션으로 도는 중이다', async () => {
      await expect(ring.getAnimations({ subtree: true }).length).toBeGreaterThan(0);
    });
  },
};

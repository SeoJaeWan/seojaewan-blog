import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BootScreen } from './boot-screen';

// 피그마 BootScreen의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type FigmaArgs = {
  device: (typeof DEVICES)[number];
};

const meta = {
  title: 'Components/BootScreen',
  // 화면 전체를 덮는 컴포넌트라 Storybook 기본 여백과 가운데 정렬을 쓰지 않는다.
  parameters: { layout: 'fullscreen' },
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => <BootScreen device={args.device} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('진행 링을 접근성 이름과 함께 그린다', async () => {
      await expect(
        within(canvasElement).getByRole('progressbar', { name: '다시 시작하는 중' }),
      ).toBeInTheDocument();
    });
  },
};

// 서버가 화면 크기를 모를 때 쓰는 `auto`. 화면 구간 CSS(`mobile:`)가 피그마 Device와 같은 크기를 고른다.
// 스토리 화면은 PC 구간이라 desktop과 같은 크기다.
export const AutoDevice: Story = {
  render: () => <BootScreen device="auto" progressLabel="시작하는 중" />,
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step(
      '진행 링 이름을 쓰는 곳이 정하고, 로고는 PC 구간에서 desktop 크기(120px)다',
      async () => {
        const canvas = within(canvasElement);
        const ring = canvas.getByRole('progressbar', { name: '시작하는 중' });
        await expect(ring).toBeInTheDocument();
        const logo = ring.parentElement?.firstElementChild;
        await expect(logo?.getBoundingClientRect().width).toBe(120);
      },
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CaptionButton } from './caption-button';

// 피그마 CaptionButton의 변형 속성 값이다(정규화한 이름).
const VARIANTS = ['default', 'close'] as const;
const STATES = ['rest', 'hover', 'pressed', 'inactive'] as const;

type FigmaArgs = {
  variant: (typeof VARIANTS)[number];
  state: (typeof STATES)[number];
  /** 동작 스토리가 호출 횟수를 확인하려고 받는다 */
  onClick?: ComponentProps<typeof CaptionButton>['onClick'];
};

const meta = {
  title: 'Components/CaptionButton',
  args: { variant: 'default', state: 'rest' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => {
    const { onClick: handleClick } = args;
    return (
      <CaptionButton
        variant={args.variant}
        label={args.variant === 'close' ? '닫기' : '최소화'}
        isInactive={args.state === 'inactive'}
        onClick={handleClick}
      />
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현하고, Inactive는 args로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Default: Story = {
  args: { onClick: fn() },
  play: async ({ args, canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('label을 접근성 이름으로 갖고 누르면 onClick을 부른다', async () => {
      await userEvent.click(within(canvasElement).getByRole('button', { name: '최소화' }));
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Inactive: Story = {
  args: { state: 'inactive', onClick: fn() },
  play: async ({ args, canvasElement, step }) => {
    const button = within(canvasElement).getByRole('button', { name: '최소화' });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('창이 비활성이어도 누를 수 있다', async () => {
      await userEvent.click(button);
      await expect(button).toBeEnabled();
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });
  },
};

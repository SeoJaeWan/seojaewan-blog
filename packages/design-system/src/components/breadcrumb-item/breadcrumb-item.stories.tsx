import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BreadcrumbItem } from './breadcrumb-item';

// 피그마 BreadcrumbItem의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'pressed'] as const;

type FigmaArgs = {
  current: boolean;
  state: (typeof STATES)[number];
  /** 동작 스토리가 쓰는 값이다. 주지 않으면 피그마 기본 글자다 */
  label?: string;
  showSeparator?: boolean;
  onLabelClick?: ComponentProps<typeof BreadcrumbItem>['onLabelClick'];
};

const meta = {
  title: 'Components/BreadcrumbItem',
  args: { current: false, state: 'rest' },
  argTypes: {
    current: { control: 'boolean' },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => {
    const { onLabelClick: handleLabelClick } = args;
    return (
      <BreadcrumbItem
        current={args.current}
        label={args.label}
        showSeparator={args.showSeparator}
        onLabelClick={handleLabelClick}
      />
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
export const Default: Story = {
  args: { onLabelClick: fn() },
  play: async ({ args, canvasElement, step }) => {
    const button = within(canvasElement).getByRole('button', { name: '위치 이름' });

    // @codocs [[컴포넌트 목록:상태]]
    await step('기본은 현재 위치가 아니고 구분자를 그린다', async () => {
      await expect(button).not.toHaveAttribute('aria-current');
      await expect(canvasElement.firstElementChild).toHaveAttribute('data-separator', 'true');
    });

    // @codocs [[컴포넌트 목록:상태]]
    await step('위치 이름 버튼을 누르면 onLabelClick을 부른다', async () => {
      await userEvent.click(button);
      await expect(args.onLabelClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
export const Current: Story = {
  args: { current: true, label: '문서', showSeparator: false },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:상태]]
    await step('current는 aria-current를 붙이고 showSeparator를 끄면 구분자가 없다', async () => {
      await expect(within(canvasElement).getByRole('button', { name: '문서' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(canvasElement.firstElementChild).toHaveAttribute('data-separator', 'false');
    });
  },
};

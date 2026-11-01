import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DropDownButton } from './drop-down-button';

// 피그마 DropDownButton의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover', 'pressed', 'disabled', 'focused'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Label */
  label: string;
  /** 동작 스토리가 호출 횟수를 확인하려고 받는다 */
  onClick?: ComponentProps<typeof DropDownButton>['onClick'];
};

const meta = {
  title: 'Components/DropDownButton',
  // 글자는 피그마 Label 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', label: '레이블' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    label: { control: 'text' },
  },
  render: (args) => {
    const { onClick: handleClick } = args;
    return (
      <DropDownButton
        label={args.label}
        disabled={args.state === 'disabled'}
        onClick={handleClick}
      />
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Parity: Story = {};

// @codocs [[컴포넌트 목록:상태]]
export const Default: Story = {
  args: { onClick: fn() },
  play: async ({ args, canvasElement, step }) => {
    const button = within(canvasElement).getByRole('button', { name: '레이블' });

    // @codocs [[컴포넌트 목록:상태]]
    await step('누르거나 키보드로 실행하면 onClick을 부른다', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
export const Disabled: Story = {
  args: { state: 'disabled', onClick: fn() },
  play: async ({ args, canvasElement, step }) => {
    const button = within(canvasElement).getByRole('button', { name: '레이블' });

    // @codocs [[컴포넌트 목록:상태]]
    await step('disabled면 누를 수 없고 Tab 포커스도 받지 않는다', async () => {
      await userEvent.click(button);
      await userEvent.tab();
      await expect(button).toBeDisabled();
      await expect(button).not.toHaveFocus();
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  },
};

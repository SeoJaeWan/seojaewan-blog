import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { IconButton } from './icon-button';

// 피그마 IconButton의 변형 속성 값이다(정규화한 이름).
const STYLES = ['standard', 'subtle', 'chrome'] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled', 'focused'] as const;

type ParityArgs = {
  style: (typeof STYLES)[number];
  state: (typeof STATES)[number];
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
};

const meta = {
  title: 'Components/IconButton',
  args: { style: 'standard', state: 'rest' },
  argTypes: {
    style: { control: 'inline-radio', options: STYLES },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    <IconButton variant={args.style} label="더 보기" disabled={args.state === 'disabled'} />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Parity: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 라벨을 접근성 이름으로 갖는 버튼이다. 누르거나 키보드로 실행하면 onClick을 부른다 */
export const Default: Story = {
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => <IconButton label="더 보기" onClick={handleClick} />,
  play: async ({ args, canvas, userEvent, step }) => {
    const button = canvas.getByRole('button', { name: '더 보기' });

    await step('Tab으로 포커스를 받고 Enter로 실행한다', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });

    await step('누르면 실행한다', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 비활성이면 누를 수 없고 Tab 포커스도 받지 않는다 */
export const Disabled: Story = {
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <IconButton disabled label="더 보기" onClick={handleClick} />
  ),
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '더 보기' });

    await userEvent.click(button);
    await userEvent.tab();

    await expect(button).toBeDisabled();
    await expect(button).not.toHaveFocus();
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { RenameField } from './rename-field';

type ParityArgs = {
  /** 피그마 변형 속성 State */
  state: 'selected' | 'rest';
  /** 피그마 TEXT 속성 text */
  text: string;
  /** 동작 스토리에서 입력을 확인하는 핸들러 */
  onChange?: () => void;
  /** 동작 스토리에서 키 입력을 확인하는 핸들러 */
  onKeyDown?: (event: { key: string }) => void;
  /** 동작 스토리에서 input에 건 ref를 확인하는 핸들러 */
  onRef?: (node: HTMLInputElement | null) => void;
};

const meta = {
  title: 'Components/RenameField',
  // 너비가 31로 홀수라 가운데 정렬하면 0.5px 위치에 놓여 그림이 밀리므로 여백 배치를 쓴다.
  parameters: { layout: 'padded' },
  // 글자는 피그마 text 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'selected', text: '이름' },
  argTypes: {
    state: { control: 'inline-radio', options: ['selected', 'rest'] },
    text: { control: 'text' },
  },
  render: (args) => (
    // text와 state는 마운트 때만 쓰는 값이라 바꾸면 처음부터 다시 그리도록 key를 바꾼다.
    // selected는 마운트할 때 전체가 선택되어 피그마의 파랗게 선택된 이름과 같고, rest는 선택하지 않는다.
    <RenameField
      key={`${args.state}-${args.text}`}
      aria-label="이름 바꾸기"
      text={args.text}
      shouldSelectOnMount={args.state === 'selected'}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// args의 state로 피그마 변형(Selected, Rest)을 고른다.
export const Parity: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 처음 값은 이름이다. 마운트하면 포커스를 받고 이름 전체를 선택하므로, 입력하면 이름을 바꾸고 onChange를 부른다 */
export const Default: Story = {
  args: { onChange: fn() },
  render: ({ onChange: handleChange }) => (
    <RenameField aria-label="이름 바꾸기" onChange={handleChange} />
  ),
  play: async ({ args, canvas, userEvent, step }) => {
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: '이름 바꾸기' });

    await step('처음 값을 전체 선택한 채 포커스를 받는다', async () => {
      await expect(input).toHaveValue('이름');
      await expect(input).toHaveFocus();
      await expect(input.selectionStart).toBe(0);
      await expect(input.selectionEnd).toBe('이름'.length);
    });

    await step('입력하면 선택된 이름을 바꾸고 onChange를 부른다', async () => {
      await userEvent.keyboard('메모');
      await expect(input).toHaveValue('메모');
      await expect(args.onChange).toHaveBeenCalled();
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** shouldSelectOnMount가 false면 포커스만 받고 선택하지 않는다 */
export const NotSelected: Story = {
  render: () => <RenameField aria-label="이름 바꾸기" text="문서" shouldSelectOnMount={false} />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole<HTMLInputElement>('textbox', { name: '이름 바꾸기' });

    await expect(input).toHaveFocus();
    await expect(input.selectionStart).toBe(input.selectionEnd);
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** value, onKeyDown, ref를 input에 넘긴다 */
export const Controlled: Story = {
  args: { onChange: fn(), onKeyDown: fn(), onRef: fn() },
  render: ({ onChange: handleChange, onKeyDown: handleKeyDown, onRef: handleRef }) => (
    <RenameField
      ref={handleRef}
      aria-label="이름 바꾸기"
      value="고정"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  ),
  play: async ({ args, canvas, userEvent }) => {
    const input = canvas.getByRole('textbox', { name: '이름 바꾸기' });

    await userEvent.keyboard('{Enter}');

    await expect(input).toHaveValue('고정');
    await expect(args.onRef).toHaveBeenCalledWith(input);
    await expect(args.onKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
  },
};

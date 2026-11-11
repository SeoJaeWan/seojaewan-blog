import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { RenameField } from './rename-field';

type FigmaArgs = {
  /** 피그마 TEXT 속성 Text */
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
  // 변형 속성이 없다. 글자는 피그마 Text 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { text: '이름' },
  argTypes: {
    text: { control: 'text' },
  },
  render: (args) => (
    // text는 마운트 때만 쓰는 값이라 바꾸면 처음부터 다시 그리도록 key를 바꾼다.
    // 마운트할 때 전체가 선택되어 피그마의 파랗게 선택된 이름과 같다.
    <RenameField key={args.text} aria-label="이름 바꾸기" text={args.text} />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(default)를 그린다.
export const Figma: Story = {};

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

// @codocs [[항목과 폴더:폴더 이름]]
/**
 * isMultiline이면 textarea다. 한 줄 이름은 한 줄 입력창과 크기가 같다. Enter·Shift + Enter는 줄 바꿈 문자를 넣지 않고
 * onKeyDown으로 넘어간다. 부모 너비 안에서 줄을 바꾸는 모습은 FileItem 스토리(RenamingLongName)가 확인한다
 */
export const Multiline: Story = {
  args: { onKeyDown: fn() },
  render: ({ onKeyDown: handleKeyDown }) => (
    <>
      <RenameField aria-label="한 줄" />
      <RenameField aria-label="여러 줄" isMultiline onKeyDown={handleKeyDown} />
    </>
  ),
  play: async ({ args, canvas, userEvent, step }) => {
    const single = canvas.getByRole('textbox', { name: '한 줄' });
    const multi = canvas.getByRole<HTMLTextAreaElement>('textbox', { name: '여러 줄' });

    await step(
      '여러 줄 입력창(textarea)으로 그리고 한 줄 이름이면 한 줄 입력창과 크기가 같다',
      async () => {
        await expect(multi.tagName).toBe('TEXTAREA');
        await expect([multi.offsetWidth, multi.offsetHeight]).toEqual([
          single.offsetWidth,
          single.offsetHeight,
        ]);
      },
    );

    await step(
      'Enter와 Shift + Enter는 줄 바꿈 문자를 넣지 않고 onKeyDown으로 넘긴다',
      async () => {
        multi.focus();
        const before = multi.value;
        await userEvent.keyboard('{Enter}{Shift>}{Enter}{/Shift}');
        await expect(multi.value).toBe(before);
        await expect(args.onKeyDown).toHaveBeenCalledWith(
          expect.objectContaining({ key: 'Enter' }),
        );
      },
    );
  },
};

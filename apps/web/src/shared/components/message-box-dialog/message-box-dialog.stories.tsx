import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ComponentProps, type JSX, useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';

import { MessageBoxDialog } from './message-box-dialog';

const TITLE = '휴지통 비우기';
const MESSAGE = '소중한 글이에요 지우지 말아주세요';

type OpenerProps = Omit<ComponentProps<typeof MessageBoxDialog>, 'open' | 'onOpenChange'>;

/**
 * 버튼으로 메시지 상자를 여는 화면을 그린다.
 * @param props MessageBoxDialog에 넘길 속성
 * @returns 열기 버튼과 메시지 상자
 */
function Opener(props: OpenerProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  /** 메시지 상자를 연다. */
  function handleOpenClick(): void {
    setIsOpen(true);
  }

  /**
   * 메시지 상자가 알린 열림 여부를 따른다.
   * @param isNextOpen 바뀐 열림 여부
   */
  function handleOpenChange(isNextOpen: boolean): void {
    setIsOpen(isNextOpen);
  }

  return (
    <>
      <button type="button" onClick={handleOpenClick}>
        열기
      </button>
      <MessageBoxDialog {...props} isOpen={isOpen} onOpenChange={handleOpenChange} />
    </>
  );
}

// @codocs [[저장소 구성:앱 폴더 구조]]
// 동작 스토리다. 열기 버튼으로 메시지 상자를 모달 대화 상자로 띄운다. 버튼과 Esc가 닫는다.
const meta = {
  title: 'Shared/MessageBoxDialog',
  component: MessageBoxDialog,
  args: { title: TITLE, message: MESSAGE, buttons: 'two', onPrimaryClick: fn() },
  render: (args) => <Opener {...args} />,
} satisfies Meta<typeof MessageBoxDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 열기 버튼을 누르면 메시지 상자가 뜬다. 확인·취소 버튼과 Esc가 닫는다 */
export const OpenAndClose: Story = {
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // @codocs [[휴지통:비우기]]
    await step('열면 제목을 이름으로, 메시지를 설명으로 갖는 alertdialog가 뜬다', async () => {
      await expect(body.queryByRole('alertdialog')).not.toBeInTheDocument();

      await userEvent.click(canvas.getByRole('button', { name: '열기' }));

      const dialog = await body.findByRole('alertdialog', { name: TITLE });
      await expect(dialog).toHaveAccessibleDescription(MESSAGE);
    });

    await step('취소 버튼을 누르면 닫힌다', async () => {
      await userEvent.click(body.getByRole('button', { name: '취소' }));

      await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    // @codocs [[휴지통:비우기]]
    await step('확인 버튼을 누르면 핸들러를 부르고 닫힌다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '열기' }));
      await userEvent.click(await body.findByRole('button', { name: '확인' }));

      await expect(args.onPrimaryClick).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    await step('Esc를 누르면 닫힌다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '열기' }));
      await body.findByRole('alertdialog', { name: TITLE });

      await userEvent.keyboard('{Escape}');

      await waitFor(() => expect(body.queryByRole('alertdialog')).not.toBeInTheDocument());
    });
  },
};

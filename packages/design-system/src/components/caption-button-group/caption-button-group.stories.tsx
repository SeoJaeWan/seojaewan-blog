import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps, ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { CaptionButtonGroup } from './caption-button-group';

// 피그마 CaptionButtonGroup의 변형 속성 값이다(정규화한 이름).
const PLACEMENTS = ['normal', 'maximized', 'snapped'] as const;
const STATES = ['active', 'inactive'] as const;

type ParityArgs = {
  placement: (typeof PLACEMENTS)[number];
  state: (typeof STATES)[number];
  /** 동작 스토리가 쓴다 */
  showMaximize?: boolean;
  maximizeSlot?: ReactNode;
  onMinimize?: ComponentProps<typeof CaptionButtonGroup>['onMinimize'];
  onMaximize?: ComponentProps<typeof CaptionButtonGroup>['onMaximize'];
  onRestore?: ComponentProps<typeof CaptionButtonGroup>['onRestore'];
  onClose?: ComponentProps<typeof CaptionButtonGroup>['onClose'];
};

/**
 * 묶음 안 버튼의 접근성 이름이나 글자를 차례대로 돌려준다.
 * @param root 묶음 요소
 * @returns 버튼 이름 목록
 */
function buttonNames(root: HTMLElement): (string | null)[] {
  return within(root)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? button.textContent);
}

const meta = {
  title: 'Components/CaptionButtonGroup',
  args: { placement: 'normal', state: 'active' },
  argTypes: {
    placement: { control: 'inline-radio', options: PLACEMENTS },
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => {
    const {
      onMinimize: handleMinimize,
      onMaximize: handleMaximize,
      onRestore: handleRestore,
      onClose: handleClose,
    } = args;
    return (
      <CaptionButtonGroup
        placement={args.placement}
        inactive={args.state === 'inactive'}
        showMaximize={args.showMaximize}
        maximizeSlot={args.maximizeSlot}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onRestore={handleRestore}
        onClose={handleClose}
      />
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: { onMinimize: fn(), onMaximize: fn(), onClose: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('normal이면 최소화·최대화·닫기 버튼을 그린다', async () => {
      await expect(buttonNames(canvasElement)).toEqual(['최소화', '최대화', '닫기']);
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('버튼을 누르면 해당 핸들러를 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '최소화' }));
      await userEvent.click(canvas.getByRole('button', { name: '최대화' }));
      await userEvent.click(canvas.getByRole('button', { name: '닫기' }));
      await expect(args.onMinimize).toHaveBeenCalledTimes(1);
      await expect(args.onMaximize).toHaveBeenCalledTimes(1);
      await expect(args.onClose).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Snapped: Story = {
  args: { placement: 'snapped' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('snapped도 최대화 버튼을 그린다', async () => {
      await expect(
        within(canvasElement).getByRole('button', { name: '최대화' }),
      ).toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Maximized: Story = {
  // maximizeSlot을 함께 줘도 복원 버튼이 이기는지 본다.
  args: {
    placement: 'maximized',
    maximizeSlot: <button type="button">스냅</button>,
    onRestore: fn(),
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('maximized면 최대화 자리에 복원 버튼을 그리고 maximizeSlot보다 앞선다', async () => {
      await expect(canvas.getByRole('button', { name: '이전 크기로 복원' })).toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '최대화' })).not.toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '스냅' })).not.toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('복원 버튼을 누르면 onRestore를 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '이전 크기로 복원' }));
      await expect(args.onRestore).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithoutMaximize: Story = {
  args: {
    placement: 'maximized',
    showMaximize: false,
    maximizeSlot: <button type="button">스냅</button>,
  },
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step(
      'showMaximize가 false면 최대화·복원 버튼과 maximizeSlot을 그리지 않는다',
      async () => {
        await expect(buttonNames(canvasElement)).toEqual(['최소화', '닫기']);
      },
    );
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const CustomMaximize: Story = {
  render: () => {
    const slot = <button type="button">스냅</button>;
    return (
      <div>
        <div role="group" aria-label="normal">
          <CaptionButtonGroup maximizeSlot={slot} />
        </div>
        <div role="group" aria-label="snapped">
          <CaptionButtonGroup placement="snapped" maximizeSlot={slot} />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('maximizeSlot은 normal에서 기본 최대화 버튼 대신 그려진다', async () => {
      await expect(buttonNames(canvas.getByRole('group', { name: 'normal' }))).toEqual([
        '최소화',
        '스냅',
        '닫기',
      ]);
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('maximizeSlot은 snapped에서도 쓴다', async () => {
      await expect(buttonNames(canvas.getByRole('group', { name: 'snapped' }))).toEqual([
        '최소화',
        '스냅',
        '닫기',
      ]);
    });
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import emptyStateExport from '../../../figma/components/empty-state/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { EmptyState } from './empty-state';

type FigmaArgs = {
  /** 피그마 TEXT 속성 Heading */
  heading: string;
  /** 피그마 TEXT 속성 Message */
  message: string;
  /** 피그마 TEXT 속성 Code */
  code: string;
  /** 피그마 BOOLEAN 속성 Show button */
  showButton: boolean;
  /** 동작 스토리가 호출 횟수를 확인하려고 받는다 */
  onReload?: ComponentProps<typeof EmptyState>['onReload'];
};

const meta = {
  title: 'Components/EmptyState',
  // 글자는 피그마 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { heading: '제목', message: '메시지 내용', code: '오류 코드', showButton: true },
  argTypes: {
    heading: { control: 'text' },
    message: { control: 'text' },
    code: { control: 'text' },
    showButton: { control: 'boolean' },
  },
  // EmptyState는 너비를 갖지 않고 쓰는 곳이 정한다. FigmaFrame이 피그마 원본의 미리보기 너비로 감싼다.
  decorators: [figmaFrame(emptyStateExport)],
  render: (args) => {
    const { onReload: handleReload } = args;
    return (
      <EmptyState
        heading={args.heading}
        message={args.message}
        code={args.code}
        showButton={args.showButton}
        onReload={handleReload}
      />
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형이 하나(default)라 기본 args가 그 변형이다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: { heading: '페이지를 찾을 수 없다', onReload: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('제목을 heading으로 그린다', async () => {
      await expect(
        canvas.getByRole('heading', { name: '페이지를 찾을 수 없다' }),
      ).toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('새로고침 버튼을 누르면 onReload를 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '새로고침' }));
      await expect(args.onReload).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithoutButton: Story = {
  args: { showButton: false },
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('showButton=false면 버튼을 그리지 않는다', async () => {
      await expect(within(canvasElement).queryByRole('button')).not.toBeInTheDocument();
    });
  },
};

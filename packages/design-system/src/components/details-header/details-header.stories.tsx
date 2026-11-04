import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { DetailsHeader } from './details-header';

// 피그마 DetailsHeader의 변형 속성 값이다(정규화한 이름).
const VIEWS = ['default', 'recycle-bin'] as const;

type FigmaArgs = {
  view: (typeof VIEWS)[number];
  /** 피그마 BOOLEAN 속성 Has location */
  hasLocation: boolean;
  /** 동작 스토리가 열 제목을 누른 결과를 확인하려고 받는다 */
  onSort?: ComponentProps<typeof DetailsHeader>['onSort'];
};

/**
 * 열 제목 버튼의 글자를 차례대로 돌려준다.
 * @param root 열 제목 줄
 * @returns 열 제목 목록
 */
function columnTitles(root: HTMLElement): (string | null)[] {
  return within(root)
    .getAllByRole('button')
    .map((button) => button.textContent);
}

const meta = {
  title: 'Components/DetailsHeader',
  args: { view: 'default', hasLocation: false },
  argTypes: {
    view: { control: 'inline-radio', options: VIEWS },
    hasLocation: { control: 'boolean' },
  },
  render: (args) => {
    const { onSort: handleSort } = args;
    return <DetailsHeader view={args.view} hasLocation={args.hasLocation} onSort={handleSort} />;
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: { onSort: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('기본은 이름·수정한 날짜·유형 열이고 위치 열은 없다', async () => {
      await expect(columnTitles(canvasElement)).toEqual(['이름', '수정한 날짜', '유형']);
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('정렬 기준 열만 정렬 방향을 갖고 기본은 이름 열이다', async () => {
      await expect(canvas.getByRole('button', { name: '이름' })).toHaveAttribute(
        'data-sort',
        'ascending',
      );
      await expect(canvas.getByRole('button', { name: '수정한 날짜' })).toHaveAttribute(
        'data-sort',
        'none',
      );
      await expect(canvas.getByRole('button', { name: '유형' })).toHaveAttribute(
        'data-sort',
        'none',
      );
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('열 제목을 누르면 onSort로 그 열을 알린다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '유형' }));
      await expect(args.onSort).toHaveBeenCalledWith('type');
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithLocation: Story = {
  args: { hasLocation: true },
  play: async ({ canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('hasLocation이면 위치 열을 더한다', async () => {
      await expect(within(canvasElement).getByRole('button', { name: '위치' })).toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const RecycleBin: Story = {
  // 휴지통 보기는 hasLocation을 따르지 않는다.
  args: { view: 'recycle-bin', hasLocation: true, onSort: fn() },
  play: async ({ args, canvasElement, step }) => {
    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step(
      '휴지통 보기는 이름·원래 위치·삭제한 날짜 열이고 hasLocation을 따르지 않는다',
      async () => {
        await expect(columnTitles(canvasElement)).toEqual(['이름', '원래 위치', '삭제한 날짜']);
      },
    );

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('열 제목을 누르면 그 열을 알린다', async () => {
      await userEvent.click(within(canvasElement).getByRole('button', { name: '삭제한 날짜' }));
      await expect(args.onSort).toHaveBeenCalledWith('deletedDate');
    });
  },
};

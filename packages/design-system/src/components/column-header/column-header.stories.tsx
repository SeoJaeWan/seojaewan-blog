import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { ColumnHeader } from './column-header';

// 피그마 ColumnHeader의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover'] as const;
const SORTS = ['none', 'ascending', 'descending'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  sort: (typeof SORTS)[number];
  /** 동작 스토리가 쓴다. 주지 않으면 피그마 기본 글자다 */
  label?: string;
};

const meta = {
  title: 'Components/ColumnHeader',
  args: { state: 'rest', sort: 'none' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    sort: { control: 'inline-radio', options: SORTS },
  },
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 188로 감싼다.
  render: (args) => (
    <ColumnHeader
      label={args.label}
      sort={args.sort}
      className="w-size-details-header-wide-width"
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:상태]]
    await step('기본 글자는 열 이름이고 정렬 방향이 없다', async () => {
      await expect(within(canvasElement).getByRole('button', { name: '열 이름' })).toHaveAttribute(
        'data-sort',
        'none',
      );
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
export const Ascending: Story = {
  args: { sort: 'ascending', label: '이름' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:상태]]
    await step('label로 글자를 바꾸고 ascending 정렬 방향을 알린다', async () => {
      await expect(within(canvasElement).getByRole('button', { name: '이름' })).toHaveAttribute(
        'data-sort',
        'ascending',
      );
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
export const Descending: Story = {
  args: { sort: 'descending' },
  play: async ({ canvasElement, step }) => {
    // @codocs [[컴포넌트 목록:상태]]
    await step('descending 정렬 방향을 알린다', async () => {
      await expect(within(canvasElement).getByRole('button', { name: '열 이름' })).toHaveAttribute(
        'data-sort',
        'descending',
      );
    });
  },
};

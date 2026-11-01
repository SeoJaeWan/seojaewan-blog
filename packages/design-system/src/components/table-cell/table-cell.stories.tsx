import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { TableCell } from './table-cell';

const meta = {
  title: 'Components/TableCell',
  component: TableCell,
  argTypes: {
    type: { control: 'inline-radio', options: ['body', 'header'] },
  },
  args: { type: 'body' },
  // 가운데 배치는 칸 위치를 반 픽셀로 만들어 선이 흐려지므로 위쪽 왼쪽에 둔다.
  parameters: { layout: 'padded' },
  // 너비는 표와 쓰는 곳이 정하므로, 피그마 원본 너비 240으로 감싼다. 칸은 표 안에서만 쓸 수 있어 표 구조로 감싸고,
  // 캡처 대상은 칸이다. Content는 피그마 기본 글자("칸 내용")를 넣는다.
  render: (args) => (
    <table className="w-size-table-cell-width table-fixed border-spacing-border-spacing-none">
      <tbody>
        <tr>
          <TableCell {...args} data-parity-target>
            칸 내용
          </TableCell>
        </tr>
      </tbody>
    </table>
  ),
} satisfies Meta<typeof TableCell>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형은 args로 고른다(`Type=Body` → `type: 'body'`).
export const Figma: Story = {};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 본문 칸은 td로 그리고 서식이 섞인 내용을 children으로 받는다 */
export const Body: Story = {
  render: () => (
    <table>
      <tbody>
        <tr>
          <TableCell>
            <strong>굵게</strong> 글
          </TableCell>
        </tr>
      </tbody>
    </table>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('본문 칸은 cell이고 서식이 섞인 내용을 받는다', async () => {
      const cell = canvas.getByRole('cell');
      await expect(within(cell).getByText('굵게').tagName).toBe('STRONG');
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 머리 칸은 th로 그리고 열 머리 범위를 scope로 받는다 */
export const Header: Story = {
  render: () => (
    <table>
      <tbody>
        <tr>
          <TableCell type="header" scope="col">
            제목
          </TableCell>
        </tr>
      </tbody>
    </table>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('머리 칸은 columnheader이고 scope를 갖는다', async () => {
      await expect(canvas.getByRole('columnheader', { name: '제목' })).toHaveAttribute(
        'scope',
        'col',
      );
    });
  },
};

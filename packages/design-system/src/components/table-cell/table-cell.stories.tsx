import type { Meta, StoryObj } from '@storybook/react-vite';

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
    <table className="w-240 table-fixed border-spacing-0">
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
export const Parity: Story = {};

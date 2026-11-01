import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Taskbar } from './taskbar';

const meta = {
  title: 'Components/Taskbar',
  // 미리보기 너비(1280)에 기본 여백을 두면 오른쪽 끝이 화면 밖으로 잘린다.
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** center와 right 자리에 넣은 내용을 그린다 */
export const Default: Story = {
  render: () => (
    <div className="w-size-taskbar-width">
      <Taskbar
        center={<button type="button">시작</button>}
        right={<button type="button">시계</button>}
      />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('center와 right 자리에 넣은 내용을 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '시작' })).toBeInTheDocument();
      await expect(canvas.getByRole('button', { name: '시계' })).toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 슬롯을 채우지 않으면 안쪽 부품을 그리지 않는다 */
export const Empty: Story = {
  render: () => (
    <div className="w-size-taskbar-width">
      <Taskbar />
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('안쪽 부품을 그리지 않는다', async () => {
      await expect(canvas.queryByRole('button')).toBeNull();
      await expect(canvas.queryByRole('searchbox')).toBeNull();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 조립이 쓰지 않는 변형(Material=Solid)도 그린다 */
export const Solid: Story = {
  render: () => (
    <div className="w-size-taskbar-width">
      <Taskbar
        material="solid"
        center={<button type="button">시작</button>}
        right={<button type="button">시계</button>}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '시작' })).toBeInTheDocument();
  },
};

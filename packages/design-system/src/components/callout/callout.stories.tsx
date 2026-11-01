import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Asset } from '../asset/asset';
import { Callout } from './callout';

const meta = {
  title: 'Components/Callout',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 아이콘과 글을 슬롯(children)에 채운다 */
export const Default: Story = {
  render: () => (
    <div className="w-size-post-width">
      <Callout icon={<Asset name="icons/ic_fluent_info_24_regular.svg" className="size-full" />}>
        <p>콜아웃 글</p>
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('콜아웃 글')).toBeInTheDocument();
  },
};

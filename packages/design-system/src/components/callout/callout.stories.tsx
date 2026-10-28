import type { Meta, StoryObj } from '@storybook/react-vite';

import { Asset } from '../asset/asset';
import { Callout } from './callout';

const meta = {
  title: 'Components/Callout',
  // 아이콘은 글마다 달라 필수 prop이므로, Parity 스토리가 피그마 기본 인스턴스(info)를 넣는다.
  // 너비는 쓰는 곳이 정하므로 피그마 원본 너비 720으로 감싼다.
  // Content 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 높이 100만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <div className="w-720">
      <Callout icon={<Asset name="icons/ic_fluent_info_24_regular.svg" className="size-full" />}>
        <div style={{ height: 100 }} />
      </Callout>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나를 그린다.
export const Parity: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { BrowserToolbar } from './browser-toolbar';

const meta = {
  title: 'Components/BrowserToolbar',
  // 피그마 BrowserToolbar는 변형이 없다.
  // 컴포넌트는 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비 1000으로 감싼다.
  // 캡처 대상은 감싼 요소(#storybook-root의 첫 요소)다. 컴포넌트와 같은 크기라 찍히는 범위가 같다.
  render: () => (
    <div className="w-1000">
      <BrowserToolbar />
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 고른다. 변형이 없는 컴포넌트라 args가 없다.
export const Parity: Story = {};

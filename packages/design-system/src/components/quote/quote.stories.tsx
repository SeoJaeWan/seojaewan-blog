import type { Meta, StoryObj } from '@storybook/react-vite';

import { Quote } from './quote';

const meta = {
  title: 'Components/Quote',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Content` 슬롯 기본 내용(글 본문 글자)을 넣은 모습이다. 너비는 쓰는 곳이 정하므로 글 폭 토큰으로 준다.
export const Figma: Story = {
  render: () => (
    <Quote className="w-size-post-width">
      <p className="type-body-large text-text-fill-primary">
        인용 블록의 글이다. 출처나 강조할 문장을 담는다.
      </p>
    </Quote>
  ),
};

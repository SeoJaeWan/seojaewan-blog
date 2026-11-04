import type { Meta, StoryObj } from '@storybook/react-vite';

import quoteExport from '../../../figma/components/quote/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Quote } from './quote';

const meta = {
  title: 'Components/Quote',
  decorators: [figmaFrame(quoteExport)],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Content` 슬롯 기본 내용(글 본문 글자)을 넣은 모습이다. 글자 스타일은 Quote가 정한다.
// 너비는 쓰는 곳이 정하므로 FigmaFrame이 export.json 견본 너비(@sample-size width)로 감싼다.
export const Figma: Story = {
  render: () => (
    <Quote>
      <p>인용 블록의 글이다. 출처나 강조할 문장을 담는다.</p>
    </Quote>
  ),
};

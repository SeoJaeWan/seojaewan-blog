import type { Meta, StoryObj } from '@storybook/react-vite';

import calloutExport from '../../../figma/components/callout/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Asset } from '../asset/asset';
import { Callout } from './callout';

const meta = {
  title: 'Components/Callout',
  decorators: [figmaFrame(calloutExport)],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Icon` 기본 인스턴스와 `Content` 슬롯 기본 내용(글 본문 글자)을 넣은 모습이다. 글자 스타일은 Callout이 정한다.
// 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 너비(size/post/width)로 감싼다.
export const Figma: Story = {
  render: () => (
    <Callout icon={<Asset name="icons/ic_fluent_info_24_regular.svg" />}>
      <p>
        콜아웃은 아이콘과 함께 눈에 띄게 보여 줄 글을 담는다. <strong>글자 서식</strong>도 쓸 수
        있다.
      </p>
    </Callout>
  ),
};

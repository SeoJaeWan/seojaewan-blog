import type { Meta, StoryObj } from '@storybook/react-vite';

import { Asset } from '../asset/asset';
import { Callout } from './callout';

const meta = {
  title: 'Components/Callout',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Icon` 기본 인스턴스와 `Content` 슬롯 기본 내용(글 본문 글자)을 넣은 모습이다.
// 너비는 쓰는 곳이 정하므로 글 폭 토큰으로 준다.
export const Figma: Story = {
  render: () => (
    <Callout
      className="w-size-post-width"
      icon={<Asset name="icons/ic_fluent_info_24_regular.svg" className="size-full" />}
    >
      <p className="type-body-large text-text-fill-primary">
        콜아웃은 아이콘과 함께 눈에 띄게 보여 줄 글을 담는다.{' '}
        <strong className="type-body-large-strong">글자 서식</strong>도 쓸 수 있다.
      </p>
    </Callout>
  ),
};

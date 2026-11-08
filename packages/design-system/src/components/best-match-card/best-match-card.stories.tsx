import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { ImageAsset } from '../image-asset/image-asset';
import { MenuItem } from '../menu-item/menu-item';
import { BestMatchCard } from './best-match-card';

const meta = {
  title: 'Components/BestMatchCard',
  // 제목·부가 정보는 피그마 TEXT 속성의 기본값이라 넘기지 않는다. 아이콘은 피그마 Icon의 기본 인스턴스다.
  render: () => (
    <BestMatchCard icon={<ImageAsset name="images/file-document" />}>
      <MenuItem isStandalone label="열기" icon="icons/ic_fluent_open_20_regular.svg" />
      <MenuItem isStandalone label="링크 복사" icon="icons/ic_fluent_link_20_regular.svg" />
    </BestMatchCard>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트다. `Actions` 슬롯에 피그마 기본 내용과 같은 MenuItem 둘을 넣는다.
export const Figma: Story = {};

// @codocs [[검색:결과 화면]]
/** 긴 제목과 부가 정보는 한 줄로 두고 끝을 말줄임한다 */
export const LongText: Story = {
  render: () => (
    <BestMatchCard
      icon={<ImageAsset name="images/file-document" />}
      title="리액트 서버 컴포넌트와 클라이언트 컴포넌트를 함께 쓰는 방법 정리"
      meta="바탕 화면\Blog\JavaScript\React\서버 컴포넌트\정리"
    />
  ),
  play: async ({ canvas, step }) => {
    const title = canvas.getByText(/^리액트 서버 컴포넌트와/u);
    const meta = canvas.getByText(/^바탕 화면/u);

    await step('제목과 부가 정보는 한 줄 높이다', async () => {
      await expect(title.scrollHeight).toBe(title.clientHeight);
      await expect(meta.scrollHeight).toBe(meta.clientHeight);
    });

    await step('넘치는 글자는 카드 안에서 자른다', async () => {
      await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
      await expect(meta.scrollWidth).toBeGreaterThan(meta.clientWidth);
    });
  },
};

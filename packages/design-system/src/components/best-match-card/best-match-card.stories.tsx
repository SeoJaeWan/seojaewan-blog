import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BestMatchCard } from './best-match-card';

// 문서 아이콘 이미지 자산이다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const documentIcon = new URL('../../assets/images/file-document.webp', import.meta.url).href;

const meta = {
  title: 'Components/BestMatchCard',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const WithAction: Story = {
  render: () => (
    <BestMatchCard
      icon={<img src={documentIcon} alt="" className="size-full object-contain" />}
      title="글"
      meta="블로그"
    >
      <button type="button">열기</button>
    </BestMatchCard>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('제목과 부가 정보를 바꾸고 구분선을 그린다', async () => {
      await expect(canvas.getByText('글')).toBeInTheDocument();
      await expect(canvas.getByText('블로그')).toBeInTheDocument();
      await expect(canvas.getByRole('separator')).toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('Actions 슬롯에 넣은 버튼을 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '열기' })).toBeInTheDocument();
    });
  },
};

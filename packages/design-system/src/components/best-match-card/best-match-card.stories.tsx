import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { BestMatchCard } from './best-match-card';

// 문서 아이콘 이미지 자산이다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const documentIcon = new URL('../../assets/images/file-document.webp', import.meta.url).href;

const meta = {
  title: 'Components/BestMatchCard',
  // 가운데 정렬은 카드 높이가 홀수일 때 위치가 0.5px로 떨어져 캡처가 1px 밀리므로, 위쪽 왼쪽에 붙여 정수 위치에 둔다.
  parameters: { layout: 'padded' },
  // 아이콘은 쓰는 곳마다 달라 필수 prop이므로, Parity 스토리가 피그마 기본 인스턴스(file/Document)를 넣는다.
  // Actions 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 크기 100×100만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <BestMatchCard icon={<img src={documentIcon} alt="" className="size-full object-contain" />}>
      <div style={{ width: 100, height: 100 }} />
    </BestMatchCard>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트라 args 없이 하나를 그린다.
export const Parity: Story = {};

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

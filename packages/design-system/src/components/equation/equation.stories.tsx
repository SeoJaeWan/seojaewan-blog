import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '../image-asset/image-asset';
import { Equation } from './equation';

const meta = {
  title: 'Components/Equation',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Formula` 슬롯 기본 내용(수식 자산 인스턴스)을 같은 크기 변수(size/equation/*)로 넣은 모습이다.
// 제품은 서버가 KaTeX로 그린 HTML을 같은 슬롯에 넣는다([[기술 스택:글 본문 처리]]).
export const Figma: Story = {
  render: () => (
    <div className="w-size-post-width">
      <Equation>
        <ImageAsset
          name="images/equation-quadratic-formula"
          alt="근의 공식"
          className="h-size-equation-height w-size-equation-width"
        />
      </Equation>
    </div>
  ),
};

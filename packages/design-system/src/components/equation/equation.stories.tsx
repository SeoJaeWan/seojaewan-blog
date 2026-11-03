import type { Meta, StoryObj } from '@storybook/react-vite';

import equationExport from '../../../figma/components/equation/export.json';
import { FigmaFrame, figmaFrame } from '../../story/figma-frame';
import { ImageAsset } from '../image-asset/image-asset';
import { Equation } from './equation';

const meta = {
  title: 'Components/Equation',
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 너비(글 폭)로 감싼다.
  decorators: [figmaFrame(equationExport)],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 `Formula` 슬롯 기본 내용(수식 자산 인스턴스)을 같은 크기(size/equation/*)로 넣은 모습이다.
// 제품은 서버가 KaTeX로 그린 HTML을 같은 슬롯에 넣는다([[기술 스택:글 본문 처리]]).
export const Figma: Story = {
  render: () => (
    <Equation>
      <FigmaFrame source={equationExport} node="Formula/formula">
        <ImageAsset name="images/equation-quadratic-formula" alt="근의 공식" />
      </FigmaFrame>
    </Equation>
  ),
};

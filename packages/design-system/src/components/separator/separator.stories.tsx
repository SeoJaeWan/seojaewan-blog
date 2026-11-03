import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import separatorExport from '../../../figma/components/separator/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Separator } from './separator';

// 피그마 Separator의 변형 속성 값이다(정규화한 이름).
const ORIENTATIONS = ['horizontal', 'vertical'] as const;

type FigmaArgs = {
  orientation: (typeof ORIENTATIONS)[number];
};

const meta = {
  title: 'Components/Separator',
  // 1px 선이 가운데 정렬에서 반 픽셀 위치에 놓여 번지지 않도록 위쪽부터 놓는다.
  parameters: { layout: 'padded' },
  args: { orientation: 'horizontal' },
  argTypes: {
    orientation: { control: 'inline-radio', options: ORIENTATIONS },
  },
  // 가로선의 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 너비(size/240)로 감싼다.
  decorators: [figmaFrame(separatorExport)],
  render: (args) => <Separator orientation={args.orientation} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 기본은 가로선이다 */
export const Default: Story = {
  play: async ({ canvasElement, step }) => {
    await step('가로선이다', async () => {
      await expect(within(canvasElement).getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'horizontal',
      );
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** vertical은 세로선이다 */
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  play: async ({ canvasElement, step }) => {
    await step('세로선이다', async () => {
      await expect(within(canvasElement).getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'vertical',
      );
    });
  },
};

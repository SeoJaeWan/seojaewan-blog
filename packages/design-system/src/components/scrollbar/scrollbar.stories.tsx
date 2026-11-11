import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import scrollbarExport from '../../../figma/components/scrollbar/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { Scrollbar } from './scrollbar';

// 피그마 Scrollbar의 변형 속성 값이다(정규화한 이름). State를 state arg로 넘기면 render가 isExpanded로 바꿔 Scrollbar에 준다.
const STATES = ['rest', 'expanded'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  material: (typeof MATERIALS)[number];
  /** 동작 스토리가 쓴다. 쓰는 곳이 정한 막대 위치다 */
  thumbOffset?: number;
  /** 동작 스토리가 쓴다. 쓰는 곳이 정한 막대 길이다 */
  thumbLength?: number;
};

const meta = {
  title: 'Components/Scrollbar',
  args: { state: 'rest', material: 'acrylic' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 길이는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 길이(size/200)로 감싼다.
  decorators: [figmaFrame(scrollbarExport)],
  render: (args) => (
    <Scrollbar
      isExpanded={args.state === 'expanded'}
      material={args.material}
      thumbOffset={args.thumbOffset}
      thumbLength={args.thumbLength}
    />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 막대의 위치와 길이를 쓰는 곳이 정한 값으로 둔다 */
export const ThumbPosition: Story = {
  args: { thumbOffset: 12, thumbLength: 30 },
  play: async ({ canvasElement }) => {
    const thumb = canvasElement
      .querySelector<HTMLElement>('[data-state]')
      ?.querySelector<HTMLElement>(':scope > div');

    await expect(thumb?.offsetTop).toBe(12);
    await expect(thumb?.offsetHeight).toBe(30);
  },
};

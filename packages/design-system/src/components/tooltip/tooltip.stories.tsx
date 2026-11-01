import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Tooltip } from './tooltip';

// 피그마 Tooltip의 변형 속성 값이다(정규화한 이름). Type=Balloon은 Material=Solid만 있다.
const TYPES = ['default', 'balloon'] as const;
const MATERIALS = ['acrylic', 'solid'] as const;

type ParityArgs = {
  type: (typeof TYPES)[number];
  material: (typeof MATERIALS)[number];
};

const meta = {
  title: 'Components/Tooltip',
  args: { type: 'default', material: 'acrylic' },
  argTypes: {
    type: { control: 'inline-radio', options: TYPES },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 글자는 피그마 Text·Message 속성의 기본값이다.
  render: (args) =>
    args.type === 'balloon' ? (
      <Tooltip type="balloon" message="메시지 내용" />
    ) : (
      <Tooltip material={args.material} text="도움말" />
    ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** 글자를 담은 tooltip 역할 요소다 */
export const Default: Story = {
  render: () => <Tooltip text="도움말" />,
  play: async ({ canvasElement, step }) => {
    await step('글자를 담은 tooltip 역할 요소다', async () => {
      await expect(within(canvasElement).getByRole('tooltip')).toHaveTextContent('도움말');
    });
  },
};

// @codocs [[컴포넌트 목록:기본 컨트롤]]
/** balloon은 메시지를 그리고 id 같은 div 속성을 넘긴다 */
export const Balloon: Story = {
  render: () => <Tooltip type="balloon" message="메시지 내용" id="tip" />,
  play: async ({ canvasElement, step }) => {
    await step('메시지를 그리고 div 속성을 넘긴다', async () => {
      const tooltip = within(canvasElement).getByRole('tooltip');
      await expect(tooltip).toHaveAttribute('id', 'tip');
      await expect(tooltip).toHaveTextContent('메시지 내용');
    });
  },
};

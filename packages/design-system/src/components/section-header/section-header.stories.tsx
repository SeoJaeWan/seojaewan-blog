import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import sectionHeaderExport from '../../../figma/components/section-header/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { SectionHeader } from './section-header';

// 피그마 SectionHeader의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'hover'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Label */
  label: string;
};

const meta = {
  title: 'Components/SectionHeader',
  // 글자는 피그마 Label 속성의 기본값이다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', label: '머리글' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    label: { control: 'text' },
  },
  // Hover 모양은 누를 수 있는 머리글만 가지므로 onClick을 넘겨 그린다.
  render: (args) => <SectionHeader label={args.label} onClick={() => undefined} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다
// ([[디자인 시스템:컴포넌트 조립 규칙]]).
export const Figma: Story = {
  decorators: [figmaFrame(sectionHeaderExport)],
};

type ClickArgs = { onClick: () => void };
type ClickStory = StoryObj<ClickArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** onClick이 없는 머리글은 누를 수 없는 글자다 */
export const Default: Story = {
  render: () => <SectionHeader label="고정됨" />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('label로 바꾼 글자를 제목 태그로 그린다', async () => {
      await expect(canvas.getByRole('heading', { name: '고정됨' })).toBeInTheDocument();
    });

    await step('onClick이 없으면 버튼이 아니다', async () => {
      await expect(canvas.queryByRole('button')).not.toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[Start 메뉴:모두]]
/** onClick이 있으면 머리글을 줄 전체 너비의 버튼으로 그리고, 누르면 부른다 */
export const Clickable: ClickStory = {
  args: { onClick: fn() },
  decorators: [figmaFrame(sectionHeaderExport)],
  render: (args) => {
    const { onClick: handleClick } = args;
    return <SectionHeader label="고정됨" onClick={handleClick} />;
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '고정됨' });

    await step('버튼이 머리글 줄 전체 너비를 채운다', async () => {
      const frame = canvasElement.querySelector<HTMLElement>('[data-figma-frame]');
      await expect(button.offsetWidth).toBe(frame?.offsetWidth);
    });

    await step('누르면 onClick을 한 번 부른다', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledOnce();
    });
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import tocItemExport from '../../../figma/components/toc-item/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { TocItem } from './toc-item';

// 피그마 TocItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const LEVELS = ['1', '2', '3'] as const;
const STATES = ['rest', 'hover'] as const;

type FigmaArgs = {
  isActive: boolean;
  level: (typeof LEVELS)[number];
  state: (typeof STATES)[number];
  /** 동작 스토리가 쓰는 값이다. 주지 않으면 피그마 기본 글자다 */
  label?: string;
};

const meta = {
  title: 'Components/TocItem',
  args: { isActive: true, level: '1', state: 'rest' },
  argTypes: {
    isActive: { control: 'boolean' },
    level: { control: 'inline-radio', options: LEVELS },
    state: { control: 'inline-radio', options: STATES },
  },
  // 너비는 쓰는 곳이 정하므로 FigmaFrame이 피그마 원본 크기로 감싼다.
  decorators: [figmaFrame(tocItemExport)],
  render: (args) => (
    <TocItem isActive={args.isActive} level={Number(args.level) as 1 | 2 | 3} label={args.label} />
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나(Active, Level, State)를 args 하나로 고른다. Hover는 캡처 도구가 마우스로 재현한다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
/** isActive가 아니면 aria-current가 없다 */
export const Default: Story = {
  args: { isActive: false },
  play: async ({ canvasElement, step }) => {
    await step('활성이 아니면 aria-current가 없다', async () => {
      const label = within(canvasElement).getByText('목차 항목');
      await expect(label.parentElement).not.toHaveAttribute('aria-current');
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
/** isActive이면 aria-current가 붙는다 */
export const Active: Story = {
  args: { label: '소개' },
  play: async ({ canvasElement, step }) => {
    await step('isActive이면 aria-current가 location이다', async () => {
      const label = within(canvasElement).getByText('소개');
      await expect(label.parentElement).toHaveAttribute('aria-current', 'location');
    });
  },
};

// @codocs [[Chrome:글 화면]]
/** 긴 제목은 항목 너비(쓰는 곳이 정함, 여기서는 피그마 원본 너비) 안에서 끝을 줄인다 */
export const LongLabel: Story = {
  args: { label: '아주 긴 목차 제목은 목차 너비를 넘지 않고 끝이 말줄임표로 줄어든다' },
  play: async ({ canvasElement, step }) => {
    await step('글자가 넘쳐도 항목 너비를 넘지 않는다', async () => {
      const label = within(canvasElement).getByText(/아주 긴 목차 제목/u);
      const item = label.parentElement;
      await expect(label.scrollWidth).toBeGreaterThan(label.clientWidth);
      await expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(
        item?.getBoundingClientRect().right ?? 0,
      );
      await expect(getComputedStyle(label).textOverflow).toBe('ellipsis');
    });
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SystemTray } from './system-tray';

// 피그마 SystemTray의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/SystemTray',
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: () => <SystemTray />,
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover는 캡처 도구가 마우스로 재현한다.
export const Parity: Story = {};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** time과 date를 위아래 두 줄로 그린다 */
export const Default: Story = {
  render: () => <SystemTray time="오후 3:20" date="2026-10-24" />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('time과 date를 그린다', async () => {
      await expect(canvas.getByText('오후 3:20')).toBeInTheDocument();
      await expect(canvas.getByText('2026-10-24')).toBeInTheDocument();
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** 값을 주지 않으면 자리를 설명하는 기본 문구를 그린다 */
export const Placeholder: Story = {
  render: () => <SystemTray />,
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('기본 문구를 그린다', async () => {
      await expect(canvas.getByText('시간')).toBeInTheDocument();
      await expect(canvas.getByText('날짜')).toBeInTheDocument();
    });
  },
};

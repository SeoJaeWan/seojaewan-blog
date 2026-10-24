import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';

// 피그마 Button의 변형 속성 값이다(정규화한 이름).
const STYLES = ['accent', 'standard', 'subtle'] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled', 'focused'] as const;

type ParityArgs = {
  style: (typeof STYLES)[number];
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Label */
  label: string;
  /** 피그마 BOOLEAN 속성 Show icon */
  showIcon: boolean;
};

const meta = {
  title: 'Components/Button',
  // 글자는 피그마 Label 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { style: 'accent', state: 'rest', label: '버튼', showIcon: false },
  argTypes: {
    style: { control: 'inline-radio', options: STYLES },
    state: { control: 'inline-radio', options: STATES },
    label: { control: 'text' },
    showIcon: { control: 'boolean' },
  },
  render: (args) => (
    <Button
      variant={args.style}
      label={args.label}
      disabled={args.state === 'disabled'}
      showIcon={args.showIcon}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 캡처 도구가 마우스·키보드로 재현한다.
export const Parity: Story = {};

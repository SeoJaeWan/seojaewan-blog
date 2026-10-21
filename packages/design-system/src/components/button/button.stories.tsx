import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';

// 피그마 Button의 변형 속성 값이다(정규화한 이름).
const STYLES = ['accent', 'standard', 'subtle'] as const;
const STATES = ['rest', 'hover', 'pressed', 'disabled', 'focused'] as const;

type ParityArgs = {
  style: (typeof STYLES)[number];
  state: (typeof STATES)[number];
  /** 피그마 BOOLEAN 속성 Show icon */
  showIcon: boolean;
};

const meta = {
  title: 'Components/Button',
  args: { style: 'accent', state: 'rest', showIcon: false },
  argTypes: {
    style: { control: 'inline-radio', options: STYLES },
    state: { control: 'inline-radio', options: STATES },
    showIcon: { control: 'boolean' },
  },
  render: (args) => (
    // 글자는 피그마 예시 글자와 같아야 한다([[피그마 일치 검사:글자]]).
    <Button variant={args.style} disabled={args.state === 'disabled'} showIcon={args.showIcon}>
      버튼
    </Button>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 일치 검사:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed·Focused는 비교 스크립트가 마우스·키보드로 재현한다.
export const Parity: Story = {};

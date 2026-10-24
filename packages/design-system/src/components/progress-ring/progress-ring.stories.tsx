import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, type ReactNode, useLayoutEffect } from 'react';

import { ProgressRing } from './progress-ring';

// 피그마 ProgressRing의 변형 속성 값이다(정규화한 이름).
const TONES = ['accent', 'on-dark'] as const;
const SIZES = ['16', '32', '64'] as const;

type ParityArgs = {
  tone: (typeof TONES)[number];
  size: (typeof SIZES)[number];
};

/**
 * on-dark 링은 흰 호라 기본(흰) 화면 위에서는 피그마 그림과 코드 그림이 모두 보이지 않는다.
 * 캡처 도구가 화면(body)의 배경색을 읽어 두 그림을 같은 색 위에 놓으므로, 쓰는 곳인 재부팅 화면의 바탕색을 화면에 깐다.
 * @param props
 * @param props.tone 피그마 Tone
 * @param props.children 그릴 링
 * @returns 링
 */
function Backdrop(props: { tone: ParityArgs['tone']; children: ReactNode }): JSX.Element {
  const { tone, children } = props;
  useLayoutEffect(() => {
    if (tone !== 'on-dark') {
      return undefined;
    }
    document.body.style.backgroundColor = 'var(--boot-screen-background)';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [tone]);
  return <>{children}</>;
}

const meta = {
  title: 'Components/ProgressRing',
  args: { tone: 'accent', size: '16' },
  argTypes: {
    tone: { control: 'inline-radio', options: TONES },
    size: { control: 'inline-radio', options: SIZES },
  },
  render: (args) => (
    <Backdrop tone={args.tone}>
      <ProgressRing tone={args.tone} size={args.size} aria-label="불러오는 중" />
    </Backdrop>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

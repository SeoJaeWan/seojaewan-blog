import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, type ReactNode, useLayoutEffect } from 'react';

import { FileItem } from './file-item';

// 피그마 FileItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const SURFACES = ['desktop', 'explorer'] as const;
const VIEWS = ['large', 'medium', 'small'] as const;
const STATES = [
  'rest',
  'hover',
  'selected',
  'selected-focus',
  'rename',
  'cut',
  'cut-selected',
] as const;

type ParityArgs = {
  surface: (typeof SURFACES)[number];
  view: (typeof VIEWS)[number];
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Name */
  name: string;
};

/**
 * 바탕화면 항목은 흰 글자라 기본(흰) 화면 위에서는 피그마 그림과 코드 그림이 모두 보이지 않는다.
 * 캡처 도구가 화면(body)의 배경색을 읽어 두 그림을 같은 색 위에 놓으므로, 어두운 바탕을 화면에 깐다.
 * @param props
 * @param props.surface 피그마 Surface
 * @param props.children 그릴 항목
 * @returns 항목
 */
function Backdrop(props: { surface: ParityArgs['surface']; children: ReactNode }): JSX.Element {
  const { surface, children } = props;
  useLayoutEffect(() => {
    if (surface !== 'desktop') {
      return undefined;
    }
    document.body.style.backgroundColor = 'var(--boot-screen-background)';
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [surface]);
  return <>{children}</>;
}

const meta = {
  title: 'Components/FileItem',
  // 글자는 피그마 Name 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { surface: 'desktop', view: 'large', state: 'rest', name: '파일 이름' },
  argTypes: {
    surface: { control: 'inline-radio', options: SURFACES },
    view: { control: 'inline-radio', options: VIEWS },
    state: { control: 'select', options: STATES },
    name: { control: 'text' },
  },
  render: (args) => (
    <Backdrop surface={args.surface}>
      <FileItem
        surface={args.surface}
        view={args.view}
        // 피그마의 Rename 변형은 이름 바꾸기 상자가 Name 속성과 이어져 있지 않아 기본 글자(이름)를 보인다.
        name={args.state === 'rename' ? '이름' : args.name}
        selected={['selected', 'selected-focus', 'cut-selected'].includes(args.state)}
        focused={args.state === 'selected-focus'}
        cut={args.state === 'cut' || args.state === 'cut-selected'}
        renaming={args.state === 'rename'}
      />
    </Backdrop>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

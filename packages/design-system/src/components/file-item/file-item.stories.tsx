import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, type ReactNode, useLayoutEffect } from 'react';

import { FileItem } from './file-item';

// 피그마 FileItem 기본 인스턴스(폴더 이미지)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 FileItem의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로, Focused는 Tab 키로 재현한다.
const SURFACES = ['desktop', 'explorer'] as const;
const VIEWS = ['large', 'medium', 'small'] as const;
const STATES = ['rest', 'hover', 'selected', 'focused', 'rename', 'cut', 'cut-selected'] as const;

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
      {/* Focused는 캡처 도구가 Tab으로 포커스를 옮기므로 항목이 포커스를 받을 수 있게 한다. 선은 :focus-visible로 그린다. */}
      <FileItem
        tabIndex={0}
        surface={args.surface}
        view={args.view}
        name={args.name}
        icon={<img src={folderIcon} alt="" className="size-full object-contain" />}
        selected={args.state === 'selected' || args.state === 'cut-selected'}
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

import type { Meta, StoryObj } from '@storybook/react-vite';

import { WindowFrame } from './window-frame';

// 피그마 WindowFrame의 변형 속성 값이다(정규화한 이름).
const TITLE_BARS = ['default', 'custom'] as const;
const STATES = ['active', 'inactive'] as const;
const PLACEMENTS = ['normal', 'maximized', 'snapped'] as const;
const MATERIALS = ['mica', 'solid', 'chrome'] as const;

type ParityArgs = {
  titleBar: (typeof TITLE_BARS)[number];
  state: (typeof STATES)[number];
  placement: (typeof PLACEMENTS)[number];
  material: (typeof MATERIALS)[number];
};

// 피그마 App icon 속성의 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.png', import.meta.url).href;

const meta = {
  title: 'Components/WindowFrame',
  args: { titleBar: 'default', state: 'active', placement: 'normal', material: 'mica' },
  argTypes: {
    titleBar: { control: 'inline-radio', options: TITLE_BARS },
    state: { control: 'inline-radio', options: STATES },
    placement: { control: 'inline-radio', options: PLACEMENTS },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기 800x500을 준다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
  // 컴포넌트의 Content·Title bar content 슬롯은 언제나 비어 있다.
  render: (args) => {
    const common = {
      inactive: args.state === 'inactive',
      placement: args.placement,
      material: args.material,
      className: 'h-500 w-800',
    };
    return args.titleBar === 'custom' ? (
      <WindowFrame {...common} titleBar="custom" />
    ) : (
      <WindowFrame
        {...common}
        appIcon={<img src={appIcon} alt="" className="size-full object-contain" />}
      />
    );
  },
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

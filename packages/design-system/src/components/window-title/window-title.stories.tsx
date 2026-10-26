import type { Meta, StoryObj } from '@storybook/react-vite';

import { WindowTitle } from './window-title';

// 피그마 WindowTitle의 변형 속성 값이다(정규화한 이름).
const KINDS = ['window', 'preview'] as const;
const STATES = ['active', 'inactive'] as const;

type ParityArgs = {
  kind: (typeof KINDS)[number];
  state: (typeof STATES)[number];
};

// 피그마 App icon 속성의 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

const meta = {
  title: 'Components/WindowTitle',
  args: { kind: 'window', state: 'active' },
  argTypes: {
    kind: { control: 'inline-radio', options: KINDS },
    state: { control: 'inline-radio', options: STATES },
  },
  // 부모가 너비를 정하는 컴포넌트라 피그마 원본 너비 660으로 감싼다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
  render: (args) => (
    <div className="w-660">
      <WindowTitle
        kind={args.kind}
        inactive={args.state === 'inactive'}
        appIcon={<img src={appIcon} alt="" className="size-icon-16 object-contain" />}
      />
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

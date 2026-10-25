import type { Meta, StoryObj } from '@storybook/react-vite';

import { WindowPreview } from './window-preview';

// 피그마 WindowPreview의 변형 속성 값이다(정규화한 이름). Hover는 도구가 실제 마우스로 재현한다.
const STATES = ['rest', 'hover'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

// 피그마 App icon 속성의 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.png', import.meta.url).href;

const meta = {
  title: 'Components/WindowPreview',
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  // 컴포넌트의 thumbnail 슬롯은 언제나 비어 있으므로, 피그마 빈 슬롯이 차지하는 크기만 칠 없는 빈 내용으로 둔다.
  render: () => (
    <WindowPreview
      appIcon={<img src={appIcon} alt="" className="size-full object-contain" />}
      thumbnail={<div className="size-full" />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

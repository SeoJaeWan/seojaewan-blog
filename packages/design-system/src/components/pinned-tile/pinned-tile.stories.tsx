import type { Meta, StoryObj } from '@storybook/react-vite';

import { PinnedTile } from './pinned-tile';

// 앱 아이콘 이미지 자산이다. 피그마 Item icon의 기본 인스턴스를 Parity 스토리에서만 넣는다.
const appIcon = new URL('../../assets/images/app-file-explorer.png', import.meta.url).href;

// 피그마 PinnedTile의 변형 속성 값이다(정규화한 이름). Hover·Pressed는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'pressed'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Label */
  label: string;
};

const meta = {
  title: 'Components/PinnedTile',
  // 가운데 정렬은 너비 95(홀수)가 반 픽셀에 놓여 글자와 아이콘이 흐려지므로, 왼쪽 위에 붙여 정수 위치에 그린다.
  parameters: { layout: 'padded' },
  // 글자는 피그마 Label 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', label: '앱 이름' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    label: { control: 'text' },
  },
  render: (args) => (
    <PinnedTile
      label={args.label}
      icon={<img src={appIcon} alt="" className="size-full object-contain" />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Hover·Pressed는 캡처 도구가 마우스로 재현한다.
export const Parity: Story = {};

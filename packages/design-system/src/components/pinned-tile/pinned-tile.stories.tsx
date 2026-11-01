import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { PinnedTile } from './pinned-tile';

// 앱 아이콘 이미지 자산이다. 피그마 Item icon의 기본 인스턴스를 Parity 스토리에서만 넣는다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

// 피그마 PinnedTile의 변형 속성 값이다(정규화한 이름). Hover·Pressed는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'pressed'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Label */
  label: string;
  /** 동작 스토리에서 호출 횟수를 확인하는 핸들러 */
  onClick?: () => void;
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

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
/** label을 이름으로 갖는 버튼이고, icon 자리에 넘긴 아이콘을 그린다. 누르면 onClick을 부른다 */
export const Default: Story = {
  args: { onClick: fn() },
  render: ({ onClick: handleClick }) => (
    <PinnedTile label="메모장" icon={<svg aria-hidden="true" />} onClick={handleClick} />
  ),
  play: async ({ args, canvas, userEvent }) => {
    const button = canvas.getByRole('button', { name: '메모장' });
    await expect(button.querySelector('svg')).not.toBeNull();

    await userEvent.click(button);

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

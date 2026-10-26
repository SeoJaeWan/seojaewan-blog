import type { Meta, StoryObj } from '@storybook/react-vite';

import { ImageAsset } from '@seojaewan/design-system';

import { MENU_POWER } from '@/shared/menu/story-data';

import { StartBody } from './start-body';
import { StartMenuPanel } from './start-menu-panel';
import { StartPowerButton } from './start-power-button';
import {
  SEARCH_PLACEHOLDER,
  START_LETTER_GROUPS,
  START_PINNED,
  START_PROFILE_NAME,
} from './story-data';

// 피그마 Start/Menu의 변형 속성 값이다(정규화한 이름).
const DEVICES = ['desktop', 'mobile'] as const;

type ParityArgs = {
  device: (typeof DEVICES)[number];
};

// @codocs [[피그마 연동:스토리 규칙]]
// 제목은 Patterns/ + 피그마 조립 이름이다. 피그마 조립처럼 본문 자리에 간단히 보기 본문(Start/Body `View=List`)을,
// 아래 줄에 닫힌 전원 버튼(Start/PowerButton `State=Closed`)을 넣는다. 패널 크기는 ShellSurface가 정한다.
const meta = {
  title: 'Patterns/Start/Menu',
  args: { device: 'desktop' },
  argTypes: {
    device: { control: 'inline-radio', options: DEVICES },
  },
  render: (args) => (
    <StartMenuPanel
      device={args.device}
      searchBoxProps={{ 'aria-label': '검색', placeholder: SEARCH_PLACEHOLDER }}
      profileName={START_PROFILE_NAME}
      profilePhoto={<ImageAsset name="images/avatar-profile" className="size-full" />}
      powerButton={<StartPowerButton menuItems={MENU_POWER} />}
    >
      <StartBody
        view="list"
        device={args.device}
        className="min-h-px w-full flex-1"
        pinned={START_PINNED}
        groups={START_LETTER_GROUPS}
      />
    </StartMenuPanel>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Parity: Story = {};

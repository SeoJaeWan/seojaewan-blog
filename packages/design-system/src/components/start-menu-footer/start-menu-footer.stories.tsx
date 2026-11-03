import type { Meta, StoryObj } from '@storybook/react-vite';

import startMenuFooterExport from '../../../figma/components/start-menu-footer/export.json';
import { FigmaFrame, figmaFrame } from '../../story/figma-frame';
import { IconButton } from '../icon-button/icon-button';
import { ImageAsset } from '../image-asset/image-asset';
import { ProfileButton } from '../profile-button/profile-button';
import { StartMenuFooter } from './start-menu-footer';

const meta = {
  title: 'Components/StartMenuFooter',
  // 너비는 FigmaFrame이 피그마 원본 너비(Start 메뉴 아래 줄 자리의 크기 토큰)로 감싼다.
  // ProfileButton은 같은 줄의 전원 버튼(HUG) 옆에서 남는 너비를 채우므로(FILL) 그 노드 크기로 감싼다.
  decorators: [figmaFrame(startMenuFooterExport)],
  render: () => (
    <StartMenuFooter>
      <FigmaFrame source={startMenuFooterExport} node="Content/ProfileButton">
        <ProfileButton photo={<ImageAsset name="images/avatar-profile" />} name="서재완" />
      </FigmaFrame>
      <IconButton variant="subtle" label="전원" icon="icons/ic_fluent_power_20_regular.svg" />
    </StartMenuFooter>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트다. `Content` 슬롯에 피그마 기본 내용과 같은 ProfileButton과 전원 IconButton을 넣는다.
export const Figma: Story = {};

import type { Meta, StoryObj } from '@storybook/react-vite';

import { IconButton } from '../icon-button/icon-button';
import { ImageAsset } from '../image-asset/image-asset';
import { ProfileButton } from '../profile-button/profile-button';
import { StartMenuFooter } from './start-menu-footer';

const meta = {
  title: 'Components/StartMenuFooter',
  // 가운데 정렬은 높이 65(홀수)가 반 픽셀에 놓여 위아래 선이 흐려지므로, 왼쪽 위에 붙여 정수 위치에 그린다.
  parameters: { layout: 'padded' },
  // 너비는 피그마 원본 너비이자 Start 메뉴 아래 줄 자리의 크기 토큰으로 준다.
  render: () => (
    <StartMenuFooter className="w-size-start-menu-footer-width">
      <ProfileButton
        photo={<ImageAsset name="images/avatar-profile" className="size-full" />}
        name="서재완"
        className="min-w-size-hairline flex-flex-fill"
      />
      <IconButton variant="subtle" label="전원" icon="icons/ic_fluent_power_20_regular.svg" />
    </StartMenuFooter>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 변형이 없는 컴포넌트다. `Content` 슬롯에 피그마 기본 내용과 같은 ProfileButton과 전원 IconButton을 넣는다.
export const Figma: Story = {};

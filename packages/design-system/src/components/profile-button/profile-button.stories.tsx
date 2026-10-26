import type { Meta, StoryObj } from '@storybook/react-vite';

import { ProfileButton } from './profile-button';

// 피그마 ProfileButton `Photo` 기본 인스턴스(avatar/Profile)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const profilePhoto = new URL('../../assets/images/avatar-profile-placeholder.webp', import.meta.url)
  .href;

type ParityArgs = {
  /** 피그마 TEXT 속성 Name */
  name: string;
};

const meta = {
  title: 'Components/ProfileButton',
  // 컴포넌트 너비가 홀수라 가운데 정렬에서 0.5px 위치에 놓이지 않게 한다.
  parameters: { layout: 'padded' },
  // 글자는 피그마 Name 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { name: '사용자 이름' },
  argTypes: {
    name: { control: 'text' },
  },
  render: (args) => (
    <ProfileButton
      name={args.name}
      photo={<img src={profilePhoto} alt="" className="size-32 object-contain" />}
    />
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
export const Parity: Story = {};

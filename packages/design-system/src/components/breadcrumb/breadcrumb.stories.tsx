import type { Meta, StoryObj } from '@storybook/react-vite';

import { Breadcrumb } from './breadcrumb';

const folderIcon = new URL('../../assets/images/file-folder.png', import.meta.url).href;

// 피그마 Breadcrumb의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'editing'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

const meta = {
  title: 'Components/Breadcrumb',
  args: { state: 'rest' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
  },
  render: (args) => (
    // Breadcrumb은 너비를 갖지 않고 쓰는 곳이 정한다. 피그마 원본의 미리보기 너비 480으로 감싼다.
    <div className="w-480">
      <Breadcrumb
        key={args.state}
        locationIcon={<img src={folderIcon} alt="" className="size-full object-contain" />}
        editing={args.state === 'editing'}
        // 피그마 Editing 변형의 글자다.
        address={String.raw`바탕 화면\Blog\React`}
      >
        {/* 피그마 Items 슬롯의 미리보기 크기다. 칠 없는 빈 요소로 채운다 */}
        <div className="shrink-0" style={{ width: 100, height: 100 }} />
      </Breadcrumb>
    </div>
  ),
} satisfies Meta<ParityArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Parity: Story = {};

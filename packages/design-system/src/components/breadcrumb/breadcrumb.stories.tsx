import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { Breadcrumb } from './breadcrumb';

const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 Breadcrumb의 변형 속성 값이다(정규화한 이름).
const STATES = ['rest', 'editing'] as const;

type FigmaArgs = {
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
    <div className="w-size-breadcrumb-width">
      <Breadcrumb
        key={args.state}
        locationIcon={<img src={folderIcon} alt="" className="size-full object-contain" />}
        editing={args.state === 'editing'}
        // 피그마 Editing 변형의 글자다.
        address={String.raw`바탕 화면\Blog\React`}
        // 피그마 Items 슬롯은 비워 둔다. 빈 슬롯의 미리보기 크기(100×100)는 토큰이 없고, 슬롯이 보이는 Rest는
        // 빈 HUG 변형이라 조립 캡처가 확인한다.
      />
    </div>
  ),
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

// @codocs [[컴포넌트 목록:상태]]
export const Default: Story = {
  render: () => (
    <div className="w-size-breadcrumb-width">
      <Breadcrumb locationIcon={<img src={folderIcon} alt="현재 위치" className="size-full" />}>
        <span>경로 칸</span>
      </Breadcrumb>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[컴포넌트 목록:상태]]
    await step('Rest는 위치 아이콘과 경로 칸을 그리고 주소 입력창은 그리지 않는다', async () => {
      await expect(canvas.getByRole('img', { name: '현재 위치' })).toBeInTheDocument();
      await expect(canvas.getByText('경로 칸')).toBeInTheDocument();
      await expect(canvas.queryByRole('textbox')).toBeNull();
    });
  },
};

// @codocs [[컴포넌트 목록:상태]]
export const Editing: Story = {
  render: () => (
    <div className="w-size-breadcrumb-width">
      <Breadcrumb
        locationIcon={<img src={folderIcon} alt="현재 위치" className="size-full" />}
        editing
        address="바탕 화면"
      >
        <span>경로 칸</span>
      </Breadcrumb>
    </div>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[컴포넌트 목록:상태]]
    await step('Editing은 경로 대신 주소 입력창을 그린다', async () => {
      await expect(canvas.getByRole('textbox', { name: '주소' })).toHaveValue('바탕 화면');
      await expect(canvas.queryByText('경로 칸')).toBeNull();
      await expect(canvas.queryByRole('img', { name: '현재 위치' })).toBeNull();
    });
  },
};

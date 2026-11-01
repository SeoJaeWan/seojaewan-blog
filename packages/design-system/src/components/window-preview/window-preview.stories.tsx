import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { WindowPreview } from './window-preview';

// 피그마 WindowPreview의 변형 속성 값이다(정규화한 이름). Hover는 도구가 실제 마우스로 재현한다.
const STATES = ['rest', 'hover'] as const;

type ParityArgs = {
  state: (typeof STATES)[number];
};

// 피그마 App icon 속성의 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

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

type CloseArgs = { onClose: () => void; onClick: () => void };
type CloseStory = StoryObj<CloseArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
/** 머리글에 앱 아이콘과 제목을, thumbnail 자리에 축소 화면을 그린다. 닫기 버튼은 카드의 onClick을 부르지 않는다 */
export const Default: CloseStory = {
  args: { onClose: fn(), onClick: fn() },
  render: (args) => {
    const { onClose: handleClose, onClick: handleClick } = args;
    return (
      <WindowPreview
        appIcon={<span>앱</span>}
        title="문서"
        thumbnail={<p>축소 화면</p>}
        onClose={handleClose}
        onClick={handleClick}
      />
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('appIcon과 title을 머리글에 그린다', async () => {
      await expect(canvas.getByText('앱')).toBeInTheDocument();
      await expect(canvas.getByText('문서')).toBeInTheDocument();
    });

    await step('thumbnail 자리에 받은 내용을 그린다', async () => {
      await expect(canvas.getByText('축소 화면')).toBeInTheDocument();
    });

    await step('닫기 버튼은 onClose만 부르고 카드의 onClick은 부르지 않는다', async () => {
      // 닫기 버튼은 CSS :hover·:focus-within일 때만 보인다. 합성 이벤트는 :hover를 만들지 않고, 숨은 요소는 역할 이름이 비므로 aria-label로 찾는다.
      await userEvent.click(canvas.getByLabelText('창 닫기'));
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  },
};

import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import windowPreviewExport from '../../../figma/components/window-preview/export.json';
import { figmaFrame } from '../../story/figma-frame';
import { WindowPreview } from './window-preview';

// 피그마 WindowPreview의 변형 속성 값이다(정규화한 이름). Hover는 도구가 실제 마우스로 재현한다.
const VARIANTS = ['default', 'title'] as const;
const STATES = ['rest', 'hover'] as const;

type FigmaArgs = {
  variant: (typeof VARIANTS)[number];
  state: (typeof STATES)[number];
};

// 피그마 App icon 속성의 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

const meta = {
  title: 'Components/WindowPreview',
  args: { variant: 'default', state: 'rest' },
  argTypes: {
    variant: { control: 'inline-radio', options: VARIANTS },
    state: { control: 'inline-radio', options: STATES },
  },
  // 컴포넌트의 thumbnail 슬롯은 피그마에서 언제나 비어 있어 넣지 않는다. 축소 화면 자리의 크기는 WindowPreview가 갖는다.
  render: (args) => <WindowPreview variant={args.variant} appIcon={<img src={appIcon} alt="" />} />,
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다. Title은 너비를 갖지 않고 쓰는 곳이 정하므로, FigmaFrame이 피그마 원본 크기로 감싼다.
export const Figma: Story = {
  decorators: [figmaFrame(windowPreviewExport)],
};

// @codocs [[작업 표시줄:창 미리보기]]
/** 카드 너비는 축소 화면 높이(108) × 창 비율 + 좌우 여백(8 × 2)이고, 최대 208이다 */
export const AspectRatio: Story = {
  render: () => (
    <>
      <WindowPreview
        data-testid="narrow"
        appIcon={<span>앱</span>}
        title="좁은 창"
        aspectRatio={1}
      />
      <WindowPreview data-testid="wide" appIcon={<span>앱</span>} title="넓은 창" aspectRatio={2} />
    </>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('창 비율이 1이면 108 + 16 = 124 너비다', async () => {
      await expect(canvas.getByTestId('narrow').getBoundingClientRect().width).toBe(124);
    });

    await step('넓은 창은 최대 너비 208에서 멈춘다', async () => {
      await expect(canvas.getByTestId('wide').getBoundingClientRect().width).toBe(208);
    });
  },
};

type CloseArgs = { onClose: () => void; onSelect: () => void };
type CloseStory = StoryObj<CloseArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
/** 머리글에 앱 아이콘과 제목을, thumbnail 자리에 축소 화면을 그린다. 닫기 버튼은 누르는 영역 밖의 형제라 onSelect를 부르지 않는다 */
export const Default: CloseStory = {
  args: { onClose: fn(), onSelect: fn() },
  render: (args) => {
    const { onClose: handleClose, onSelect: handleSelect } = args;
    return (
      <WindowPreview
        appIcon={<span>앱</span>}
        title="문서"
        thumbnail={<p>축소 화면</p>}
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('appIcon과 title을 머리글에 그린다', async () => {
      await expect(canvas.getByText('앱')).toBeInTheDocument();
      await expect(canvas.getByText('문서')).toBeInTheDocument();
    });

    // @codocs [[접근성:Tab]]
    await step('thumbnail 자리에 받은 내용을 그리고 보조 기술에는 숨긴다', async () => {
      await expect(canvas.getByText('축소 화면')).toBeVisible();
      await expect(canvas.getByText('축소 화면').closest('[aria-hidden]')).not.toBeNull();
    });

    // @codocs [[접근성:Tab]]
    await step('닫기 버튼은 마우스 전용이다', async () => {
      await expect(canvas.getByLabelText('창 닫기')).toHaveAttribute('tabindex', '-1');
      await expect(canvas.getByLabelText('창 닫기')).toHaveAttribute('aria-hidden', 'true');
    });

    await step('닫기 버튼은 onClose만 부르고 카드의 onSelect는 부르지 않는다', async () => {
      // 닫기 버튼은 마우스 전용이라 보조 기술에 숨겨져 역할 이름이 비므로 aria-label로 찾는다.
      await userEvent.click(canvas.getByLabelText('창 닫기'));
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(args.onSelect).not.toHaveBeenCalled();
    });

    // @codocs [[접근성:역할]]
    await step('누르는 영역만 버튼이고 닫기 버튼은 그 형제다(버튼 안에 버튼이 없다)', async () => {
      const pressArea = canvas.getByRole('button', { name: '앱 문서' });
      await expect(pressArea).toHaveAttribute('aria-keyshortcuts', 'Delete');
      await expect(pressArea).not.toContainElement(canvas.getByLabelText('창 닫기'));
      await userEvent.click(pressArea);
      await expect(args.onSelect).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** Title은 축소 화면 없이 제목 줄만 그리고, 터치로 쓰므로 닫기 버튼이 마우스를 올리지 않아도 보인다 */
export const Title: CloseStory = {
  args: { onClose: fn(), onSelect: fn() },
  render: (args) => {
    const { onClose: handleClose, onSelect: handleSelect } = args;
    return (
      <WindowPreview
        variant="title"
        appIcon={<span>앱</span>}
        title="문서"
        onClose={handleClose}
        onSelect={handleSelect}
      />
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('닫기 버튼이 늘 보인다', async () => {
      await expect(canvas.getByLabelText('창 닫기')).toBeVisible();
    });

    await step('축소 화면 자리 없이 제목 줄 하나만 그린다', async () => {
      await expect(canvas.getByRole('button', { name: '앱 문서' }).children).toHaveLength(1);
    });

    await step('닫기 버튼은 onClose만 부르고 줄의 onSelect는 부르지 않는다', async () => {
      await userEvent.click(canvas.getByLabelText('창 닫기'));
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(args.onSelect).not.toHaveBeenCalled();
    });

    // @codocs [[접근성:역할]]
    await step('누르는 영역만 버튼이고 닫기 버튼은 그 형제다(버튼 안에 버튼이 없다)', async () => {
      const pressArea = canvas.getByRole('button', { name: '앱 문서' });
      await expect(pressArea).not.toContainElement(canvas.getByLabelText('창 닫기'));
      await userEvent.click(pressArea);
      await expect(args.onSelect).toHaveBeenCalledTimes(1);
    });
  },
};

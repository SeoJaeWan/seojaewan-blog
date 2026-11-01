import type { Meta, StoryObj } from '@storybook/react-vite';
import { createPortal } from 'react-dom';
import { expect, fn, userEvent, within } from 'storybook/test';

import { WindowFrame } from './window-frame';

// 피그마 WindowFrame의 변형 속성 값이다(정규화한 이름).
const TITLE_BARS = ['default', 'custom'] as const;
const STATES = ['active', 'inactive'] as const;
const PLACEMENTS = ['normal', 'maximized', 'snapped'] as const;
const MATERIALS = ['mica', 'solid', 'chrome'] as const;

type FigmaArgs = {
  titleBar: (typeof TITLE_BARS)[number];
  state: (typeof STATES)[number];
  placement: (typeof PLACEMENTS)[number];
  material: (typeof MATERIALS)[number];
};

// 피그마 App icon 속성의 기본 인스턴스(app/File Explorer)다. 앱 아이콘 이미지 자산이다.
const appIcon = new URL('../../assets/images/app-file-explorer.webp', import.meta.url).href;

const meta = {
  title: 'Components/WindowFrame',
  args: { titleBar: 'default', state: 'active', placement: 'normal', material: 'mica' },
  argTypes: {
    titleBar: { control: 'inline-radio', options: TITLE_BARS },
    state: { control: 'inline-radio', options: STATES },
    placement: { control: 'inline-radio', options: PLACEMENTS },
    material: { control: 'inline-radio', options: MATERIALS },
  },
  // 창 크기는 쓰는 곳이 정하므로 피그마 원본 크기 800x500을 준다(@codocs [[디자인 시스템:컴포넌트 조립 규칙]]).
  // 컴포넌트의 Content·Title bar content 슬롯은 언제나 비어 있다.
  render: (args) => {
    const common = {
      inactive: args.state === 'inactive',
      placement: args.placement,
      material: args.material,
      className: 'h-size-window-height w-size-window-width',
    };
    return args.titleBar === 'custom' ? (
      <WindowFrame {...common} titleBar="custom" />
    ) : (
      <WindowFrame
        {...common}
        appIcon={<img src={appIcon} alt="" className="size-full object-contain" />}
      />
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// 피그마 변형 하나를 args 하나로 고른다.
export const Figma: Story = {};

type MaximizedArgs = { onRestore: () => void; onClose: () => void };
type MaximizedStory = StoryObj<MaximizedArgs>;
type TitleBarArgs = {
  onTitleBarDoubleClick: () => void;
  onTitleBarPointerDown: () => void;
  onMaximize: () => void;
};
type TitleBarStory = StoryObj<TitleBarArgs>;
type CustomTitleBarArgs = { onTitleBarDoubleClick: () => void };
type CustomTitleBarStory = StoryObj<CustomTitleBarArgs>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 기본 제목 표시줄은 앱 아이콘, 창 제목과 창 버튼을 그리고 children을 내용 자리에 그린다 */
export const Default: Story = {
  render: () => (
    <WindowFrame
      appIcon={<span role="img" aria-label="앱 아이콘" />}
      title="파일 탐색기"
      className="h-size-window-height w-size-window-width"
    >
      <p>내용</p>
    </WindowFrame>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('앱 아이콘, 창 제목과 창 버튼을 그린다', async () => {
      await expect(canvas.getByRole('img', { name: '앱 아이콘' })).toBeInTheDocument();
      await expect(canvas.getByText('파일 탐색기')).toBeInTheDocument();
      await expect(
        canvas.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
      ).toEqual(['최소화', '최대화', '닫기']);
    });

    await step('children을 내용 자리에 그린다', async () => {
      await expect(canvas.getByText('내용')).toBeInTheDocument();
    });

    await step('떠 있는 활성 창이다', async () => {
      const frame = canvas.getByText('내용').closest('[data-state]');
      await expect(frame).toHaveAttribute('data-state', 'active');
      await expect(frame).toHaveAttribute('data-placement', 'normal');
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** inactive면 창과 제목이 비활성 상태다 */
export const Inactive: Story = {
  // 비활성 제목의 text-fill-tertiary는 흰 바탕에서 3.31:1이다. 색 대비는 피그마 값 문제라 사람이 정할 때까지 이 규칙만 끈다
  // (임의 작업 문서의 "색 대비 위반" 항목).
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
  render: () => (
    <WindowFrame appIcon={null} inactive className="h-size-window-height w-size-window-width">
      <p>내용</p>
    </WindowFrame>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('창과 제목이 비활성 상태다', async () => {
      await expect(canvas.getByText('내용').closest('[data-state]')).toHaveAttribute(
        'data-state',
        'inactive',
      );
      await expect(canvas.getByText('창 제목').parentElement).toHaveAttribute(
        'data-state',
        'inactive',
      );
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** maximized면 복원 버튼을 그리고 창 버튼 핸들러를 넘긴다. 떠 있는 창이 아니다 */
export const Maximized: MaximizedStory = {
  args: { onRestore: fn(), onClose: fn() },
  render: (args) => {
    const { onRestore: handleRestore, onClose: handleClose } = args;
    return (
      <WindowFrame
        appIcon={null}
        placement="maximized"
        onRestore={handleRestore}
        onClose={handleClose}
        className="h-size-window-height w-size-window-width"
      >
        <p>내용</p>
      </WindowFrame>
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('최대화된 창이다', async () => {
      await expect(canvas.getByText('내용').closest('[data-placement]')).toHaveAttribute(
        'data-placement',
        'maximized',
      );
    });

    await step('복원 버튼과 닫기 버튼이 핸들러를 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '이전 크기로 복원' }));
      await userEvent.click(canvas.getByRole('button', { name: '닫기' }));
      await expect(args.onRestore).toHaveBeenCalledOnce();
      await expect(args.onClose).toHaveBeenCalledOnce();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** showMaximize가 false면 창 버튼에서 최대화 버튼을 뺀다 */
export const WithoutMaximize: Story = {
  render: () => (
    <WindowFrame
      appIcon={null}
      showMaximize={false}
      className="h-size-window-height w-size-window-width"
    />
  ),
  play: async ({ canvasElement, step }) => {
    await step('최대화 버튼이 없다', async () => {
      await expect(
        within(canvasElement).queryByRole('button', { name: '최대화' }),
      ).not.toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** maximizeSlot을 기본 최대화 버튼 대신 그린다 */
export const MaximizeSlot: Story = {
  render: () => (
    <WindowFrame
      appIcon={null}
      maximizeSlot={<button type="button">스냅</button>}
      className="h-size-window-height w-size-window-width"
    />
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('슬롯의 버튼이 기본 최대화 버튼을 대신한다', async () => {
      await expect(canvas.getByRole('button', { name: '스냅' })).toBeInTheDocument();
      await expect(canvas.queryByRole('button', { name: '최대화' })).not.toBeInTheDocument();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 제목 표시줄을 두 번 누르거나 누르면 핸들러를 부른다. 창 버튼과 내용 자리는 제외한다 */
export const TitleBar: TitleBarStory = {
  args: { onTitleBarDoubleClick: fn(), onTitleBarPointerDown: fn(), onMaximize: fn() },
  render: (args) => {
    const {
      onTitleBarDoubleClick: handleTitleBarDoubleClick,
      onTitleBarPointerDown: handleTitleBarPointerDown,
      onMaximize: handleMaximize,
    } = args;
    return (
      <WindowFrame
        appIcon={null}
        title="파일 탐색기"
        onMaximize={handleMaximize}
        onTitleBarDoubleClick={handleTitleBarDoubleClick}
        onTitleBarPointerDown={handleTitleBarPointerDown}
        className="h-size-window-height w-size-window-width"
      >
        <p>내용</p>
      </WindowFrame>
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('제목 표시줄을 누르면 onTitleBarPointerDown을 부른다', async () => {
      await userEvent.pointer({ keys: '[MouseLeft]', target: canvas.getByText('파일 탐색기') });
      await expect(args.onTitleBarPointerDown).toHaveBeenCalledTimes(1);
    });

    await step('창 버튼 위에서 누른 것은 onTitleBarPointerDown을 부르지 않는다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '최소화' }));
      await expect(args.onTitleBarPointerDown).toHaveBeenCalledTimes(1);
    });

    await step('제목 표시줄을 더블클릭하면 onTitleBarDoubleClick을 부른다', async () => {
      await userEvent.dblClick(canvas.getByText('파일 탐색기'));
      await expect(args.onTitleBarDoubleClick).toHaveBeenCalledTimes(1);
    });

    await step('창 버튼 위 더블클릭은 무시한다', async () => {
      await userEvent.dblClick(canvas.getByRole('button', { name: '최대화' }));
      await expect(args.onTitleBarDoubleClick).toHaveBeenCalledTimes(1);
      await expect(args.onMaximize).toHaveBeenCalledTimes(2);
    });

    await step('내용 자리를 더블클릭해도 부르지 않는다', async () => {
      await userEvent.dblClick(canvas.getByText('내용'));
      await expect(args.onTitleBarDoubleClick).toHaveBeenCalledTimes(1);
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** custom 제목 표시줄은 titleBarContent를 그리고 창 제목을 그리지 않는다. 내용 위 더블클릭도 부른다 */
export const CustomTitleBar: CustomTitleBarStory = {
  args: { onTitleBarDoubleClick: fn() },
  render: (args) => {
    const { onTitleBarDoubleClick: handleTitleBarDoubleClick } = args;
    return (
      <WindowFrame
        titleBar="custom"
        titleBarContent={<span>탭 목록</span>}
        onTitleBarDoubleClick={handleTitleBarDoubleClick}
        className="h-size-window-height w-size-window-width"
      />
    );
  },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step('titleBarContent를 그리고 창 제목은 그리지 않는다', async () => {
      await expect(canvas.getByText('탭 목록')).toBeInTheDocument();
      await expect(canvas.queryByText('창 제목')).not.toBeInTheDocument();
    });

    await step('제목 표시줄 내용 위 더블클릭도 onTitleBarDoubleClick을 부른다', async () => {
      await userEvent.dblClick(canvas.getByText('탭 목록'));
      await expect(args.onTitleBarDoubleClick).toHaveBeenCalledOnce();
    });
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 창 버튼 자리에서 포털로 그린 팝업(스냅 레이아웃 등)에서 올라온 이벤트는 제목 표시줄 동작이 아니다 */
export const PortalPopup: TitleBarStory = {
  args: { onTitleBarDoubleClick: fn(), onTitleBarPointerDown: fn(), onMaximize: fn() },
  render: (args) => {
    const {
      onTitleBarDoubleClick: handleTitleBarDoubleClick,
      onTitleBarPointerDown: handleTitleBarPointerDown,
    } = args;
    return (
      <WindowFrame
        appIcon={null}
        onTitleBarDoubleClick={handleTitleBarDoubleClick}
        onTitleBarPointerDown={handleTitleBarPointerDown}
        maximizeSlot={createPortal(<p>스냅 레이아웃</p>, document.body)}
        className="h-size-window-height w-size-window-width"
      />
    );
  },
  play: async ({ args, step }) => {
    const popup = within(document.body).getByText('스냅 레이아웃');

    await step('팝업을 더블클릭한 것은 onTitleBarDoubleClick을 부르지 않는다', async () => {
      await userEvent.dblClick(popup);
      await expect(args.onTitleBarDoubleClick).not.toHaveBeenCalled();
    });

    await step('팝업을 누른 것은 onTitleBarPointerDown을 부르지 않는다', async () => {
      await userEvent.pointer({ keys: '[MouseLeft]', target: popup });
      await expect(args.onTitleBarPointerDown).not.toHaveBeenCalled();
    });
  },
};

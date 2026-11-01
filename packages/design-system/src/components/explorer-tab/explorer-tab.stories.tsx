import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentProps } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ExplorerTab } from './explorer-tab';

// 피그마 ExplorerTab 기본 인스턴스(폴더 아이콘)다. Vite와 Next.js가 모두 파일 주소로 바꿔 준다.
const folderIcon = new URL('../../assets/images/file-folder.webp', import.meta.url).href;

// 피그마 ExplorerTab의 변형 속성 값이다(정규화한 이름). Hover는 캡처 도구가 마우스로 재현한다.
const STATES = ['rest', 'hover', 'selected'] as const;

type FigmaArgs = {
  state: (typeof STATES)[number];
  /** 피그마 TEXT 속성 Title */
  title: string;
  /** 동작 스토리가 쓴다 */
  tabIndex?: number;
  onClick?: ComponentProps<typeof ExplorerTab>['onClick'];
  onClose?: ComponentProps<typeof ExplorerTab>['onClose'];
};

// 닫기 버튼이 tablist 안에 있어 aria-required-children에 걸린다. 구조를 바꿀지 사람이 정할 때까지 이 규칙만 끈다
// (임의 작업 문서의 "탭 닫기 버튼" 항목).
const closeButtonA11y = {
  a11y: { config: { rules: [{ id: 'aria-required-children', enabled: false }] } },
};

const meta = {
  title: 'Components/ExplorerTab',
  // 글자는 피그마 Title 속성의 기본값과 같아야 한다([[피그마 연동:스토리 규칙]]).
  args: { state: 'rest', title: '폴더 이름' },
  argTypes: {
    state: { control: 'inline-radio', options: STATES },
    title: { control: 'text' },
  },
  // 탭은 tablist 안에서만 쓴다. 감싸는 요소는 크기를 더하지 않는다.
  render: (args) => {
    const { onClick: handleClick, onClose: handleClose } = args;
    return (
      <div role="tablist" aria-label="탭">
        <ExplorerTab
          selected={args.state === 'selected'}
          title={args.title}
          tabIndex={args.tabIndex}
          icon={<img src={folderIcon} alt="" className="size-size-icon-sm object-contain" />}
          onClick={handleClick}
          onClose={handleClose}
        />
      </div>
    );
  },
} satisfies Meta<FigmaArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[피그마 연동:스토리 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
// 피그마 변형 하나를 args 하나로 고른다.
// 닫기 버튼이 tablist 안에 있어 aria-required-children에 걸린다. 구조를 바꿀지 사람이 정할 때까지 이 규칙만 끈다
// (임의 작업 문서의 "탭 닫기 버튼" 항목).
export const Figma: Story = {
  parameters: closeButtonA11y,
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
// @codocs [[디자인 시스템:아이콘 자리]]
export const Default: Story = {
  args: { title: '문서', tabIndex: 0, onClick: fn(), onClose: fn() },
  parameters: closeButtonA11y,
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);
    const tab = canvas.getByRole('tab', { name: /문서/u });
    const closeButton = canvas.getByRole('button', { name: '탭 닫기' });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('기본은 선택되지 않은 탭이고 오른쪽 구분선을 그린다', async () => {
      await expect(tab).toHaveAttribute('aria-selected', 'false');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'true');
    });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('닫기 버튼은 탭(role="tab") 안이 아니라 옆에 둔다', async () => {
      await expect(tab).not.toContainElement(closeButton);
    });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('tabIndex는 탭(role="tab")이 받는다', async () => {
      await expect(tab).toHaveAttribute('tabindex', '0');
    });

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('닫기 버튼은 onClose만 부르고 탭의 onClick은 부르지 않는다', async () => {
      await userEvent.click(closeButton);
      await expect(args.onClose).toHaveBeenCalledTimes(1);
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  },
};

// @codocs [[컴포넌트 목록:Windows 화면 요소]]
export const Selected: Story = {
  args: { state: 'selected' },
  parameters: closeButtonA11y,
  play: async ({ canvasElement, step }) => {
    const tab = within(canvasElement).getByRole('tab');

    // @codocs [[컴포넌트 목록:Windows 화면 요소]]
    await step('selected면 선택된 탭이고 오른쪽 구분선을 그리지 않는다', async () => {
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(tab.parentElement).toHaveAttribute('data-separator', 'false');
    });
  },
};
